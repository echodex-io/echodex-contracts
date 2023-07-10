import { ethers, artifacts } from "hardhat";
import { Contract } from "ethers";
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";
import { EchodexFactory, EchodexFarm, EchodexPair, EchodexRouter, MockERC20, WETH } from "../../typechain-types";
import { expect } from "chai";

describe("Farming: 2 users", async () => {
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

        // approve token
        await ecp.connect(sender).approve(echodexFarmAddress, MAX_INT);

        // create pair
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
        const pairAddress = await factory.getPair((await usdt.getAddress()), (await btc.getAddress()));
        pair = await ethers.getContractAt("EchodexPair", pairAddress);

        // appro pair
        await pair.connect(sender).approve(echodexFarmAddress, MAX_INT);
        await pair.connect(sender1).approve(echodexFarmAddress, MAX_INT);

        // add liquidity
        await addLiquidity(router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"));
        await addLiquidity(router, usdt, btc, ethers.parseEther("100"), ethers.parseEther("1000"), true);

        // create pool
        const startDate = await time.latest() + 1
        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("2592000"),
            ecpAddress,
            startDate,
            startDate + 2592000, // 30 day
        )
    });

    it("user1 stake 1LP + user2 stake 2LP -> harvest all after 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const amountLPIn = ethers.parseEther("1");
        const amountLPIn1 = ethers.parseEther("2");

        // stake
        await Promise.all([
            echodexFarm.connect(sender).stake(
                0,
                amountLPIn
            ),
            echodexFarm.connect(sender1).stake(
                0,
                amountLPIn1
            )
        ])

        const timeStake = await time.latest();

        await time.increaseTo(timeStake + 1 * 60 * 60); // sau 1h

        // harvest
        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        const balanceEcpBefore1 = await ecp.balanceOf(sender1.address);

        await Promise.all([
            echodexFarm.connect(sender).harvest(
                0
            ),
            echodexFarm.connect(sender1).harvest(
                0
            )
        ])

        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        const balanceEcpAfter1 = await ecp.balanceOf(sender1.address);

        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("1200"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("1204"));  // tolerance block time

        expect(balanceEcpAfter1).to.greaterThan(balanceEcpBefore1 + ethers.parseEther("2400"));
        expect(balanceEcpAfter1).to.lessThan(balanceEcpBefore1 + ethers.parseEther("2403"));  // tolerance block time
    })

    it("user1 stake 1LP + user2 stake 2LP -> user1 harvest after 1h -> user2 harvest after 1h -> harvest all after 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const amountLPIn = ethers.parseEther("100");
        const amountLPIn1 = ethers.parseEther("200");

        // stake
        const timeStake = await time.latest();
        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )
        await echodexFarm.connect(sender1).stake(
            0,
            amountLPIn1
        )

        await time.increaseTo(timeStake + 1 * 60 * 60); // time: 1h

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        const balanceEcpBefore1 = await ecp.balanceOf(sender1.address);
        await echodexFarm.connect(sender).harvest(
            0
        )

        await time.increaseTo(timeStake + 2 * 60 * 60); // time: 2h
        await echodexFarm.connect(sender1).harvest(
            0
        )

        await time.increaseTo(timeStake + 3 * 60 * 60); // time: 3h
        await echodexFarm.connect(sender).harvest(
            0
        )
        await echodexFarm.connect(sender1).harvest(
            0
        )

        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        const balanceEcpAfter1 = await ecp.balanceOf(sender1.address);

        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("3600"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("3603")); // tolerance block time

        expect(balanceEcpAfter1).to.greaterThan(balanceEcpBefore1 + ethers.parseEther("7199")); // tolerance block time
        expect(balanceEcpAfter1).to.lessThan(balanceEcpBefore1 + ethers.parseEther("7200"));
    })

    it("user1 stake 1LP + user2 stake 2LP -> user1 unstake after 1h -> user2 harvest after 1h -> user1 harvest after 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const amountLPIn = ethers.parseEther("100");
        const amountLPIn1 = ethers.parseEther("200");

        const timeStake = await time.latest();

        // stake
        await echodexFarm.connect(sender).stake(
            0,
            amountLPIn
        )
        await echodexFarm.connect(sender1).stake(
            0,
            amountLPIn1
        )

        await time.increaseTo(timeStake + 1 * 60 * 60); // time: 1h

        // unstake
        await echodexFarm.connect(sender).unstake(
            0,
            amountLPIn
        )

        await time.increaseTo(timeStake + 2 * 60 * 60); // time: 2h

        const balanceEcpBefore = await ecp.balanceOf(sender.address);
        const balanceEcpBefore1 = await ecp.balanceOf(sender1.address);

        await echodexFarm.connect(sender1).harvest(
            0
        )

        await time.increaseTo(timeStake + 3 * 60 * 60); // time: 3h

        await echodexFarm.connect(sender).harvest(
            0
        )

        const balanceEcpAfter = await ecp.balanceOf(sender.address);
        const balanceEcpAfter1 = await ecp.balanceOf(sender1.address);

        expect(balanceEcpAfter).to.greaterThan(balanceEcpBefore + ethers.parseEther("1200"));
        expect(balanceEcpAfter).to.lessThan(balanceEcpBefore + ethers.parseEther("1203")); // tolerance block time

        expect(balanceEcpAfter1).to.greaterThan(balanceEcpBefore1 + ethers.parseEther("5998")); // tolerance block time
        expect(balanceEcpAfter1).to.lessThan(balanceEcpBefore1 + ethers.parseEther("6000"));

        // 1h first : sender: 1200 + sender1: 2400
        // 1h later: sender1: 3600
    })
})