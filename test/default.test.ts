import { Contract } from "ethers";
import { artifacts, ethers, expect } from "hardhat";
import { MAX_INT, addLiquidity, calcOutputAmount, deployExchange, deployTokens } from "./prepare";

describe("Default Swap", () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    let weth: Contract;
    // exchange
    let router: Contract;
    let factory: Contract;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;

        const exchange = await deployExchange(ecp); // erin is receive fee account
        router = exchange.router;
        factory = exchange.factory;
        weth = exchange.weth;

        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // add liquidity 30 btc = 749,270.4 usdt (1 btc = 24,975.68 usdt)
        const amountBTC = ethers.utils.parseEther("30");
        const amountUSDT = ethers.utils.parseEther("749270.4");

        await addLiquidity(sender, router, btc, usdt, amountBTC, amountUSDT);
    });

    it("swap by router (fee transfer to receiveFeeAddress 0.3%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // swap btc -> usdt
        const amountIn = ethers.utils.parseEther("1");
        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        const exactAmountOut = await calcOutputAmount(pair, btc, amountIn)

        await usdt.connect(sender).approve(router.address, MAX_INT);
        await btc.connect(sender).approve(router.address, MAX_INT);

        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60; // 1 hour

        const balanceUsdtBefore = await usdt.balanceOf(sender.address);
        const balanceBtcBefore = await btc.balanceOf(sender.address);

        await router.connect(sender).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [btc.address, usdt.address],
            sender.address,
            deadline
        )

        // check balances
        const usdtBalance = await usdt.balanceOf(sender.address);
        const btcBalance = await btc.balanceOf(sender.address);
        const amountUsdtFee = exactAmountOut.mul(3).div(1000);
        const receiveFeeAddress = accounts[5];
        const balanceUsdtReceiveFeeAddress = await usdt.balanceOf(receiveFeeAddress.address);

        expect(btcBalance.toString()).to.equal(balanceBtcBefore.sub(amountIn).toString());
        expect(usdtBalance.toString()).to.equal(balanceUsdtBefore.add(exactAmountOut).sub(amountUsdtFee).toString());
        expect(balanceUsdtReceiveFeeAddress.toString()).to.equal(amountUsdtFee.toString());
    });

    it("swap by pair (fee transfer to receiveFeeAddress 0.3%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // swap btc -> usdt
        const amountIn = ethers.utils.parseEther("1");
        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairArtifact = await artifacts.readArtifact("EchodexPair");
        const pair = new ethers.Contract(pairAddress, pairArtifact.abi, sender);
        const exactAmountOut = await calcOutputAmount(pair, btc, amountIn)
        const token0 = await pair.token0();
        const amountToken0Out = token0 === btc.address ? "0" : exactAmountOut;
        const amountToken1Out = token0 === btc.address ? exactAmountOut : "0";

        // ****** CASE 1 ********
        // ERROR: transfer 0.9 BTC and get amountOut of 1 BTC -> error: Echodex: K
        // ****** CASE 1 ********
        await btc.connect(sender).transfer(pairAddress, ethers.utils.parseEther("0.9"));
        // call swap function in pair contract
        let tx;
        try {
            tx = await pair.connect(sender).swap(
                amountToken0Out,
                amountToken1Out,
                sender.address,
                "0x"
            );
        } catch (error: any) {
            expect(error.error.message).to.include("Echodex: K");
        }

        // ****** CASE 2 ********
        // (SUCCESS): transfer more 0.1 BTC and get success
        // ****** CASE 2 ********
        await btc.connect(sender).transfer(pairAddress, ethers.utils.parseEther("0.1"));
        tx = await pair.connect(sender).swap(
            amountToken0Out,
            amountToken1Out,
            sender.address,
            "0x"
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
    });
});