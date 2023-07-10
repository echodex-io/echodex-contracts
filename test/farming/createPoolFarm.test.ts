import { ethers } from "hardhat";
import { assert } from "chai";
import { MAX_INT, deployExchange, deployTokens } from "../prepare";
import { EchodexFactory, EchodexFarm, MockERC20 } from "../../typechain-types";

describe("test create pool", async () => {
    // tokens
    let usdt: MockERC20;
    let btc: MockERC20;
    let ecp: MockERC20;
    let ecpAddress: string;
    let xecp: MockERC20;
    let xecpAddress: string;
    // exchange
    let factory: EchodexFactory;
    let echodexFarm: EchodexFarm;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;
        ecpAddress = await ecp.getAddress()
        xecp = tokens.xecp;
        xecpAddress = await xecp.getAddress()

        const exchange = await deployExchange(ecpAddress, xecpAddress);
        factory = exchange.factory;
        echodexFarm = exchange.echodexFarm

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve 
        await ecp.connect(sender).approve((await echodexFarm.getAddress()), MAX_INT);

        // create pair
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
    });

    it("create pool", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            ethers.parseEther("30"),
            ecpAddress,
            ethers.parseEther("30"),
            ethers.parseEther("31"),
        )

        assert.equal(String(await ecp.balanceOf((await echodexFarm.getAddress()))), ethers.parseEther("30").toString());
    })
})