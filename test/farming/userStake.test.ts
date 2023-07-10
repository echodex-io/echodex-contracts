import { ethers, artifacts } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { EchodexFactory, EchodexFarm, EchodexPair, EchodexRouter, MockERC20, WETH } from "../../typechain-types";
import { expect } from "chai";


describe("Farming: 1 user", async () => {
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

        // approve
        await ecp.connect(sender).approve(echodexFarmAddress, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        pair = await ethers.getContractAt("EchodexPair", pairAddress);
        await pair.connect(sender).approve(echodexFarmAddress, MAX_INT);

        // add liquidity
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

    it("unstake after 1 hour", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).poolRewards(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarmAddress);
        const amountLPIn = ethers.parseEther("100");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarmAddress);
        const poolAfter = await echodexFarm.connect(sender).poolRewards(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter).to.equal(balanceLPBefore + amountLPIn);
        expect(poolAfter.totalLP).to.equal(poolBefore.totalLP + amountLPIn);
        expect(userAfter.amount).to.equal(userBefore.amount + amountLPIn);

        await time.increase(1 * 60 * 60)

        await echodexFarm.connect(sender).unstake(
            0,
            amountLPIn
        )

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("3600"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("3604")); // tolerance block time
    })

    it("stake more after 1h -> unstake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).poolRewards(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarmAddress);
        const amountLPIn1 = ethers.parseEther("10");
        const amountLPIn2 = ethers.parseEther("20");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn1
        )

        await time.increase(1 * 60 * 60)
        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn2
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarmAddress);
        const poolAfter = await echodexFarm.poolRewards(0);
        const userAfter = await echodexFarm.users(sender.address, 0);

        expect(balanceLPAfter).to.equal(balanceLPBefore + amountLPIn1 + amountLPIn2);
        expect(poolAfter.totalLP).to.equal(poolBefore.totalLP + amountLPIn1 + amountLPIn2);
        expect(userAfter.amount).to.equal(userBefore.amount + amountLPIn1 + amountLPIn2);

        await time.increase(1 * 60 * 60)

        await echodexFarm.connect(sender).unstake(
            0,
            amountLPIn1 + amountLPIn2
        )

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("7200"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("7205")); // tolerance block time
    })

    it("stake 5LP -> unstake 3LP after 1h -> harvest afer 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).poolRewards(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarmAddress);
        const amountLPIn = ethers.parseEther("50");
        const amountLPOut = ethers.parseEther("30");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        await time.increase(1 * 60 * 60)
        await echodexFarm.connect(sender).unstake(
            0,
            amountLPOut
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarmAddress);
        const poolAfter = await echodexFarm.connect(sender).poolRewards(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter).to.equal(balanceLPBefore + (amountLPIn - amountLPOut));
        expect(poolAfter.totalLP).to.equal(poolBefore.totalLP + (amountLPIn - amountLPOut));
        expect(userAfter.amount).to.equal(userBefore.amount + (amountLPIn - amountLPOut));


        await time.increase(1 * 60 * 60)

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("7200"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("7205")); // tolerance block time
    })

    it("harvest after endTime", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).poolRewards(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarmAddress);
        const amountLPIn = ethers.parseEther("100");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarmAddress);
        const poolAfter = await echodexFarm.connect(sender).poolRewards(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter).to.equal(balanceLPBefore + amountLPIn);
        expect(poolAfter.totalLP).to.equal(poolBefore.totalLP + amountLPIn);
        expect(userAfter.amount).to.equal(userBefore.amount + amountLPIn);

        await time.increase(2592000 + 1 * 60 * 60)


        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("2592000"));
        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("2591998")); // tolerance block time
    })

    it("unstake -> harvest after endTime", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).poolRewards(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarmAddress);
        const amountLPIn = ethers.parseEther("100");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarmAddress);
        const poolAfter = await echodexFarm.connect(sender).poolRewards(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter).to.equal(balanceLPBefore + amountLPIn);
        expect(poolAfter.totalLP).to.equal(poolBefore.totalLP + amountLPIn);
        expect(userAfter.amount).to.equal(userBefore.amount + amountLPIn);

        await time.increase(1 * 60 * 60)

        await echodexFarm.connect(sender).unstake(
            0,
            amountLPIn
        )

        await time.increase(2592000 + 1 * 60 * 60)

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);

        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("3600"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("3604"));  // tolerance block time
    })
})