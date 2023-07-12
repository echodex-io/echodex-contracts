import { ethers, artifacts } from "hardhat";
import { Contract } from "ethers";
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { EchodexFactory, EchodexFarm, EchodexPair, EchodexRouter, MockERC20, WETH } from "../../typechain-types";
import { expect } from "chai";

describe("Reward ETH", async () => {
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
        weth = exchange.weth;
        wethAddress = await weth.getAddress();

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve
        // await ecp.connect(sender).approve(echodexFarmAddress, MAX_INT);

        // create pair and appro
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        pair = await ethers.getContractAt("EchodexPair", pairAddress);

        await pair.connect(sender).approve((await echodexFarm.getAddress()), MAX_INT);

        // add liquidity
        await addLiquidity(router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));


    });

    it("harvestETH", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // create pool
        const startDate = await time.latest() + 1
        const before = await ethers.provider.getBalance((await echodexFarm.getAddress()))
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("5000"),
            wethAddress,
            startDate,
            startDate + 5000, // 5h
            {
                value: ethers.parseEther("5000")
            }
        )

        const after = await ethers.provider.getBalance((await echodexFarm.getAddress()))
        expect(after - before).to.equal(ethers.parseEther("5000"))

        // stake
        const amountLPIn = ethers.parseEther("100");
        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )

        await time.increase(5000)

        const balanceBefore = await ethers.provider.getBalance(sender.address)
        await echodexFarm.connect(sender).harvest(0)
        const balanceAfter = await ethers.provider.getBalance(sender.address)

        expect(balanceAfter - balanceBefore).to.lessThan(ethers.parseEther("5000"))
        expect(balanceAfter - balanceBefore).to.greaterThan(ethers.parseEther("4998"))
    })

    it("withdrawExcessRewardETH", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // create pool
        const startDate = await time.latest() + 1
        const before = await ethers.provider.getBalance(echodexFarmAddress)
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("5000"),
            wethAddress,
            startDate,
            startDate + 5000, // 5h
            {
                value: ethers.parseEther("5000")
            }
        )

        const after = await ethers.provider.getBalance(echodexFarmAddress)
        expect(after - before).to.equal(ethers.parseEther("5000"))

        await time.increase(5000)

        const balanceBefore = await ethers.provider.getBalance(sender.address)
        await echodexFarm.connect(sender).withdrawExcessReward(0)
        const balanceAfter = await ethers.provider.getBalance(sender.address)

        expect(balanceAfter - balanceBefore).to.lessThan(ethers.parseEther("5000"))
        expect(balanceAfter - balanceBefore).to.greaterThan(ethers.parseEther("4998"))
    })
})