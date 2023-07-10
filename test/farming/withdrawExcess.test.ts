import { ethers, artifacts } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { EchodexFactory, EchodexFarm, EchodexPair, EchodexRouter, MockERC20, WETH } from "../../typechain-types";
import { expect } from "chai";

describe("Withdraw Excess", async () => {
    // tokens
    let usdt: MockERC20;
    let btc: MockERC20;
    let ecp: MockERC20;
    let ecpAddress: string;
    let xecp: MockERC20;
    let xecpAddress: string;
    let weth: WETH
    let wethAddress: string;
    // exchange
    let factory: EchodexFactory;
    let echodexFarm: EchodexFarm;
    let router: EchodexRouter
    let pair: EchodexPair
    let echodexFarmAddress: string;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;
        ecpAddress = await ecp.getAddress()
        xecp = tokens.xecp;
        xecpAddress = await xecp.getAddress()

        const exchange = await deployExchange(ecpAddress, xecpAddress);
        router = exchange.router;
        factory = exchange.factory;
        echodexFarm = exchange.echodexFarm
        echodexFarmAddress = await echodexFarm.getAddress()

        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        await usdt.connect(sender).transfer(sender1.address, ethers.parseEther("1000"));
        await btc.connect(sender).transfer(sender1.address, ethers.parseEther("10000"));

        // approve
        await ecp.connect(sender).approve(echodexFarmAddress, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        pair = await ethers.getContractAt("EchodexPair", pairAddress);

        // appro pair
        await pair.connect(sender).approve(echodexFarmAddress, MAX_INT);
        await pair.connect(sender1).approve(echodexFarmAddress, MAX_INT);

        // add liquidity
        await addLiquidity(router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));
        await addLiquidity(router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));

        // create pool
        const startDate = await time.latest() + 1
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("2592000"),
            ecpAddress,
            startDate,
            await time.latest() + 2592000, // 30 day
        )
    });

    it("no stake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        try {
            await echodexFarm.connect(sender).withdrawExcessReward(0);
        } catch (error: any) {
            expect(error.message).to.include("EchodexFarm: POOL_NOT_END");
        }

        await time.increase(2592000)

        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(balanceTokenRewardAfter - balanceTokenRewardBefore).to.lessThanOrEqual(ethers.parseEther("2592000"));
        expect(balanceTokenRewardAfter - balanceTokenRewardBefore).to.greaterThan(ethers.parseEther("2591998")); // tolerance block time

    })

    it("has stake and unstake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.parseEther("10");

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(60 * 60)

        await echodexFarm.connect(sender1).unstake(
            0,
            amountLP
        )

        await time.increase(2592000)

        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(balanceTokenRewardAfter).to.greaterThan(balanceTokenRewardBefore + ethers.parseEther("2592000") - ethers.parseEther("3603")); // tolerance block time
        expect(balanceTokenRewardAfter).to.lessThan(balanceTokenRewardBefore + ethers.parseEther("2592000") - ethers.parseEther("3600"));

    })

    it("no excess", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.parseEther("10");

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(2592000)

        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(balanceTokenRewardAfter - balanceTokenRewardBefore).to.lessThan(ethers.parseEther("2")); // tolerance block time
        expect(balanceTokenRewardAfter - balanceTokenRewardBefore).to.greaterThan(ethers.parseEther("1"));
    })

    it("harvest after end, then withdraw", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.parseEther("10");

        await time.increase(1 * 60 * 60)

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(2592000)

        // harvest
        const before = await ecp.balanceOf(sender1.address);
        await echodexFarm.connect(sender1).harvest(
            0
        )
        const after = await ecp.balanceOf(sender1.address);

        expect(after).to.greaterThan(before + (ethers.parseEther("2592000") - ethers.parseEther("3605"))); // tolerance block time
        expect(after).to.lessThan(before + (ethers.parseEther("2592000") - ethers.parseEther("3600")));

        // withdraw
        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(balanceTokenRewardAfter).to.greaterThan(balanceTokenRewardBefore + ethers.parseEther("3600"));
        expect(balanceTokenRewardAfter).to.lessThan(balanceTokenRewardBefore + ethers.parseEther("3605")); // tolerance block time

    })

    it("withdraw after end, then harvest", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.parseEther("10");

        await time.increase(1 * 60 * 60)

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(2592000)

        // withdraw
        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);


        expect(balanceTokenRewardAfter).to.greaterThan(balanceTokenRewardBefore + ethers.parseEther("3600"));
        expect(balanceTokenRewardAfter).to.lessThan(balanceTokenRewardBefore + ethers.parseEther("3605")); // tolerance block time

        // harvest
        const before = await ecp.balanceOf(sender1.address);
        await echodexFarm.connect(sender1).harvest(
            0
        )
        const after = await ecp.balanceOf(sender1.address);

        expect(after).to.greaterThan(before + (ethers.parseEther("2592000") - ethers.parseEther("3605"))); // tolerance block time
        expect(after).to.lessThan(before + (ethers.parseEther("2592000") - ethers.parseEther("3600")));
    })

    it("stake -> unstake -> [...] -> stake -> unstake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.parseEther("10");

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(60 * 60)

        await echodexFarm.connect(sender1).unstake(
            0,
            amountLP
        )

        await time.increase(60 * 60)

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(60 * 60)

        await echodexFarm.connect(sender1).unstake(
            0,
            amountLP
        )

        await time.increase(2592000)

        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(balanceTokenRewardAfter).to.greaterThan(balanceTokenRewardBefore + ethers.parseEther("2592000") - ethers.parseEther("7203")); // tolerance block time
        expect(balanceTokenRewardAfter).to.lessThan(balanceTokenRewardBefore + ethers.parseEther("2592000") - ethers.parseEther("7200"));
    })
})