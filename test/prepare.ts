import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { artifacts, ethers } from "hardhat";

export const MAX_INT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
export const FEE_DENOMINATOR = BigNumber.from("10000")

export async function deployTokens() {
    const accounts = await ethers.getSigners();
    const sender = accounts[0]

    // Deploy ERC20s
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.connect(sender).deploy("USDT", "USDT", "100000000000000000000000000");
    const btc = await MockERC20.connect(sender).deploy("BTC", "BTC", "100000000000000000000000000");
    const ecp = await MockERC20.connect(sender).deploy("ECP", "ECP", "100000000000000000000000000");
    const xecp = await MockERC20.connect(sender).deploy("XECP", "XECP", "100000000000000000000000000");

    return {
        usdt,
        btc,
        ecp,
        xecp
    }
}

export async function deployExchange(ecp: Contract, xecp: Contract) {
    const accounts = await ethers.getSigners();
    const sender = accounts[0]
    const receiveFeeAddress = accounts[5]
    // Deploy Factory
    const Factory = await ethers.getContractFactory("EchodexFactory");
    const factory = await Factory.connect(sender).deploy(receiveFeeAddress.address, ecp.address, xecp.address);

    // console.log("INIT_CODE_PAIR_HASH:", await factory.INIT_CODE_PAIR_HASH());

    // Deploy WETH
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.connect(sender).deploy();
    // Deploy Router
    const EchodexRouter = await ethers.getContractFactory("EchodexRouter");
    const router = await EchodexRouter.connect(sender).deploy(factory.address, weth.address);
    // Deploy Router fee
    const EchodexRouterFee = await ethers.getContractFactory("EchodexRouterFee");
    const routerFee = await EchodexRouterFee.connect(sender).deploy(factory.address, weth.address);
    //Deploy Farm
    const EchodexFarm = await ethers.getContractFactory("EchodexFarm");
    const echodexFarm = await EchodexFarm.connect(sender).deploy(factory.address, weth.address);
    return {
        factory,
        weth,
        router,
        routerFee,
        echodexFarm
    }
}

export async function addLiquidity(sender: SignerWithAddress, router: Contract, tokenA: Contract, tokenB: Contract, amountA: BigNumber, amountB: BigNumber) {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1 * 60 * 60; // 1 hour
    await tokenA.connect(sender).approve(router.address, MAX_INT);
    await tokenB.connect(sender).approve(router.address, MAX_INT);

    const tx = await router.connect(sender).addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        amountA,
        amountB,
        sender.address,
        deadline
    );

    const receipt = await tx.wait();
    return receipt;
}

export async function calcOutputAmount(pair: Contract, tokenIn: Contract, amountIn: BigNumber) {
    // EXAMPLE: reserveIn = 30, reserveOut = 749270.4, amountIn = 1
    // numerator = 1 * 749270.4 = 749270.4
    // denominator = 30 + 1 = 31
    // amountOut = 749270.4 / 31 = 24140.97

    const reserves = await pair.getReserves();
    const token0 = await pair.token0();

    const reserveIn = token0 == tokenIn.address ? reserves[0] : reserves[1];
    const reserveOut = token0 == tokenIn.address ? reserves[1] : reserves[0];

    const numerator = amountIn.mul(reserveOut);
    const denominator = reserveIn.add(amountIn);
    const amountOut = numerator.div(denominator);
    return amountOut;
}

export async function calcAmountFee(factory: Contract, tokenOut: Contract, amountOut: BigNumber, percent: BigNumber = BigNumber.from("10")) { // default 0.1%
    const feePathLength = await factory.feePathLength(tokenOut.address);
    let result = amountOut.mul(percent).div(FEE_DENOMINATOR);
    for (let i = 0; i < feePathLength.toNumber() - 1; i++) {
        const token0 = await factory.feePath(tokenOut.address, i);
        const token1 = await factory.feePath(tokenOut.address, i + 1);
        const pairAddress = await factory.getPair(token0, token1);
        const pairArtifact = await artifacts.readArtifact("EchodexPair");
        const accounts = await ethers.getSigners();
        const pair = new ethers.Contract(pairAddress, pairArtifact.abi, accounts[0]);

        const erc20ABI = (await artifacts.readArtifact("MockERC20")).abi
        const tokenIn = new ethers.Contract(token0, erc20ABI, accounts[0]);

        result = await calcOutputAmount(pair, tokenIn, result);
    }

    return result;
}