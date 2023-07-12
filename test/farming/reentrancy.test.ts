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
        weth = exchange.weth
        wethAddress = await weth.getAddress()

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve
        await ecp.connect(sender).approve(echodexFarmAddress, MAX_INT);

        // create pair and approve
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
            wethAddress,
            startDate,
            await time.latest() + 2592000, // 30 day
            {value: ethers.parseEther("2592000")}
        );
    });

    // it("reentrancy harvest prevent", async function () {
    //     const accounts = await ethers.getSigners();
    //     const attacker = accounts[3];
    //     // deploy reentrancy contract
    //     const ReentrantHarvestTest = await ethers.getContractFactory("ReentrantHarvestTest");
    //     const farmAddress = await echodexFarm.getAddress();
    //     const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
    //     const pair = await ethers.getContractAt("EchodexPair", pairAddress);
    //     const reentrantContract = await ReentrantHarvestTest.connect(attacker).deploy(farmAddress, pairAddress);
    //     const reentrantContractAddress = await reentrantContract.getAddress();

    //     // attacker add liquidity to get lp
    //     await router.addLiquidity(
    //         (await usdt.getAddress()),
    //         (await btc.getAddress()),
    //         ethers.parseEther("100"),
    //         ethers.parseEther("1000"),
    //         ethers.parseEther("100"),
    //         ethers.parseEther("1000"),
    //         attacker.getAddress(),
    //         await time.latest() + 1000
    //     )

    //     // transfer 100 lp token to reentrant contract
    //     await pair.connect(attacker).transfer(reentrantContractAddress, ethers.parseEther("100"));

    //     await reentrantContract.connect(attacker).stake()

    //     // increase time to harvest
    //     await time.increase(3600)

    //     // reentrantHarvest with loop is 0
    //     try {
    //         await reentrantContract.connect(attacker).reentrantHarvest()
    //     } catch (error: any) {
    //         expect(error.message).to.include("reverted")
    //     }
    // })
})