import { Contract } from "ethers";
import { artifacts, ethers, expect } from "hardhat";
import { MAX_INT, addLiquidity, calcAmountFee, calcOutputAmount, deployExchange, deployTokens } from "./prepare";

describe("Swap Pay With ECP", () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    let weth: Contract;
    // exchange
    let router: Contract;
    let routerFee: Contract;
    let factory: Contract;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;

        const exchange = await deployExchange(ecp); // erin is receive fee account
        router = exchange.routerFee;
        routerFee = exchange.routerFee;
        factory = exchange.factory;
        weth = exchange.weth;

        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // add liquidity 30 btc = 749,270.4 usdt
        await addLiquidity(sender, routerFee, btc, usdt, ethers.utils.parseEther("30"), ethers.utils.parseEther("749270.4"));

        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await addLiquidity(sender, routerFee, ecp, usdt, ethers.utils.parseEther("100"), ethers.utils.parseEther("12234.5123"));

        // set fee path usdt -> ecp
        await factory.connect(sender).setFeePath(usdt.address, [usdt.address, ecp.address]);
    });

    it("swap by router fee (fee pay by pool 100%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);

        const amountIn = ethers.utils.parseEther("1");
        const exactAmountOut = await calcOutputAmount(pair, btc, amountIn);

        // calc amount fee
        const amountFee = await calcAmountFee(factory, usdt, exactAmountOut)
        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60; // 1 hour

        // transfer 1 btc from sender to sender1
        await btc.connect(sender).transfer(sender1.address, amountIn);
        // transfer amountFee ecp from sender to sender1
        await ecp.connect(sender).transfer(sender1.address, amountFee);

        // approve
        await ecp.connect(sender1).approve(pairAddress, MAX_INT);
        await btc.connect(sender1).approve(routerFee.address, MAX_INT);

        // ******** CASE 1 ********
        // ERROR: pool not enough fee
        // ******** CASE 1 ********

        // add amountFee - 1 ecp to pool (it not enough ecp to pay fee)
        await pair.connect(sender1).addFee(amountFee.sub(1).toString());
        const afterBalanceEcp = await ecp.balanceOf(sender1.address);
        expect(afterBalanceEcp.toString()).to.equal("1");

        // swap
        let tx;
        try {
            tx = await routerFee.connect(sender1).swapExactTokensForTokens(
                amountIn,
                exactAmountOut,
                [btc.address, usdt.address],
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
        await pair.connect(sender1).addFee("1");
        // check balance ecp of sender 1 = 0
        const afterBalanceEcp1 = await ecp.balanceOf(sender1.address);
        expect(afterBalanceEcp1.toString()).to.equal("0");

        // swap
        await routerFee.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [btc.address, usdt.address],
            sender1.address,
            deadline,
            [0]
        )

        // check balance usdt of sender1 = exactAmountOut
        expect((await usdt.balanceOf(sender1.address)).toString()).to.equal(exactAmountOut.toString());
        // check balance ecp of pair = 0
        expect((await ecp.balanceOf(pairAddress)).toString()).to.equal("0");
        // check balance ecp of receiverAddressFee = amountFee
        expect((await ecp.balanceOf(accounts[5].address)).toString()).to.equal(amountFee.toString());
    });

    it("swap by router fee (fee pay by user 100%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);

        const amountIn = ethers.utils.parseEther("1");
        const exactAmountOut = await calcOutputAmount(pair, btc, amountIn);

        // calc amount fee
        const amountFee = await calcAmountFee(factory, usdt, exactAmountOut)
        const sender1 = accounts[1];
        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60; // 1 hour

        // transfer 1 BTC from sender to sender1
        await btc.connect(sender).transfer(sender1.address, amountIn);

        // transfer ecp from sender to sender1 not enough fee
        await ecp.connect(sender).transfer(sender1.address, amountFee.sub(1));

        // approve
        await btc.connect(sender1).approve(routerFee.address, MAX_INT);
        await ecp.connect(sender1).approve(routerFee.address, MAX_INT);

        // ******** CASE 1 ********
        // ERROR: pool not enough balance and user enough balance
        // ******** CASE 1 ********

        // swap
        let tx;
        try {
            tx = await routerFee.connect(sender1).swapExactTokensForTokens(
                amountIn,
                exactAmountOut,
                [btc.address, usdt.address],
                sender1.address,
                deadline,
                [amountFee]
            )
        } catch (error: any) {
            expect(error.message).to.include("ds-math-sub-underflow")
        }

        // ******** CASE 2 ********
        // SUCCESS: user has enough ecp to pay fee
        // ******** CASE 2 ********

        // transfer more ecp to sender1
        await ecp.connect(sender).transfer(sender1.address, "1");
        tx = await routerFee.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [btc.address, usdt.address],
            sender1.address,
            deadline,
            [amountFee]
        )

        // check balance ecp of sender1 = 0
        // check balance btc of sender1 = 0
        // check balance usdt = exactAmountOut
        expect((await ecp.balanceOf(sender1.address)).toString()).to.equal("0");
        expect((await btc.balanceOf(sender1.address)).toString()).to.equal("0");
        expect((await usdt.balanceOf(sender1.address)).toString()).to.equal(exactAmountOut.toString());
    });

    it("swap by router fee (fee pay by pool 50% + user 50%)", async () => {
    });

    it("swap by pair (fee pay by pool 100%)", async () => {
    });
});