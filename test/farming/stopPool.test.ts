import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe("stopPool", async () => {
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

    it("stake -> stop -> harvest -> withdraw", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[0];

        // stake
        const amountLPIn = ethers.utils.parseEther("100");
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

        const balanceEcpBefore = await ecp.balanceOf(sender1.address);
        const pool = await echodexFarm.poolInfos(0);
        const poolBefore = await echodexFarm.poolRewards(0);
        await echodexFarm.connect(sender1).harvest(
            0
        )
        const poolAfter = await echodexFarm.poolRewards(0);
        const balanceEcpAfter = await ecp.balanceOf(sender1.address);
        const pools = await echodexFarm.poolInfos(0);

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3604"))));  // tolerance block time


        const balanceTokenRewardBefore = await ecp.balanceOf(sender.address);
        await echodexFarm.connect(sender).withdrawExcessReward(0);
        const balanceTokenRewardAfter = await ecp.balanceOf(sender.address);

        console.log(balanceTokenRewardBefore.toString())
        console.log(balanceTokenRewardAfter.toString())
        console.log(balanceTokenRewardAfter.sub(balanceTokenRewardBefore).toString())
        // 2588400

        // expect(Number(balanceTokenRewardAfter)).to.greaterThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("2592000")).sub(ethers.utils.parseEther("3603")))); // tolerance block time
        // expect(Number(balanceTokenRewardAfter)).to.lessThan(Number(balanceTokenRewardBefore.add(ethers.utils.parseEther("2592000")).sub(ethers.utils.parseEther("3600"))));
        //2588400
        //2588397
    })
})