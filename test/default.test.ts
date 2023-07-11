import { Contract } from "ethers";
import { artifacts, ethers } from "hardhat";
import { MAX_INT, addLiquidity, calcAmountFee, calcInputAmount, calcOutputAmount, calcOutputAmountRouterFee, deployExchange, deployTokens } from "./prepare";
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
        // add liquidity 30 btc = 749,270.4 usdt
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
        const pair = await ethers.getContractAt("EchodexPair", pairAddress);
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
        const amountUsdtFee = exactAmountOut * 3n / 997n
        const receiveFeeAddress = accounts[5];
        const balanceUsdtReceiveFeeAddress = await usdt.balanceOf(receiveFeeAddress.address);

        expect(btcBalance).to.equal(balanceBtcBefore - amountIn);
        expect(usdtBalance).to.equal(balanceUsdtBefore + (exactAmountOut));
        expect(balanceUsdtReceiveFeeAddress.toString()).to.equal(amountUsdtFee.toString());
    });

    it("swap by pair (fee transfer to receiveFeeAddress 0.3%)", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        // swap btc -> usdt
        const amountIn = ethers.parseEther("1");
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pair = await ethers.getContractAt("EchodexPair", pairAddress);
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
            expect(error.message).to.include("Echodex: K");
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
        expect(receipt?.status).to.equal(1);
    });

    it("swap by router and get reward", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];
        const amountIn = ethers.parseEther("1");
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pair = await ethers.getContractAt("EchodexPair", pairAddress);
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

        const pairAddress = await factory.getPair((await usdt.getAddress()), ecpAddress);
        const pairUsdtECP = await ethers.getContractAt("EchodexPair", pairAddress);
        var amountIn = ethers.parseEther("1");
        var exactAmountOut = await calcOutputAmount(pairUsdtECP, ecpAddress, amountIn);

        // approve
        await ecp.connect(sender).approve((await pairUsdtECP.getAddress()), MAX_INT);
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

    it("swapExactTokensForETHSupportingFeeOnTransferTokens", async () => {
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
        const pair = await ethers.getContractAt("EchodexPair", pairAddress);
        await ecp.connect(sender).approve(pairAddress, MAX_INT);
        await pair.connect(sender).addFee(amountAddFee);

        // swapTokensForExactETH (need to get 0.1  ETH)
        // const amountOut = ethers.parseEther("0.1");
        // const amountInMax = await calcInputAmount(pair, wethAddress, amountOut);

        const amountIn = ethers.parseEther("0.1")
        const amountOutMint = await calcOutputAmount(pair, ecpAddress, amountIn)

        await ecp.connect(sender).approve((await router.getAddress()), MAX_INT);

        await router.connect(sender).swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountIn,
            amountOutMint,
            [ecpAddress, wethAddress],
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
        );
    });

    it("swapExactTokensForETH", async () => {
        const reverseETH = "284923015261829721690"
        const amountAddFee = "3159565255111224308"

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve ecp
        await ecp.connect(sender).approve((await router.getAddress()), MAX_INT);
        await usdt.connect(sender).approve((await router.getAddress()), MAX_INT);

        // add liquidity ecp - eth
        await router.addLiquidityETH(
            ecpAddress,
            ethers.parseEther("1000"),
            ethers.parseEther("1000"),
            reverseETH,
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
            , { value: reverseETH });

        // add pool weth - usdt
        await router.addLiquidityETH(
            (await usdt.getAddress()),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            reverseETH,
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
            , { value: reverseETH });

        // addFee
        const pairAddress = await factory.getPair((await usdt.getAddress()), wethAddress);
        const pair = await ethers.getContractAt("EchodexPair", pairAddress);
        await ecp.connect(sender).approve(pairAddress, MAX_INT);
        await pair.connect(sender).addFee(amountAddFee);

        // swapTokensForExactETH (need to get 0.1  ETH)
        const amountIn = ethers.parseEther("10");
        const amountOutMin = await calcOutputAmount(pair, usdtAddress, amountIn)

        await usdt.connect(sender).approve((await router.getAddress()), MAX_INT);

        // set reward
        await factory.setRewardPercent(pairAddress, "5");

        // set path
        await factory.setFeePath(wethAddress, [wethAddress, ecpAddress]);

        const balanceReward = await xecp.balanceOf(sender.address);

        await router.connect(sender).swapExactTokensForETH(
            amountIn,
            amountOutMin,
            [(await usdt.getAddress()), wethAddress],
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
        );

        const balanceRewardAfter = await xecp.balanceOf(sender.address);

        expect(balanceRewardAfter - balanceReward).to.greaterThan(ethers.parseEther("0.2"));
        expect(balanceRewardAfter - balanceReward).to.lessThan(ethers.parseEther("0.3"));
    });

    it("swapExactTokensForTokens test reward", async () => {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve ecp
        await ecp.connect(sender).approve((await router.getAddress()), MAX_INT);
        await usdt.connect(sender).approve((await router.getAddress()), MAX_INT);

        // add liquidity ECP - ETH
        await router.addLiquidityETH(
            ecpAddress,
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            ethers.parseEther("50"), // eth
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
            , { value: ethers.parseEther("50") });

        // add pool weth - USDT
        await router.addLiquidityETH(
            (await usdt.getAddress()),
            ethers.parseEther("100"),
            ethers.parseEther("100"),
            ethers.parseEther("70"), // eth
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
            , { value: ethers.parseEther("70") });

        const pairECP_ETH = await factory.getPair(ecpAddress, wethAddress);
        const pairETH_USDT = await factory.getPair(wethAddress, usdtAddress);
        const pairecp_eth = await ethers.getContractAt("EchodexPair", pairECP_ETH);
        const paireth_usdt = await ethers.getContractAt("EchodexPair", pairETH_USDT);

        const amountIn = ethers.parseEther("10");
        const amountInMedial = await calcOutputAmount(pairecp_eth, ecpAddress, amountIn); // eth
        const amountOutMin = await calcOutputAmount(paireth_usdt, wethAddress, amountInMedial);

        await ecp.connect(sender).approve((await router.getAddress()), MAX_INT);

        // set reward
        await factory.setRewardPercent(pairECP_ETH, "5");
        await factory.setRewardPercent(pairETH_USDT, "5");

        // set path
        await factory.setFeePath(wethAddress, [wethAddress, ecpAddress]);
        await factory.setFeePath(usdtAddress, [usdtAddress, wethAddress, ecpAddress]);

        const balanceReward = await xecp.balanceOf(sender.address);

        await router.connect(sender).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            [ecpAddress, wethAddress, usdtAddress],
            sender.address,
            BigInt(((await ethers.provider.getBlock("latest"))?.timestamp || 0) + 1 * 60 * 60) // deadline
        );

        const balanceRewardAfter = await xecp.balanceOf(sender.address);

        // console.log((balanceRewardAfter - balanceReward).toString()) // 0.005104326049935066
        // console.log((amountOutMin * 5n / 10000n).toString()) // 0.003032399584400281
        // console.log((amountInMedial * 5n / 10000n).toString()) // 0.002266527234700372 -> xecp

        expect(balanceRewardAfter - balanceReward).to.equal((amountOutMin * 5n / 10000n) + (amountInMedial * 5n / 10000n));
        // expect(balanceRewardAfter - balanceReward).to.greaterThan((amountOutMin * 5n / 10000n) + (amountInMedial * 5n / 10000n) - ethers.parseEther("0.001"));
    });
});