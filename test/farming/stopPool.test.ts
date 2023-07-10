import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe("stopPool", async () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    let xecp: Contract;
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
        xecp = tokens.xecp;

        const exchange = await deployExchange(ecp, xecp);
        router = exchange.router;
        factory = exchange.factory;
        echodexFarm = exchange.echodexFarm

        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        await usdt.connect(sender).transfer(sender1.address, ethers.parseEther("1000"));
        await btc.connect(sender).transfer(sender1.address, ethers.parseEther("10000"));

        // approve
        await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        pair = new ethers.Contract(pairAddress, pairABI, sender);

        // appro pair
        await pair.connect(sender).approve(echodexFarm.address, MAX_INT);
        await pair.connect(sender1).approve(echodexFarm.address, MAX_INT);

        // add liquidity
        await addLiquidity(sender, router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));
        await addLiquidity(sender1, router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));

        // create pool
        const startDate = await time.latest() + 1
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("2592000"),
            ecp.address,
            startDate,
            await time.latest() + 2592000, // 30 day
        )
    });

    it("stake -> stop -> harvest -> withdraw", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        // stake
        const amountLPIn = ethers.parseEther("100");
        await echodexFarm.connect(sender1).stake(
            0,
            amountLPIn
        )

        await time.increase(1 * 60 * 60) // 1h

        await echodexFarm.connect(sender).stopPool(0)

        try {
            await echodexFarm.connect(sender1).stake(
                0,
                amountLPIn
            )
        } catch (error: any) {
            expect(error.message).to.include("EchodexFarm: OVER_TIME");
        }

        // harvest
        const balanceEcpBefore = await ecp.balanceOf(sender1.address);
        await echodexFarm.connect(sender1).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender1.address);
        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.parseEther("3604"))));  // tolerance block time

        // withdraw
        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.parseEther("2592000")).sub(ethers.parseEther("3603")))); // tolerance block time
        expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.parseEther("2592000")).sub(ethers.parseEther("3600"))));
    })

    it("stake -> stop -> withdraw -> harvest", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        // stake
        const amountLPIn = ethers.parseEther("100");
        await echodexFarm.connect(sender1).stake(
            0,
            amountLPIn
        )

        await time.increase(1 * 60 * 60) // 1h

        await echodexFarm.connect(sender).stopPool(0)

        try {
            await echodexFarm.connect(sender1).stake(
                0,
                amountLPIn
            )
        } catch (error: any) {
            expect(error.message).to.include("EchodexFarm: OVER_TIME");
        }

        //withdraw
        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);
        expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.parseEther("2592000")).sub(ethers.parseEther("3603")))); // tolerance block time
        expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.parseEther("2592000")).sub(ethers.parseEther("3600"))));

        //harvest
        const balanceEcpBefore = await ecp.balanceOf(sender1.address);
        await echodexFarm.connect(sender1).harvest(
            0
        )
        const balanceEcpAfter = await ecp.balanceOf(sender1.address);
        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.parseEther("3604"))));  // tolerance block time
    })

    it("no stake -> stop -> withdraw", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        await time.increase(1 * 60 * 60) // 1h
        await echodexFarm.connect(sender).stopPool(0)

        //withdraw
        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        expect(Number(balanceTokenRewardAfter)).to.greaterThanOrEqual(Number(balanceTokenRewardBefore.add(ethers.parseEther("2591999")))); // tolerance block time
        expect(Number(balanceTokenRewardAfter)).to.lessThanOrEqual(Number(balanceTokenRewardBefore.add(ethers.parseEther("2592000"))));
    })
})