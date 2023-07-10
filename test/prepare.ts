import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "ethers";
import { artifacts, ethers } from "hardhat";
import { ERC20, EchodexFactory, EchodexRouter, EchodexRouterFee, MockERC20 } from "../typechain-types";

export const MAX_INT = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
export const FEE_DENOMINATOR = 10000n

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

export async function deployExchange(ecpAddress: string, xecpAddress: string) {
    const accounts = await ethers.getSigners();
    const sender = accounts[0]
    const receiveFeeAddress = accounts[5]
    // Deploy Factory
    const Factory = await ethers.getContractFactory("EchodexFactory");
    const factory = await Factory.connect(sender).deploy(receiveFeeAddress.address, ecpAddress, xecpAddress);
    const factoryAddress = await factory.getAddress()

    // console.log("INIT_CODE_PAIR_HASH:", await factory.INIT_CODE_PAIR_HASH());

    // Deploy WETH
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.connect(sender).deploy();
    const wethAddress = await weth.getAddress()
    // Deploy Router
    const EchodexRouter = await ethers.getContractFactory("EchodexRouter");
    const router = await EchodexRouter.connect(sender).deploy(factoryAddress, wethAddress);
    // Deploy Router fee
    const EchodexRouterFee = await ethers.getContractFactory("EchodexRouterFee");
    const routerFee = await EchodexRouterFee.connect(sender).deploy(factoryAddress, wethAddress);
    //Deploy Farm
    const EchodexFarm = await ethers.getContractFactory("EchodexFarm");
    const echodexFarm = await EchodexFarm.connect(sender).deploy(factoryAddress, wethAddress);
    return {
        factory,
        weth,
        router,
        routerFee,
        echodexFarm
    }
}

export async function addLiquidity(router: EchodexRouter | EchodexRouterFee, tokenA: ERC20, tokenB: ERC20, amountA: bigint, amountB: bigint) {
    const accounts = await ethers.getSigners()
    const sender = accounts[0]
    const lastBlock = await ethers.provider.getBlock("latest")
    const deadline = BigInt(lastBlock ? lastBlock.timestamp + 1 * 60 * 60 : 0)
    await tokenA.connect(sender).approve((await router.getAddress()), MAX_INT);
    await tokenB.connect(sender).approve((await router.getAddress()), MAX_INT);

    const tx = await router.connect(sender).addLiquidity(
        (await tokenA.getAddress()),
        (await tokenA.getAddress()),
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

export async function calcOutputAmount(pair: Contract, tokenInAddress: string, amountIn: bigint) {
    // EXAMPLE: reserveIn = 30, reserveOut = 749270.4, amountIn = 1
    // numerator = 1 * 749270.4 = 749270.4
    // denominator = 30 + 1 = 31
    // amountOut = 749270.4 / 31 = 24140.97

    const reserves = await pair.getReserves();
    const token0 = await pair.token0();

    const reserveIn = token0 == tokenInAddress ? reserves[0] : reserves[1];
    const reserveOut = token0 == tokenInAddress ? reserves[1] : reserves[0];

    const numerator = amountIn * reserveOut
    const denominator = reserveIn + amountIn;
    const amountOut = numerator / denominator
    return amountOut;
}

export async function calcInputAmount(pair: Contract, tokenOutAddress: string, amountOut: bigint) {
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();

    const reserveIn = token0 == tokenOutAddress ? reserves[1] : reserves[0];
    const reserveOut = token0 == tokenOutAddress ? reserves[0] : reserves[1];

    const numerator = amountOut * reserveIn
    const denominator = reserveOut.sub(amountOut);

    const amountIn = numerator / denominator + 1n;

    return amountIn;
}

export async function calcAmountFee(factory: EchodexFactory, tokenOutAddress: string, amountOut: bigint, percent: bigint = 10n) { // default 0.1%
    const feePathLength = await factory.feePathLength(tokenOutAddress);
    let result = amountOut * percent / FEE_DENOMINATOR
    for (let i = 0n; i < feePathLength - 1n; i++) {
        const token0 = await factory.feePath(tokenOutAddress, i);
        const token1 = await factory.feePath(tokenOutAddress, i + 1n);
        const pairAddress = await factory.getPair(token0, token1);
        const pairArtifact = await artifacts.readArtifact("EchodexPair");
        const accounts = await ethers.getSigners();
        const pair = new ethers.Contract(pairAddress, pairArtifact.abi, accounts[0]);

        result = await calcOutputAmount(pair, token0, result);
    }

    return result;
}