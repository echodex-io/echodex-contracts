import { formatUnits, parseEther } from "ethers/lib/utils";
import { artifacts, contract } from "hardhat";
import { assert, expect } from "chai";
import { BN, constants, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers";

const MockERC20 = artifacts.require("./utils/MockERC20.sol");
const PancakeFactory = artifacts.require("./PancakeFactory.sol");
const PancakePair = artifacts.require("./PancakePair.sol");
const PancakeRouter = artifacts.require("./PancakeRouter.sol");
const WBNB = artifacts.require("./WBNB.sol");
const ERC20 = artifacts.require("./PancakeERC20.sol")

contract("PancakePair", ([alice, bob, carol, david, erin]) => {

    let pancakeRouter;
    let pancakeFactory;
    let wrappedBNB;

    let tokenVANVAN;
    let tokenVIVIAN;
    let tokenFEE;
    let tokenMEDIALFEE;
    let pairVANVI;
    let pairFEEMEDIAL;
    let pairVIMEDIAL;


    before(async () => {
        // d
        // Deploy ERC20s
        tokenVANVAN = await MockERC20.new("Token VANVAN", "VANVAN", parseEther("10000000"), { from: alice });
        tokenVIVIAN = await MockERC20.new("Token VIVIAN", "VIVIAN", parseEther("10000000"), { from: alice });
        tokenFEE = await MockERC20.new("Token FEE", "FEE", parseEther("5000"), { from: alice });
        tokenMEDIALFEE = await MockERC20.new("Token MEDIALFEE", "MEDIALFEE", parseEther("10000000"), { from: alice });


        // Deploy Factory
        pancakeFactory = await PancakeFactory.new(alice, bob, tokenFEE.address, tokenMEDIALFEE.address, "100000000000000000", "300000000000000000", { from: alice });

        console.log(await pancakeFactory.INIT_CODE_PAIR_HASH())

        // Deploy Wrapped BNB
        wrappedBNB = await WBNB.new({ from: alice });

        // Deploy Router
        pancakeRouter = await PancakeRouter.new(pancakeFactory.address, wrappedBNB.address, { from: alice });

        // // Deploy ZapV1
        // maxZapReverseRatio = 100; // 1%
        // pancakeZap = await PancakeZapV1.new(wrappedBNB.address, pancakeRouter.address, maxZapReverseRatio, { from: alice });


        // Create 3 LP tokens

        // pair VANVAN | VIVIAN
        let result = await pancakeFactory.createPair(tokenVANVAN.address, tokenVIVIAN.address, { from: alice });
        pairVANVI = await PancakePair.at(result.logs[0].args[2]);

        // pair FEE | MEDIALFEE
        result = await pancakeFactory.createPair(tokenFEE.address, tokenMEDIALFEE.address, { from: alice });
        pairFEEMEDIAL = await PancakePair.at(result.logs[0].args[2]);

        // pair VIVIAN | MEDIALFEE
        result = await pancakeFactory.createPair(tokenVIVIAN.address, tokenMEDIALFEE.address, { from: alice });
        pairVIMEDIAL = await PancakePair.at(result.logs[0].args[2]);


        await tokenVANVAN.mintTokens(parseEther("2000000"), { from: alice });
        await tokenVIVIAN.mintTokens(parseEther("2000000"), { from: alice });

        await tokenMEDIALFEE.mintTokens(parseEther("2000000"), { from: alice });

        // approve route
        await tokenVANVAN.approve(pancakeRouter.address, constants.MAX_UINT256, {
            from: alice,
        });

        await tokenVIVIAN.approve(pancakeRouter.address, constants.MAX_UINT256, {
            from: alice,
        });

        await tokenFEE.approve(pancakeRouter.address, constants.MAX_UINT256, {
            from: alice,
        });

        await tokenMEDIALFEE.approve(pancakeRouter.address, constants.MAX_UINT256, {
            from: alice,
        });
    });

    describe("Swap Router 3 path fee and pay with token in pool", async () => {
        it("User adds liquidity to LP tokens", async function () {
            const deadline = new BN(await time.latest()).add(new BN("100"));

            /* Add liquidity (Pancake Router)
             * address tokenB,
             * uint256 amountADesired,
             * uint256 amountBDesired,
             * uint256 amountAMin,
             * uint256 amountBMin,
             * address to,
             * uint256 deadline
             */

            await tokenFEE.transfer(pairVANVI.address, parseEther("1000"), { from: alice })

            // 1 VANVAN = 10 VIVIAN
            let result = await pancakeRouter.addLiquidity(
                tokenVANVAN.address,
                tokenVIVIAN.address,
                parseEther("100"), // 100 VANVAN
                parseEther("1000"), // 1000 VIVIAN
                parseEther("100"),
                parseEther("1000"),
                alice,
                deadline,
                { from: alice }
            );

            expectEvent.inTransaction(result.receipt.transactionHash, tokenVANVAN, "Transfer", {
                from: alice,
                to: pairVANVI.address,
                value: parseEther("100").toString(),
            });

            expectEvent.inTransaction(result.receipt.transactionHash, tokenVIVIAN, "Transfer", {
                from: alice,
                to: pairVANVI.address,
                value: parseEther("1000").toString(),
            });

            // assert.equal(String(await pairAC.totalSupply()), parseEther("1000000").toString());
            assert.equal(String(await tokenVANVAN.balanceOf(pairVANVI.address)), parseEther("100").toString());
            assert.equal(String(await tokenVIVIAN.balanceOf(pairVANVI.address)), parseEther("1000").toString());
            assert.equal(String(await tokenFEE.balanceOf(pairVANVI.address)), parseEther("1000").toString());

            // 1 MEDIAL = 10 FEE
            result = await pancakeRouter.addLiquidity(
                tokenMEDIALFEE.address,
                tokenFEE.address,
                parseEther("100"), // 100 token MEDIAL
                parseEther("1000"), // 1000 token FEE
                parseEther("100"),
                parseEther("1000"),
                alice,
                deadline,
                { from: alice }
            );

            expectEvent.inTransaction(result.receipt.transactionHash, tokenMEDIALFEE, "Transfer", {
                from: alice,
                to: pairFEEMEDIAL.address,
                value: parseEther("100").toString(),
            });

            expectEvent.inTransaction(result.receipt.transactionHash, tokenFEE, "Transfer", {
                from: alice,
                to: pairFEEMEDIAL.address,
                value: parseEther("1000").toString(),
            });

            // assert.equal(String(await pairAB.totalSupply()), parseEther("10000").toString());
            assert.equal(String(await tokenMEDIALFEE.balanceOf(pairFEEMEDIAL.address)), parseEther("100").toString());
            assert.equal(String(await tokenFEE.balanceOf(pairFEEMEDIAL.address)), parseEther("1000").toString());

            // 1 VIVIAN = 10 MEDIAL
            result = await pancakeRouter.addLiquidity(
                tokenVIVIAN.address,
                tokenMEDIALFEE.address,
                parseEther("100"), // 100 token VIVIAN
                parseEther("1000"), // 1000 token MEDIAL
                parseEther("100"),
                parseEther("1000"),
                alice,
                deadline,
                { from: alice }
            );

            expectEvent.inTransaction(result.receipt.transactionHash, tokenVIVIAN, "Transfer", {
                from: alice,
                to: pairVIMEDIAL.address,
                value: parseEther("100").toString(),
            });

            expectEvent.inTransaction(result.receipt.transactionHash, tokenMEDIALFEE, "Transfer", {
                from: alice,
                to: pairVIMEDIAL.address,
                value: parseEther("1000").toString(),
            });

            // assert.equal(String(await pairBC.totalSupply()), parseEther("10000").toString());
            assert.equal(String(await tokenVIVIAN.balanceOf(pairVIMEDIAL.address)), parseEther("100").toString());
            assert.equal(String(await tokenMEDIALFEE.balanceOf(pairVIMEDIAL.address)), parseEther("1000").toString());
        });

        it("Swap Router", async function () {
            const deadline = new BN(await time.latest()).add(new BN("100"));

            // approve pair
            await tokenFEE.approve(pairVANVI.address, constants.MAX_UINT256, {
                from: alice,
            });

            await pancakeRouter.echoDexSwapExactTokensForTokens(
                parseEther("100"), // 1 VANVAN
                parseEther("500"), // 9 VIVIAN
                [tokenVANVAN.address, tokenVIVIAN.address],
                alice,
                deadline,
                { from: alice }
            )

            assert.equal(String(await tokenVANVAN.balanceOf(pairVANVI.address)), parseEther("200").toString());
            assert.equal(String(await tokenVIVIAN.balanceOf(pairVANVI.address)), parseEther("500").toString());

            console.log(String(await tokenFEE.balanceOf(pairVANVI.address))) // 47.39 Fee
        })
    });


});