import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";

describe("Farming: 2 users", async () => {
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

        // approve token
        await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair
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
            startDate + 2592000, // 30 day
        )
    });

    it("user1 stake 1LP + user2 stake 2LP -> harvest all after 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const amountLPIn = ethers.utils.parseEther("1");
        const amountLPIn1 = ethers.utils.parseEther("2");

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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("1200"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("1204"))));  // tolerance block time

        expect(Number(balanceEcpAfter1)).to.greaterThan(Number(balanceEcpBefore1.add(ethers.utils.parseEther("2400"))));
        expect(Number(balanceEcpAfter1)).to.lessThan(Number(balanceEcpBefore1.add(ethers.utils.parseEther("2403"))));  // tolerance block time
    })

    it("user1 stake 1LP + user2 stake 2LP -> user1 harvest after 1h -> user2 harvest after 1h -> harvest all after 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const amountLPIn = ethers.utils.parseEther("100");
        const amountLPIn1 = ethers.utils.parseEther("200");

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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("3603")))); // tolerance block time

        expect(Number(balanceEcpAfter1)).to.greaterThan(Number(balanceEcpBefore1.add(ethers.utils.parseEther("7199")))); // tolerance block time
        expect(Number(balanceEcpAfter1)).to.lessThan(Number(balanceEcpBefore1.add(ethers.utils.parseEther("7200"))));
    })

    it("user1 stake 1LP + user2 stake 2LP -> user1 unstake after 1h -> user2 harvest after 1h -> user1 harvest after 1h", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];
        const sender1 = accounts[1];

        const amountLPIn = ethers.utils.parseEther("100");
        const amountLPIn1 = ethers.utils.parseEther("200");

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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("1200"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.utils.parseEther("1203")))); // tolerance block time

        expect(Number(balanceEcpAfter1)).to.greaterThan(Number(balanceEcpBefore1.add(ethers.utils.parseEther("5998")))); // tolerance block time
        expect(Number(balanceEcpAfter1)).to.lessThan(Number(balanceEcpBefore1.add(ethers.utils.parseEther("6000"))));

        // 1h first : sender: 1200 + sender1: 2400
        // 1h later: sender1: 3600
    })
})