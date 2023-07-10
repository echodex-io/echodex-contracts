import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import { assert } from "chai";
import { Contract } from "ethers";
import { MAX_INT, deployExchange, deployTokens } from "../prepare";

describe("test create pool", async () => {
    // tokens
    let usdt: Contract;
    let btc: Contract;
    let ecp: Contract;
    let xecp: Contract;
    // exchange
    let factory: Contract;
    let echodexFarm: Contract;

    beforeEach(async () => {
        const tokens = await deployTokens();

        usdt = tokens.usdt;
        btc = tokens.btc;
        ecp = tokens.ecp;
        xecp = tokens.xecp;

        const exchange = await deployExchange(ecp, xecp);
        factory = exchange.factory;
        echodexFarm = exchange.echodexFarm

        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        // approve 
        await ecp.connect(sender).approve(echodexFarm.address, MAX_INT);

        // create pair
        await factory.connect(sender).createPair((await usdt.getAddress()), (await btc.getAddress()));
    });

    it("create pool", async function () {
        const accounts = await ethers.getSigners();
        const sender = accounts[0];

        await echodexFarm.connect(sender).createPool(
            (await usdt.getAddress()),
            (await btc.getAddress()),
            parseEther("30"),
            ecp.address,
            parseEther("30"),
            parseEther("31"),
        )

        assert.equal(String(await ecp.balanceOf(echodexFarm.address)), parseEther("30").toString());
    })
})