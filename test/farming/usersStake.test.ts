import { ethers, artifacts, expect } from "hardhat";
import { Contract } from "ethers";
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { MAX_INT, addLiquidity, deployExchange, deployTokens } from "../prepare";

describe("Farming: 2 users", async () => {
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

        // approve token
        await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair
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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.parseEther("1200"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.parseEther("1204"))));  // tolerance block time

        expect(Number(balanceEcpAfter1)).to.greaterThan(Number(balanceEcpBefore1.add(ethers.parseEther("2400"))));
        expect(Number(balanceEcpAfter1)).to.lessThan(Number(balanceEcpBefore1.add(ethers.parseEther("2403"))));  // tolerance block time
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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.parseEther("3600"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.parseEther("3603")))); // tolerance block time

        expect(Number(balanceEcpAfter1)).to.greaterThan(Number(balanceEcpBefore1.add(ethers.parseEther("7199")))); // tolerance block time
        expect(Number(balanceEcpAfter1)).to.lessThan(Number(balanceEcpBefore1.add(ethers.parseEther("7200"))));
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

        expect(Number(balanceEcpAfter)).to.greaterThan(Number(balanceEcpBefore.add(ethers.parseEther("1200"))));
        expect(Number(balanceEcpAfter)).to.lessThan(Number(balanceEcpBefore.add(ethers.parseEther("1203")))); // tolerance block time

        expect(Number(balanceEcpAfter1)).to.greaterThan(Number(balanceEcpBefore1.add(ethers.parseEther("5998")))); // tolerance block time
        expect(Number(balanceEcpAfter1)).to.lessThan(Number(balanceEcpBefore1.add(ethers.parseEther("6000"))));

        // 1h first : sender: 1200 + sender1: 2400
        // 1h later: sender1: 3600
    })
})