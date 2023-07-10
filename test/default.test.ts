import { Contract } from "ethers";
import { artifacts, ethers } from "hardhat";
import { MAX_INT, addLiquidity, calcAmountFee, calcInputAmount, calcOutputAmount, deployExchange, deployTokens } from "./prepare";
import { BigNumber } from "@ethersproject/bignumber";
import { ERC20, EchodexFactory, EchodexRouter, MockERC20, WETH } from "../typechain-types";
import { expect } from "chai";

describe("Default Swap", () => {
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

        const exchange = await deployExchange((await ecp.getAddress()), (await xecp.getAddress())); // erin is receive fee account
        router = exchange.router;
        factory = exchange.factory;
        weth = exchange.weth;
        wethAddress = await weth.getAddress()

        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // add liquidity 30 btc = 749,270.4 usdt (1 btc = 24,975.68 usdt)
        const amountBTC = ethers.parseEther("30");
        const amountUSDT = ethers.parseEther("749270.4");

        await addLiquidity(router, btc, usdt, amountBTC, amountUSDT);
    });

    it("swap by router (fee transfer to receiveFeeAddress 0.3%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // swap btc -> usdt
        const amountIn = ethers.parseEther("1");
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        const exactAmountOut = await calcOutputAmount(pair, (await btc.getAddress()), amountIn)

        await usdt.connect(sender).approve((await router.getAddress()), MAX_INT);
        await btc.connect(sender).approve((await router.getAddress()), MAX_INT);

        const lastBlock = await ethers.provider.getBlock("latest")
        const deadline = BigInt(lastBlock ? lastBlock.timestamp + 1 * 60 * 60 : 0)

        const balanceUsdtBefore = await usdt.balanceOf(sender.address);
        const balanceBtcBefore = await btc.balanceOf(sender.address);

        await router.connect(sender).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [(await btc.getAddress()), (await usdt.getAddress())],
            sender.address,
            deadline
        )

        // check balances
        const usdtBalance = await usdt.balanceOf(sender.address);
        const btcBalance = await btc.balanceOf(sender.address);
        const amountUsdtFee = exactAmountOut * 3n / 1000n
        const receiveFeeAddress = accounts[5];
        const balanceUsdtReceiveFeeAddress = await usdt.balanceOf(receiveFeeAddress.address);

        expect(btcBalance).to.equal(balanceBtcBefore - amountIn);
        expect(usdtBalance).to.equal(balanceUsdtBefore + (exactAmountOut) - (amountUsdtFee));
        expect(balanceUsdtReceiveFeeAddress.toString()).to.equal(amountUsdtFee.toString());
    });

    it("swap by pair (fee transfer to receiveFeeAddress 0.3%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // swap btc -> usdt
        const amountIn = ethers.parseEther("1");
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pair = await ethers.getContractFactory("EchodexPair")
        const exactAmountOut = await calcOutputAmount(pair, (await btc.getAddress()), amountIn)
        const token0 = await pair.token0();
        const amountToken0Out = token0 === (await btc.getAddress()) ? "0" : exactAmountOut;
        const amountToken1Out = token0 === (await btc.getAddress()) ? exactAmountOut : "0";

        // ****** CASE 1 ********
        // ERROR: transfer 0.9 BTC and get amountOut of 1 BTC -> error: Echodex: K
        // ****** CASE 1 ********
        await btc.connect(sender).transfer(pairAddress, ethers.parseEther("0.9"));
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
        await btc.connect(sender).transfer(pairAddress, ethers.parseEther("0.1"));
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
        const amountIn = ethers.parseEther("1");
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        const exactAmountOut = await calcOutputAmount(pair, btcAddress, amountIn)
        const lastBlock = await ethers.provider.getBlock("latest")
        const deadline = BigInt(lastBlock ? lastBlock.timestamp + 1 * 60 * 60 : 0)
        // transfer 1 btc from sender to sender1 + approve
        await btc.connect(sender).transfer(sender1.address, amountIn);
        await btc.connect(sender1).approve((await router.getAddress()), MAX_INT);
        // set fee path usdt -> ecp
        await factory.connect(sender).setFeePath((await usdt.getAddress()), [(await usdt.getAddress()), ecpAddress]);
        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await addLiquidity(router, ecp, usdt, ethers.parseEther("100"), ethers.parseEther("12234.5123"));

        // set reward percent = 0.05%
        await factory.connect(sender).setRewardPercent(pairAddress, 5);

        // ****** CASE 1 ********
        // ERROR: don't have enough xECP in pair to transfer reward
        // ****** CASE 1 ********
        // try {
        //     await router.connect(sender1).swapExactTokensForTokens(
        //         amountIn,
        //         exactAmountOut,
        //         [(await btc.getAddress()), (await usdt.getAddress())],
        //         sender.address,
        //         deadline
        //     )
        // } catch (error: any) {
        //     expect(error.message).to.include("Echodex: INSUFFICIENT_TOKEN_REWARD");
        // }

        // ****** CASE 2 ********
        // SUCCESS: transfer reward to sender
        // ****** CASE 2 ********
        const amountReward = await calcAmountFee(factory, usdtAddress, exactAmountOut, 5n); // 0.05%

        // transfer amountReward into pair
        // await xecp.connect(sender).transfer(pairAddress, amountReward);

        await router.connect(sender1).swapExactTokensForTokens(
            amountIn,
            exactAmountOut,
            [(await btc.getAddress()), (await usdt.getAddress())],
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
        await addLiquidity(router, ecp, usdt, ethers.parseEther("100"), ethers.parseEther("12234.5123"));

        var pairAddress = await factory.getPair((await usdt.getAddress()), ecpAddress);
        var pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        var pairUsdtECP = new ethers.Contract(pairAddress, pairABI, sender);
        var amountIn = ethers.parseEther("1");
        var exactAmountOut = await calcOutputAmount(pairUsdtECP, ecpAddress, amountIn);

        // approve
        await ecp.connect(sender).approve(pairUsdtECP.address, MAX_INT);
        // await usdt.connect(sender1).approve(routerFee.address, MAX_INT);

        // add amountFee ecp to pool
        await pairUsdtECP.connect(sender).addFee(amountIn.toString());

        // pre-swap
        const token0 = await pairUsdtECP.token0();
        const amountToken0Out = token0 === ecpAddress ? "0" : exactAmountOut;
        const amountToken1Out = token0 === ecpAddress ? exactAmountOut : "0";

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
        await ecp.connect(sender).approve((await router.getAddress()), MAX_INT);

        const deadline = BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60)

        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await router.addLiquidityETH(
            ecpAddress,
            reverseECP,
            reverseECP,
            reverseETH,
            sender.address,
            deadline // deadline
            , { value: reverseETH });

        // addFee
        const pairAddress = await factory.getPair(ecpAddress, wethAddress);
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        await ecp.connect(sender).approve(pairAddress, MAX_INT);
        await pair.connect(sender).addFee(amountAddFee);

        // swapTokensForExactETH (need to get 0.1  ETH)
        const amountOut = ethers.parseEther("0.1");
        const amountInMax = await calcInputAmount(pair, wethAddress, amountOut);

        await ecp.connect(sender).approve((await router.getAddress()), MAX_INT);

        await router.connect(sender).swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountInMax,
            amountOut,
            [ecpAddress, wethAddress],
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
        );
    });

    it("swap eusdt for ETH", async () => {
        const reverseETH = "2849230152618297216904"
        const reverseUSDT = "1554230274242686605332"
        const amountAddFee = "3159565255111224308"

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve ecp
        await usdt.connect(sender).approve((await router.getAddress()), MAX_INT);

        // add liquidity ecp with usdt to get price ecp 100 ecp = 12234.5123 usdt
        await router.addLiquidityETH(
            (await usdt.getAddress()),
            reverseUSDT,
            reverseUSDT,
            reverseETH,
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
            , { value: reverseETH });

        // addFee
        const pairAddress = await factory.getPair((await usdt.getAddress()), wethAddress);
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        const pair = new ethers.Contract(pairAddress, pairABI, sender);
        await ecp.connect(sender).approve(pairAddress, MAX_INT);
        await pair.connect(sender).addFee(amountAddFee);

        // swapTokensForExactETH (need to get 0.1  ETH)
        const amountIn = ethers.parseEther("0.1");
        const amountOutMin = await calcOutputAmount(pair, usdtAddress, amountIn)

        await usdt.connect(sender).approve((await router.getAddress()), MAX_INT);

        // set reward
        await factory.setRewardPercent(pairAddress, "5");

        await router.connect(sender).swapExactTokensForETH(
            "100000000000000000",//"0x16345785d8a0000",
            "3227318491989957",//"0xb773aa44ac7c5",
            [(await usdt.getAddress()), wethAddress], // ['0x4CCb503a5d792eabEFF688010e609d40f9a54148', '0x2C1b868d6596a18e32E61B901E4060C872647b6C'],
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
        );
    });
});