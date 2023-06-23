import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe("Farming: 1 user", async () => {
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

        // approve
        await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair(usdt.address, btc.address);
        const pairAddress = await factory.getPair(usdt.address, btc.address);
        const pairABI = (await artifacts.require("EchodexPair")).abi;
        pair = new ethers.Contract(pairAddress, pairABI, sender);
        await pair.connect(sender).approve(echodexFarm.address, MAX_INT);

        // add liquidity
        await addLiquidity(sender, router, usdt, btc, ethers.utils.parseEther("100"), ethers.utils.parseEther("1000"));

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

    it("unstake after 1 hour", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).pools(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarm.address);
        const amountLPIn = ethers.utils.parseEther("100");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarm.address);
        const poolAfter = await echodexFarm.connect(sender).pools(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter.toString()).to.equal(balanceLPBefore.add(amountLPIn).toString());
        expect(poolAfter.totalLP.toString()).to.equal(poolBefore.totalLP.add(amountLPIn).toString());
        expect(userAfter.amount.toString()).to.equal(userBefore.amount.add(amountLPIn).toString());

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
        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3604")))); // tolerance block time
    })

    it("stake more after 1h -> unstake", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).pools(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarm.address);
        const amountLPIn1 = ethers.utils.parseEther("10");
        const amountLPIn2 = ethers.utils.parseEther("20");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn1
        )

        await time.increase(1 * 60 * 60)
        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn2
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarm.address);
        const poolAfter = await echodexFarm.pools(0);
        const userAfter = await echodexFarm.users(sender.address, 0);

        expect(balanceLPAfter.toString()).to.equal(balanceLPBefore.add(amountLPIn1).add(amountLPIn2).toString());
        expect(poolAfter.totalLP.toString()).to.equal(poolBefore.totalLP.add(amountLPIn1).add(amountLPIn2).toString());
        expect(userAfter.amount.toString()).to.equal(userBefore.amount.add(amountLPIn1).add(amountLPIn2).toString());

        await time.increase(1 * 60 * 60)

        await echodexFarm.connect(sender).unstake(
            0,
            amountLPIn1.add(amountLPIn2)
        )

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("7200"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("7205")))); // tolerance block time
    })

    it("stake 5LP -> unstake 3LP after 1h -> harvest afer 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).pools(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarm.address);
        const amountLPIn = ethers.utils.parseEther("50");
        const amountLPOut = ethers.utils.parseEther("30");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        await time.increase(1 * 60 * 60)
        await echodexFarm.connect(sender).unstake(
            0,
            amountLPOut
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarm.address);
        const poolAfter = await echodexFarm.connect(sender).pools(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter.toString()).to.equal(balanceLPBefore.add(amountLPIn.sub(amountLPOut)).toString());
        expect(poolAfter.totalLP.toString()).to.equal(poolBefore.totalLP.add(amountLPIn.sub(amountLPOut)).toString());
        expect(userAfter.amount.toString()).to.equal(userBefore.amount.add(amountLPIn.sub(amountLPOut)).toString());


        await time.increase(1 * 60 * 60)

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("7200"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("7205")))); // tolerance block time
    })

    it("harvest after endTime", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).pools(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarm.address);
        const amountLPIn = ethers.utils.parseEther("100");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarm.address);
        const poolAfter = await echodexFarm.connect(sender).pools(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter.toString()).to.equal(balanceLPBefore.add(amountLPIn).toString());
        expect(poolAfter.totalLP.toString()).to.equal(poolBefore.totalLP.add(amountLPIn).toString());
        expect(userAfter.amount.toString()).to.equal(userBefore.amount.add(amountLPIn).toString());

        await time.increase(2592000 + 1 * 60 * 60)


        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("2592000"))));
        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("2591998")))); // tolerance block time
    })

    it("unstake -> harvest after endTime", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        const poolBefore = await echodexFarm.connect(sender).pools(0);
        const userBefore = await echodexFarm.connect(sender).users(sender.address, 0);
        const balanceLPBefore = await pair.balanceOf(echodexFarm.address);
        const amountLPIn = ethers.utils.parseEther("100");

        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        const balanceLPAfter = await pair.balanceOf(echodexFarm.address);
        const poolAfter = await echodexFarm.connect(sender).pools(0);
        const userAfter = await echodexFarm.connect(sender).users(sender.address, 0);

        expect(balanceLPAfter.toString()).to.equal(balanceLPBefore.add(amountLPIn).toString());
        expect(poolAfter.totalLP.toString()).to.equal(poolBefore.totalLP.add(amountLPIn).toString());
        expect(userAfter.amount.toString()).to.equal(userBefore.amount.add(amountLPIn).toString());

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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3604"))));  // tolerance block time
    })
})