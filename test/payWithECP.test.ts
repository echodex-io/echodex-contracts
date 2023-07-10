import { Contract } from "ethers";
import { artifacts, ethers } from "hardhat";
import { MAX_INT, addLiquidity, calcAmountFee, calcOutputAmount, deployExchange, deployTokens } from "./prepare";
import { BigNumber } from "@ethersproject/bignumber";
import { EchodexFactory, EchodexPair, EchodexRouter, EchodexRouterFee, MockERC20, WETH } from "../typechain-types";
import { expect } from "chai";

describe("Swap Pay With ECP", () => {
    // tokens
    let usdt: MockERC20;
    let usdtAddress: string;
    let btc: MockERC20;
    let btcAddress: string;
    let ecp: MockERC20;
    let ecpAddress: string;
    let xecp: MockERC20;
    let xecpAddress: string
    let weth: WETH;
    let wethAddress: string
    // exchange
    let router: EchodexRouter;
    let factory: EchodexFactory;
    let routerFee: EchodexRouterFee;


    // global variable
    let sender: any;
    let sender1: any;
    let feeReceiver: any;
    let amountIn: bigint;
    let exactAmountOut: bigint;
    let amountFee: bigint;
    let deadline: bigint;
    let pairBtcUsdt: EchodexPair;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        usdtAddress = await usdt.getAddress()
        btc = tokens.btc;
        btcAddress = await btc.getAddress()
        ecp = tokens.ecp;
        ecpAddress = await ecp.getAddress()
        xecp = tokens.xecp;
        xecpAddress = await xecp.getAddress()

        const exchange = await deployExchange(ecpAddress, xecpAddress); // erin is receive fee account
        router = exchange.router;
        routerFee = exchange.routerFee;
        factory = exchange.factory;
        weth = exchange.weth;
        wethAddress = await weth.getAddress()

        const accounts = await ethers.getSigners();
        sender = accounts[0];
        sender1 = accounts[1];
        feeReceiver = accounts[5];
        // add liquidity 30 btc = 749,270.4 usdt
        await addLiquidity(routerFee, btc, usdt, ethers.parseEther("30"), ethers.parseEther("749270.4"));

        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await addLiquidity(routerFee, ecp, usdt, ethers.parseEther("100"), ethers.parseEther("12234.5123"));

        // set fee path usdt -> ecp
        await factory.connect(sender).setFeePath((await usdt.getAddress()), [(await usdt.getAddress()), ecpAddress]);

        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        pairBtcUsdt = await ethers.getContractAt("EchodexPair", pairAddress);
        amountIn = ethers.parseEther("1");
        exactAmountOut = await calcOutputAmount(pairBtcUsdt, btcAddress, amountIn);
        amountFee = await calcAmountFee(factory, usdtAddress, exactAmountOut)
        deadline = BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // 1 hour
    });

    it("swap by router fee (fee pay by pool 100%)", async () => {
        // transfer 1 btc from sender to sender1
        await btc.connect(sender).transfer(sender1.address, amountIn);
        // transfer amountFee ecp from sender to sender1
        await ecp.connect(sender).transfer(sender1.address, amountFee);

        // approve
        await ecp.connect(sender1).approve((await pairBtcUsdt.getAddress()), MAX_INT);
        await btc.connect(sender1).approve((await routerFee.getAddress()), MAX_INT);

        // ******** CASE 1 ********
        // ERROR: pool not enough fee
        // ******** CASE 1 ********

        // add amountFee - 1 ecp to pool (it not enough ecp to pay fee)
        await pairBtcUsdt.connect(sender1).addFee(amountFee - 1n);
        const afterBalanceEcp = await ecp.balanceOf(sender1.address);
        expect(afterBalanceEcp.toString()).to.equal("1");

        // swap
        let tx;
        try {
            tx = await routerFee.connect(sender1).swapExactTokensForTokens(
                amountIn,
                exactAmountOut,
                [(await btc.getAddress()), (await usdt.getAddress())],
                sender1.address,
                deadline,
                [0]
            )
        } catch (error: any) {
            expect(error.message).to.include("INSUFFICIENT_FEE_TOKEN")
        }

        // ******** CASE 2 ********
        // SUCCESS: add enough ecp to pay fee
        // ******** CASE 2 ********

        // add amountFee ecp to pool
        await pairBtcUsdt.connect(sender1).addFee("1");
        // check balance ecp of sender 1 = 0
        const afterBalanceEcp1 = await ecp.balanceOf(sender1.address);
        expect(afterBalanceEcp1.toString()).to.equal("0");

        // swap
        await routerFee.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [(await btc.getAddress()), (await usdt.getAddress())],
            sender1.address,
            deadline,
            [0]
        )

        // check balance usdt of sender1 = exactAmountOut
        expect((await usdt.balanceOf(sender1.address)).toString()).to.equal(exactAmountOut.toString());
        // check balance ecp of pair = 0
        expect((await ecp.balanceOf((await pairBtcUsdt.getAddress()))).toString()).to.equal("0");
        // check balance ecp of receiverAddressFee = amountFee
        expect((await ecp.balanceOf(feeReceiver.address)).toString()).to.equal(amountFee.toString());
    });

    it("swap by router fee (fee pay by user 100%)", async () => {
        // transfer 1 BTC from sender to sender1
        await btc.connect(sender).transfer(sender1.address, amountIn);

        // transfer ecp from sender to sender1 not enough fee
        await ecp.connect(sender).transfer(sender1.address, amountFee - 1n);

        // approve
        await btc.connect(sender1).approve((await routerFee.getAddress()), MAX_INT);
        await ecp.connect(sender1).approve((await routerFee.getAddress()), MAX_INT);

        // ******** CASE 1 ********
        // ERROR: pool not enough balance and user enough balance
        // ******** CASE 1 ********

        // swap
        let tx;
        try {
            tx = await routerFee.connect(sender1).swapExactTokensForTokens(
                amountIn,
                exactAmountOut,
                [(await btc.getAddress()), (await usdt.getAddress())],
                sender1.address,
                deadline,
                [amountFee]
            )
        } catch (error: any) {
            expect(error.message).to.include("SafeMath: subtraction overflow")
        }

        // ******** CASE 2 ********
        // SUCCESS: user has enough ecp to pay fee
        // ******** CASE 2 ********

        // transfer more ecp to sender1
        await ecp.connect(sender).transfer(sender1.address, "1");
        tx = await routerFee.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [(await btc.getAddress()), (await usdt.getAddress())],
            sender1.address,
            deadline,
            [amountFee]
        )

        // check balance ecp of sender1 = 0
        expect((await ecp.balanceOf(sender1.address)).toString()).to.equal("0");
        // check balance btc of sender1 = 0
        expect((await btc.balanceOf(sender1.address)).toString()).to.equal("0");
        // check balance usdt = exactAmountOut
        expect((await usdt.balanceOf(sender1.address)).toString()).to.equal(exactAmountOut.toString());
    });

    it("swap by router fee (fee pay by pool 50% + user 50%)", async () => {
        // transfer 1 BTC from sender to sender1
        await btc.connect(sender).transfer(sender1.address, amountIn);

        // transfer 50% amount fee ecp from sender to sender1
        const halfAmountFee = amountFee / 2n;
        await ecp.connect(sender).transfer(sender1.address, halfAmountFee);

        // approve + add 50% amount fee to pool
        await ecp.connect(sender).approve(await pairBtcUsdt.getAddress(), MAX_INT);
        await pairBtcUsdt.connect(sender).addFee(amountFee - halfAmountFee);

        // approve
        await btc.connect(sender1).approve((await routerFee.getAddress()), MAX_INT);
        await ecp.connect(sender1).approve((await routerFee.getAddress()), MAX_INT);

        // swap
        await routerFee.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [(await btc.getAddress()), (await usdt.getAddress())],
            sender1.address,
            deadline,
            [halfAmountFee]
        )

        // check balance btc of sender1 = 0
        expect((await btc.balanceOf(sender1.address)).toString()).to.equal("0");
        // check balance usdt of sender1 = exactAmountOut
        expect((await usdt.balanceOf(sender1.address)).toString()).to.equal(exactAmountOut.toString());
        // check balance ecp of pair = 0
        expect((await ecp.balanceOf((await pairBtcUsdt.getAddress()))).toString()).to.equal("0");
        // check balance ecp of sender1 = 0
        expect((await ecp.balanceOf(sender1.address)).toString()).to.equal("0");
        // check balance ecp of receiverAddressFee = amountFee
        expect((await ecp.balanceOf(feeReceiver.address)).toString()).to.equal(amountFee.toString());
    });

    it("swap by pair (fee pay by pool 100%)", async () => {
        // transfer 1 BTC from sender to pair address
        await btc.connect(sender).transfer(await pairBtcUsdt.getAddress(), amountIn);

        // approve + add fee to pool
        await ecp.connect(sender).approve(await pairBtcUsdt.getAddress(), MAX_INT);
        await pairBtcUsdt.connect(sender).addFee(amountFee);

        // pre-swap
        const token0 = await pairBtcUsdt.token0();
        const amountToken0Out = token0 === (await btc.getAddress()) ? "0" : exactAmountOut;
        const amountToken1Out = token0 === (await btc.getAddress()) ? exactAmountOut : "0";
        const balanceUsdtBefore = await usdt.balanceOf(sender.address);

        // call swapFee function in pair
        await pairBtcUsdt.connect(sender).swapPayWithTokenFee(
            amountToken0Out,
            amountToken1Out,
            sender.address,
            "0x"
        )

        // check balance usdt after swap = balance usdt before + exactAmountOut
        expect((await usdt.balanceOf(sender.address)).toString()).to.equal(balanceUsdtBefore + exactAmountOut);
        // check balance ecp of pair = 0
        expect((await ecp.balanceOf((await pairBtcUsdt.getAddress()))).toString()).to.equal("0");
        // check balance ecp of feeReceiver = amountFee
        expect((await ecp.balanceOf(feeReceiver.address)).toString()).to.equal(amountFee.toString());
    });

    it("swap by router fee (fee pay by pool 100%), token out is token fee", async () => {
        // set fee path ecp -> usdt -> ecp
        await factory.connect(sender).setFeePath(ecpAddress, [ecpAddress, (await usdt.getAddress()), ecpAddress]);

        // transfer 1 usdt from sender to sender1
        await usdt.connect(sender).transfer(sender1.address, amountIn);

        const pairAddress = await factory.getPair((await usdt.getAddress()), ecpAddress);
        const pairUsdtECP = await ethers.getContractAt("EchodexPair", pairAddress);

        amountIn = ethers.parseEther("1");
        exactAmountOut = await calcOutputAmount(pairUsdtECP, usdtAddress, amountIn);
        amountFee = await calcAmountFee(factory, ecpAddress, exactAmountOut);

        // transfer amountFee ecp from sender to sender1
        await ecp.connect(sender).transfer(sender1.address, amountFee);

        // approve
        await ecp.connect(sender1).approve((await pairUsdtECP.getAddress()), MAX_INT);
        await usdt.connect(sender1).approve((await routerFee.getAddress()), MAX_INT);

        // add amountFee ecp to pool (it not enough ecp to pay fee)
        await pairUsdtECP.connect(sender1).addFee(amountFee.toString());

        // swap
        const balanceECPBefore = await ecp.balanceOf(sender1.address)
        await routerFee.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [(await usdt.getAddress()), ecpAddress],
            sender1.address,
            deadline,
            [0]
        )
        const balanceECPAfter = await ecp.balanceOf(sender1.address)
    });
});