import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe("Reward ETH", async () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    let xecp: Contract;
    let weth: Contract;
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
        weth = exchange.weth;

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve
        // await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairABI = (await artifacts.readArtifact("EchodexPair")).abi;
        pair = new ethers.Contract(pairAddress, pairABI, sender);
        await pair.connect(sender).approve(echodexFarm.address, MAX_INT);

        // add liquidity
        await addLiquidity(sender, router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));


    });

    it("harvestETH", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // create pool
        const startDate = await time.latest() + 1
        const before = await ethers.provider.getBalance(echodexFarm.address)
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("5000"),
            weth.address,
            startDate,
            startDate + 5000, // 5h
            {
                value: ethers.parseEther("5000")
            }
        )

        const after = await ethers.provider.getBalance(echodexFarm.address)
        expect(Number(after.sub(before))).to.equal(Number(ethers.parseEther("5000")))

        // stake
        const amountLPIn = ethers.parseEther("100");
        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        await time.increase(5000)

        const balanceBefore = await ethers.provider.getBalance(sender.address)
        await echodexFarm.connect(sender).harvest(
            0
        )
        const balanceAfter = await ethers.provider.getBalance(sender.address)

        expect(Number(balanceAfter.sub(balanceBefore))).to.lessThan(Number(ethers.parseEther("5000")))
        expect(Number(balanceAfter.sub(balanceBefore))).to.greaterThan(Number(ethers.parseEther("4998")))
    })

    it("withdrawExcessRewardETH", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // create pool
        const startDate = await time.latest() + 1
        const before = await ethers.provider.getBalance(echodexFarm.address)
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("5000"),
            weth.address,
            startDate,
            startDate + 5000, // 5h
            {
                value: ethers.parseEther("5000")
            }
        )

        const after = await ethers.provider.getBalance(echodexFarm.address)
        expect(Number(after.sub(before))).to.equal(Number(ethers.parseEther("5000")))

        await time.increase(5000)

        const balanceBefore = await ethers.provider.getBalance(sender.address)
        await echodexFarm.connect(sender).withdrawExcessReward(
            0,
        )
        const balanceAfter = await ethers.provider.getBalance(sender.address)

        expect(Number(balanceAfter.sub(balanceBefore))).to.lessThan(Number(ethers.parseEther("5000")))
        expect(Number(balanceAfter.sub(balanceBefore))).to.greaterThan(Number(ethers.parseEther("4998")))
    })
})