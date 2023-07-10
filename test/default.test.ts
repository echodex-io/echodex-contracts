import { Contract } from "ethers";
import { artifacts, ethers, expect } from "hardhat";
import { MAX_INT, addLiquidity, calcAmountFee, calcInputAmount, calcOutputAmount, deployExchange, deployTokens } from "./prepare";
import { BigNumber } from "@ethersproject/bignumber";

describe("Default Swap", () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    let xecp: Contract;
    let weth: Contract;
    // exchange
    let router: Contract;
    let factory: Contract;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;
        xecp = tokens.xecp;

        const exchange = await deployExchange(ecp, xecp); // erin is receive fee account
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

    it("swap by router and get reward", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];
        const amountIn = ethers.utils.parseEther("1");
        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        const exactAmountOut = await calcOutputAmount(pair, btc, amountIn)
        const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60; // 1 hour
        // transfer 1 btc from sender to sender1 + approve
        await btc.connect(sender).transfer(sender1.address, amountIn);
        await btc.connect(sender1).approve(router.address, MAX_INT);
        // set fee path usdt -> ecp
        await factory.connect(sender).setFeePath(usdt.address, [usdt.address, ecp.address]);
        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await addLiquidity(sender, router, ecp, usdt, ethers.utils.parseEther("100"), ethers.utils.parseEther("12234.5123"));

        // set reward percent = 0.05%
        await factory.connect(sender).setRewardPercent(pairAddress, 5);

        // ****** CASE 1 ********
        // ERROR: don't have enough xECP in pair to transfer reward
        // ****** CASE 1 ********
        // try {
        //     await router.connect(sender1).swapExactTokensForTokens(
        //         amountIn,
        //         exactAmountOut,
        //         [btc.address, usdt.address],
        //         sender.address,
        //         deadline
        //     )
        // } catch (error: any) {
        //     expect(error.message).to.include("Echodex: INSUFFICIENT_TOKEN_REWARD");
        // }

        // ****** CASE 2 ********
        // SUCCESS: transfer reward to sender
        // ****** CASE 2 ********
        const amountReward = await calcAmountFee(factory, usdt, exactAmountOut, BigNumber.from(5)); // 0.05%

        // transfer amountReward into pair
        // await xecp.connect(sender).transfer(pairAddress, amountReward);

        await router.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [btc.address, usdt.address],
            sender1.address,
            deadline
        )

        // check balance xecp of sender1 = amountReward
        const balanceXecp = await xecp.balanceOf(sender1.address);
        expect(balanceXecp.toString()).to.equal(amountReward.toString());
        // check balance xecp of pair = 0
        const balanceXecpPair = await xecp.balanceOf(pairAddress);
        expect(balanceXecpPair.toString()).to.equal("0");
    })

    it("swap by pair (fee pay by pool 100%), addFee -> swap", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await addLiquidity(sender, router, ecp, usdt, ethers.utils.parseEther("100"), ethers.utils.parseEther("12234.5123"));

        var pairAddress = await factory.getPair(usdt.address, ecp.address);
        var pairABI = (await artifacts.require("EchodexPair")).abi;
        var pairUsdtECP = new ethers.Contract(pairAddress, pairABI, sender);
        var amountIn = ethers.utils.parseEther("1");
        var exactAmountOut = await calcOutputAmount(pairUsdtECP, ecp, amountIn);

        // approve
        await ecp.connect(sender).approve(pairUsdtECP.address, MAX_INT);
        // await usdt.connect(sender1).approve(routerFee.address, MAX_INT);

        // add amountFee ecp to pool
        await pairUsdtECP.connect(sender).addFee(amountIn.toString());

        // pre-swap
        const token0 = await pairUsdtECP.token0();
        const amountToken0Out = token0 === ecp.address ? "0" : exactAmountOut;
        const amountToken1Out = token0 === ecp.address ? exactAmountOut : "0";

        // swap
        try {
            await pairUsdtECP.connect(sender).swap(
                amountToken0Out,
                amountToken1Out,
                sender.address,
                "0x"
            )
        } catch (error: any) {
            expect(error.message).to.include("Echodex: INSUFFICIENT_INPUT_AMOUNT");
        }

    });

    it("swap tokens for ETH", async () => {
        const reverseETH = "228368726095846032624"
        const reverseECP = "1554230274242686605332"
        const amountAddFee = "1234924634903813015670"

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve ecp
        await ecp.connect(sender).approve(router.address, MAX_INT);

        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await router.addLiquidityETH(
            ecp.address,
            reverseECP,
            reverseECP,
            reverseETH,
            sender.address,
            (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60 // deadline
        , {value: reverseETH});

        // addFee
        const pairAddress = await factory.getPair(ecp.address, weth.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        await ecp.connect(sender).approve(pairAddress, MAX_INT);
        await pair.connect(sender).addFee(amountAddFee);

        // swapTokensForExactETH (need to get 0.1  ETH)
        const amountOut = ethers.utils.parseEther("0.1");
        const amountInMax = await calcInputAmount(pair, weth, amountOut);

        await ecp.connect(sender).approve(router.address, MAX_INT);

        await router.connect(sender).swapTokensForExactETH(
            amountOut,
            amountInMax,
            [ecp.address, weth.address],
            sender.address,
            (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60 // deadline
        );
    });
});