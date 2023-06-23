import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe("Withdraw Excess", async () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    // exchange
    let router: Contract;
    let factory: Contract;
    let echodexFarm: Contract;
    let pair: Contract;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;

        const exchange = await deployExchange(ecp);
        router = exchange.router;
        factory = exchange.factory;
        echodexFarm = exchange.echodexFarm

        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        await usdt.connect(sender).transfer(sender1.address, ethers.utils.parseEther("1000"));
        await btc.connect(sender).transfer(sender1.address, ethers.utils.parseEther("10000"));

        // approve
        await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair(usdt.address, btc.address);
        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        pair = new ethers.Contract(pairAddress, pairABI, sender);

        // appro pair
        await pair.connect(sender).approve(echodexFarm.address, MAX_INT);
        await pair.connect(sender1).approve(echodexFarm.address, MAX_INT);

        // add liquidity
        await addLiquidity(sender, router, usdt, btc, ethers.utils.parseEther("100"), ethers.utils.parseEther("1000"));
        await addLiquidity(sender1, router, usdt, btc, ethers.utils.parseEther("100"), ethers.utils.parseEther("1000"));

        // create pool
        const startDate = await time.latest() + 1
        await echodexFarm.connect(sender).createPool(
            usdt.address,
            btc.address,
            ethers.utils.parseEther("2592000"),
            ecp.address,
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

        expect(Number(balanceTokenRewardAfter.sub(balanceTokenRewardBefore))).to.lessThanOrEqual(Number(ethers.utils.parseEther("2592000")));
        expect(Number(balanceTokenRewardAfter.sub(balanceTokenRewardBefore))).to.greaterThan(Number(ethers.utils.parseEther("2591998"))); // tolerance block time

    })

    it("has stake and unstake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.utils.parseEther("10");

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

        expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("2592000")).sub(ethers.utils.parseEther("3603")))); // tolerance block time
        expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("2592000")).sub(ethers.utils.parseEther("3600"))));

    })

    it("no excess", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.utils.parseEther("10");

        await echodexFarm.connect(sender1).stake(
            0,
            amountLP
        )

        await time.increase(2592000)

        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(Number(balanceTokenRewardAfter.sub(balanceTokenRewardBefore))).to.lessThan(Number(ethers.utils.parseEther("2"))); // tolerance block time
        expect(Number(balanceTokenRewardAfter.sub(balanceTokenRewardBefore))).to.greaterThan(Number(ethers.utils.parseEther("1")));
    })

    it("harvest after end, then withdraw", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.utils.parseEther("10");

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

        expect(Number(after)).to.greaterThan(Number(before.add(ethers.utils.parseEther("2592000").sub(ethers.utils.parseEther("3605"))))); // tolerance block time
        expect(Number(after)).to.lessThan(Number(before.add(ethers.utils.parseEther("2592000").sub(ethers.utils.parseEther("3600")))));

        // withdraw
        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("3600"))));
        expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("3605")))); // tolerance block time

    })

    it("withdraw after end, then harvest", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.utils.parseEther("10");

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


        expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("3600"))));
        expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("3605")))); // tolerance block time

        // harvest
        const before = await ecp.balanceOf(sender1.address);
        await echodexFarm.connect(sender1).harvest(
            0
        )
        const after = await ecp.balanceOf(sender1.address);

        expect(Number(after)).to.greaterThan(Number(before.add(ethers.utils.parseEther("2592000").sub(ethers.utils.parseEther("3605"))))); // tolerance block time
        expect(Number(after)).to.lessThan(Number(before.add(ethers.utils.parseEther("2592000").sub(ethers.utils.parseEther("3600")))));
    })

    it("stake -> unstake -> [...] -> stake -> unstake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        const amountLP = ethers.utils.parseEther("10");

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

        expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("2592000")).sub(ethers.utils.parseEther("7203")))); // tolerance block time
        expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("2592000")).sub(ethers.utils.parseEther("7200"))));

    })
})