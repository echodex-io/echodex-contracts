import { assert } from "chai";
import { ethers, network } from "hardhat";
import { time, mineUpTo, reset } from "@nomicfoundation/hardhat-network-helpers";
import { TickMath } from "@uniswap/v3-sdk";

import EchodexV3PoolDeployerArtifact from "@echodex/v3-core/artifacts/contracts/EchodexV3PoolDeployer.sol/EchodexV3PoolDeployer.json";
import EchodexV3FactoryArtifact from "@echodex/v3-core/artifacts/contracts/EchodexV3Factory.sol/EchodexV3Factory.json";
// import EchodexV3FactoryOwnerArtifact from "@echodex/v3-core/artifacts/contracts/EchodexV3FactoryOwner.sol/EchodexV3FactoryOwner.json";
import EchodexV3SwapRouterArtifact from "@echodex/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import NftDescriptorOffchainArtifact from "@echodex/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptorOffChain.sol/NonfungibleTokenPositionDescriptorOffChain.json";
import NonfungiblePositionManagerArtifact from "@echodex/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import EchodexV3LmPoolDeployerArtifact from "@echodex/v3-lm-pool/artifacts/contracts/EchodexV3LmPoolDeployer.sol/EchodexV3LmPoolDeployer.json";
import TestLiquidityAmountsArtifact from "@echodex/v3-periphery/artifacts/contracts/test/LiquidityAmountsTest.sol/LiquidityAmountsTest.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import ERC20MockArtifact from "./ERC20Mock.json";
import XECPTokenArtifact from "./xECP.json";

const WETH9Address = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const nativeCurrencyLabel = "tBNB";
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("EchodexFarmingV3", function () {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  before(async function () {
    [admin, user1, user2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    reset();

    // Deploy factory
    const EchodexV3PoolDeployer = await ethers.getContractFactoryFromArtifact(EchodexV3PoolDeployerArtifact);
    const echodexV3PoolDeployer = await EchodexV3PoolDeployer.deploy();

    const EchodexV3Factory = await ethers.getContractFactoryFromArtifact(EchodexV3FactoryArtifact);
    const echodexV3Factory = await EchodexV3Factory.deploy(echodexV3PoolDeployer.address);

    await echodexV3PoolDeployer.setFactoryAddress(echodexV3Factory.address);

    const EchodexV3SwapRouter = await ethers.getContractFactoryFromArtifact(EchodexV3SwapRouterArtifact);
    const echodexV3SwapRouter = await EchodexV3SwapRouter.deploy(
      echodexV3PoolDeployer.address,
      echodexV3Factory.address,
      WETH9Address
    );

    // Deploy NFT position descriptor
    // const NonfungibleTokenPositionDescriptor = await ethers.getContractFactoryFromArtifact(
    //   NftDescriptorOffchainArtifact
    // );
    // const baseTokenUri = "https://nft.echodex.com/v3/";
    // const nonfungibleTokenPositionDescriptor = await upgrades.deployProxy(NonfungibleTokenPositionDescriptor, [
    //   baseTokenUri,
    // ]);
    // await nonfungibleTokenPositionDescriptor.deployed();
    // TODO:
    await EchodexV3SwapRouter.deploy(echodexV3PoolDeployer.address, echodexV3Factory.address, WETH9Address);

    // Deploy NFT position manager
    const NonfungiblePositionManager = await ethers.getContractFactoryFromArtifact(NonfungiblePositionManagerArtifact);
    const nonfungiblePositionManager = await NonfungiblePositionManager.deploy(
      echodexV3PoolDeployer.address,
      echodexV3Factory.address,
      WETH9Address,
      // nonfungibleTokenPositionDescriptor.address
      ethers.constants.AddressZero
    );

    const ERC20Mock = await ethers.getContractFactoryFromArtifact(ERC20MockArtifact);

    // Deploy factory owner contract
    // const EchodexV3FactoryOwner = await ethers.getContractFactoryFromArtifact(EchodexV3FactoryOwnerArtifact);
    // const echodexV3FactoryOwner = await EchodexV3FactoryOwner.deploy(echodexV3Factory.address);
    // await echodexV3Factory.setOwner(echodexV3FactoryOwner.address);

    // Prepare for master chef v3
    const XECPToken = await ethers.getContractFactoryFromArtifact(XECPTokenArtifact);
    const xecpToken = await XECPToken.deploy(NULL_ADDRESS);

    const lpTokenV1 = await ERC20Mock.deploy("LP Token V1", "LPV1");
    const dummyTokenV2 = await ERC20Mock.deploy("Dummy Token V2", "DTV2");

    await dummyTokenV2.mint(admin.address, ethers.utils.parseUnits("1000"));

    const lpTokenV2 = await ERC20Mock.deploy("LP Token V2", "LPV2");
    const dummyTokenV3 = await ERC20Mock.deploy("Dummy Token V3", "DTV3");

    // Deploy master chef v3
    const EchodexFarmingV3 = await ethers.getContractFactory("EchodexFarmingV3");
    const echodexFarmingV3 = await EchodexFarmingV3.deploy(
      xecpToken.address,
      nonfungiblePositionManager.address,
      WETH9Address
    );

    await dummyTokenV3.mint(admin.address, ethers.utils.parseUnits("1000"));
    const firstFarmingBlock = await time.latestBlock();

    const EchodexV3LmPoolDeployer = await ethers.getContractFactoryFromArtifact(EchodexV3LmPoolDeployerArtifact);
    const echodexV3LmPoolDeployer = await EchodexV3LmPoolDeployer.deploy(
      echodexFarmingV3.address
      // echodexV3FactoryOwner.address
    );
    // await echodexV3FactoryOwner.setLmPoolDeployer(echodexV3LmPoolDeployer.address);
    await echodexV3Factory.setLmPoolDeployer(echodexV3LmPoolDeployer.address);
    await echodexFarmingV3.setLMPoolDeployer(echodexV3LmPoolDeployer.address);

    // Deploy mock ERC20 tokens
    const tokenA = await ERC20Mock.deploy("Token A", "A");
    const tokenB = await ERC20Mock.deploy("Token B", "B");
    const tokenC = await ERC20Mock.deploy("Token C", "C");
    const tokenD = await ERC20Mock.deploy("Token D", "D");

    await tokenA.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenA.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenA.mint(user2.address, ethers.utils.parseUnits("1000"));
    await tokenB.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenB.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenB.mint(user2.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(user2.address, ethers.utils.parseUnits("1000"));
    await tokenD.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenD.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenD.mint(user2.address, ethers.utils.parseUnits("1000"));

    await tokenA.connect(admin).approve(echodexV3SwapRouter.address, ethers.constants.MaxUint256);
    await tokenB.connect(admin).approve(echodexV3SwapRouter.address, ethers.constants.MaxUint256);
    await tokenC.connect(admin).approve(echodexV3SwapRouter.address, ethers.constants.MaxUint256);
    await tokenD.connect(admin).approve(echodexV3SwapRouter.address, ethers.constants.MaxUint256);

    await tokenA.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenB.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenC.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenD.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenA.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenB.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenC.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenD.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);

    await tokenA.connect(user1).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenB.connect(user1).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenC.connect(user1).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenD.connect(user1).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenA.connect(user2).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenB.connect(user2).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenC.connect(user2).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await tokenD.connect(user2).approve(echodexFarmingV3.address, ethers.constants.MaxUint256);

    // Create pools
    const pools = [
      {
        token0: tokenA.address < tokenB.address ? tokenA.address : tokenB.address,
        token1: tokenB.address > tokenA.address ? tokenB.address : tokenA.address,
        fee: 500,
        initSqrtPriceX96: ethers.BigNumber.from("2").pow(96),
      },
      {
        token0: tokenC.address < tokenD.address ? tokenC.address : tokenD.address,
        token1: tokenD.address > tokenC.address ? tokenD.address : tokenC.address,
        fee: 500,
        initSqrtPriceX96: ethers.BigNumber.from("2").pow(96),
      },
    ];
    const poolAddresses = await Promise.all(
      pools.map(async (p) => {
        const receipt = await (
          await nonfungiblePositionManager.createAndInitializePoolIfNecessary(
            p.token0,
            p.token1,
            p.fee,
            p.initSqrtPriceX96
          )
        ).wait();
        const [, address] = ethers.utils.defaultAbiCoder.decode(["int24", "address"], receipt.logs[0].data);
        return address;
      })
    );

    // Farm 1 month in advance and then upkeep
    // await mineUpTo(firstFarmingBlock + 30 * 24 * 60 * 60);
    // await xecpToken.mint(admin.address, ethers.utils.parseUnits(`${4 * 24 * 60 * 60}`));
    // const cakeFarmed = await xecpToken.balanceOf(admin.address);
    // console.log(`${ethers.utils.formatUnits(cakeFarmed)} CAKE farmed`);
    
    await xecpToken.mintReward(admin.address, ethers.utils.parseUnits(`${4 * 24 * 60 * 60}`));
    await xecpToken.approve(echodexFarmingV3.address, ethers.constants.MaxUint256);
    await echodexFarmingV3.setReceiver(admin.address);
    await echodexFarmingV3.upkeep(ethers.utils.parseUnits(`${4 * 24 * 60 * 60}`), 24 * 60 * 60, true);

    const LiquidityAmounts = await ethers.getContractFactoryFromArtifact(TestLiquidityAmountsArtifact);
    const liquidityAmounts = await LiquidityAmounts.deploy();

    this.nonfungiblePositionManager = nonfungiblePositionManager;
    this.echodexFarmingV3 = echodexFarmingV3;
    this.pools = pools;
    this.poolAddresses = poolAddresses;
    this.xecpToken = xecpToken;
    this.liquidityAmounts = liquidityAmounts;
    this.swapRouter = echodexV3SwapRouter;

    await network.provider.send("evm_setAutomine", [false]);
  });

  afterEach(async function () {
    await network.provider.send("evm_setAutomine", [true]);
  });

  describe("Real world user flow", function () {
    context("when there are 2 users and 2 pools with no trading", function () {
      it("should executed successfully", async function () {
        // 1
        await time.increase(1);

        // 2
        await this.echodexFarmingV3.add(1, this.poolAddresses[0], true);

        await time.increase(1);

        // 3
        await this.echodexFarmingV3.updatePools([1]);

        await this.echodexFarmingV3.add(3, this.poolAddresses[1], true);

        await time.increase(1);

        // 4
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("1"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 1);

        await time.increase(1);

        // 5
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 2);

        await time.increase(1);

        let cakeUser1;
        let cakeUser2;

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));

        console.log("@5 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 6
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 3);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@6 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 7
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(3));

        console.log("@7 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 8
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("1"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 4);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@8 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 9
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.set(1, 3, true);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@9 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 10
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@10 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 11
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@11 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 12
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@12 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 13
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@13 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 14
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user2).increaseLiquidity({
          tokenId: 4,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@14 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 15
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).withdraw(1, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@15 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 16
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.set(2, 0, true);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@16 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 17
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user2).decreaseLiquidity({
          tokenId: 4,
          liquidity: await this.liquidityAmounts.getLiquidityForAmounts(
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(0))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(-100))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(100))),
            ethers.utils.parseUnits("1"),
            ethers.utils.parseUnits("1")
          ),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@17 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 18
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 5);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@18 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 19
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.set(2, 2, true);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@19 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 20
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).withdraw(5, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@20 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 21
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user2).withdraw(3, user2.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@21 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 22
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).withdraw(2, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@22 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 23
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user2).withdraw(4, user2.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4));

        console.log("@23 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 24
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("1"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 6);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6));

        console.log("@24 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 25
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 7);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6));

        console.log("@25 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 26
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 8);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6));

        console.log("@26 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 27
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6));

        console.log("@27 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 28
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("10"),
          amount1Desired: ethers.utils.parseUnits("10"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 9);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@28 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 29
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.upkeep(0, 2 * 24 * 60 * 60, true);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@29 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 30
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@30 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 31
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@31 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 32
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@32 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 33
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).increaseLiquidity({
          tokenId: 8,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@33 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 34
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@34 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 35
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).decreaseLiquidity({
          tokenId: 7,
          liquidity: await this.liquidityAmounts.getLiquidityForAmounts(
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(0))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(-100))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(100))),
            ethers.utils.parseUnits("1"),
            ethers.utils.parseUnits("1")
          ),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@35 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 36
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@36 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 37
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user2).increaseLiquidity({
          tokenId: 6,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@37 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 38
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.upkeep(ethers.utils.parseUnits(`${0}`), 24 * 60 * 60, true);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@38 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 39
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).withdraw(8, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@39 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 40
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@40 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 41
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user2).decreaseLiquidity({
          tokenId: 9,
          liquidity: await this.liquidityAmounts.getLiquidityForAmounts(
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(0))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(-100))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(100))),
            ethers.utils.parseUnits("0"),
            ethers.utils.parseUnits("0")
          ),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@41 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 42
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@42 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 43
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@43 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 44
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("3"),
          amount1Desired: ethers.utils.parseUnits("3"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 10);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@44 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 45
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.echodexFarmingV3.connect(user1).withdraw(7, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9));

        console.log("@45 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 46
        await this.echodexFarmingV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 11);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@46 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 47
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@47 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 48
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@48 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 49
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@49 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 50
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@50 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 51
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@51 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 52
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@52 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 53
        await this.echodexFarmingV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address))
          .add(await this.echodexFarmingV3.pendingXECP(1))
          .add(await this.echodexFarmingV3.pendingXECP(2))
          .add(await this.echodexFarmingV3.pendingXECP(5))
          .add(await this.echodexFarmingV3.pendingXECP(7))
          .add(await this.echodexFarmingV3.pendingXECP(8))
          .add(await this.echodexFarmingV3.pendingXECP(10));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address))
          .add(await this.echodexFarmingV3.pendingXECP(3))
          .add(await this.echodexFarmingV3.pendingXECP(4))
          .add(await this.echodexFarmingV3.pendingXECP(6))
          .add(await this.echodexFarmingV3.pendingXECP(9))
          .add(await this.echodexFarmingV3.pendingXECP(11));

        console.log("@53 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        assert(cakeUser1.sub(ethers.utils.parseUnits("57.68974359")).abs().lte(ethers.utils.parseUnits("0.1")));
        assert(cakeUser2.sub(ethers.utils.parseUnits("105.3102564")).abs().lte(ethers.utils.parseUnits("0.1")));
      });
    });

    context("when there are 2 users and 1 pool with different range positions", function () {
      it("should executed successfully", async function () {
        // 1
        await time.increase(1);

        // 2
        await this.echodexFarmingV3.add(1, this.poolAddresses[0], true);

        await time.increase(1);

        // 3
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        // 4
        await this.echodexFarmingV3.updatePools([1]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -10000,
          tickUpper: 10000,
          amount0Desired: ethers.BigNumber.from("999999999999999999"),
          amount1Desired: ethers.BigNumber.from("999999999999999999"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 1);

        await time.increase(1);

        // 5
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        let cakeUser1;
        let cakeUser2;

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));

        console.log("@5 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 6
        await this.echodexFarmingV3.updatePools([1]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -1000,
          tickUpper: 1000,
          amount0Desired: ethers.BigNumber.from("999999999999999999"),
          amount1Desired: ethers.BigNumber.from("999999999999999999"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 2);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));

        console.log("@6 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 7
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@7 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 8
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@8 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 9
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@9 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 10
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@10 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 11
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@11 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 12
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@12 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 13
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@13 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 14
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@14 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 15
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@15 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 16
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@16 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 17
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@17 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 18
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@18 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 19
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@19 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 20
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@20 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 21
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@21 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 22
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@22 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 23
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@23 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 24
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@24 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 25
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@25 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 26
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@26 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 27
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@27 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 28
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@28 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 29
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@29 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 30
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@30 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 31
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@31 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 32
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@32 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 33
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@33 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 34
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@34 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 35
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@35 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 36
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@36 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 37
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@37 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 38
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@38 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 39
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@39 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 40
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@40 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 41
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@41 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 42
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@42 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 43
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@43 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 44
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@44 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 45
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@45 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 46
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@46 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 47
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@47 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 48
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@48 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 49
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@49 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 50
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@50 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 51
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@51 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 52
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@52 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 53
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@53 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        assert(cakeUser1.sub(ethers.utils.parseUnits("28.73260345")).abs().lte(ethers.utils.parseUnits("0.0000001")));
        assert(cakeUser2.sub(ethers.utils.parseUnits("167.2673966")).abs().lte(ethers.utils.parseUnits("0.0000001")));
      });
    });

    context("when there are 2 users and 1 pool with different range positions", function () {
      it("should executed successfully", async function () {
        // 1
        await time.increase(1);

        // 2
        await this.echodexFarmingV3.add(1, this.poolAddresses[0], true);

        await time.increase(1);

        // 3
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        // 4
        await this.echodexFarmingV3.updatePools([1]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -10000,
          tickUpper: 10000,
          amount0Desired: ethers.BigNumber.from("1000000000000000000"),
          amount1Desired: ethers.BigNumber.from("1000000000000000000"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.echodexFarmingV3.address, 1);

        await time.increase(1);

        // 5
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        let cakeUser1;
        let cakeUser2;

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));

        console.log("@5 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 6
        await this.echodexFarmingV3.updatePools([1]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -1000,
          tickUpper: 1000,
          amount0Desired: ethers.BigNumber.from("999999999999999999"),
          amount1Desired: ethers.BigNumber.from("999999999999999999"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.echodexFarmingV3.address, 2);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));

        console.log("@6 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 7
        await this.echodexFarmingV3.updatePools([1]);

        await this.swapRouter.exactInputSingle({
          tokenIn: this.pools[0].token0,
          tokenOut: this.pools[0].token1,
          fee: this.pools[0].fee,
          amountIn: ethers.utils.parseUnits("1"),
          amountOutMinimum: ethers.constants.Zero,
          sqrtPriceLimitX96: ethers.constants.Zero,
          recipient: admin.address,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@7 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 8
        await this.echodexFarmingV3.updatePools([1]);

        await this.echodexFarmingV3.connect(user1).increaseLiquidity({
          tokenId: 1,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("0.805563891162833934"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@8 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 9
        await this.echodexFarmingV3.updatePools([1]);

        await this.swapRouter.exactInputSingle({
          tokenIn: this.pools[0].token0,
          tokenOut: this.pools[0].token1,
          fee: this.pools[0].fee,
          amountIn: ethers.utils.parseUnits("1"),
          amountOutMinimum: ethers.constants.Zero,
          sqrtPriceLimitX96: ethers.constants.Zero,
          recipient: admin.address,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@9 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 10
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@10 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 11
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@11 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 12
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@12 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 13
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@13 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 14
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@14 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 15
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@15 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 16
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@16 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 17
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@17 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 18
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@18 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 19
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@19 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 20
        await this.echodexFarmingV3.updatePools([1]);

        await this.swapRouter.exactInputSingle({
          tokenIn: this.pools[0].token1,
          tokenOut: this.pools[0].token0,
          fee: this.pools[0].fee,
          amountIn: ethers.utils.parseUnits("1.5"),
          amountOutMinimum: ethers.constants.Zero,
          sqrtPriceLimitX96: ethers.constants.Zero,
          recipient: admin.address,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@20 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 21
        await this.echodexFarmingV3.updatePools([1]);

        await this.echodexFarmingV3.connect(user2).increaseLiquidity({
          tokenId: 2,
          amount0Desired: ethers.utils.parseUnits("0.999999999999999999"),
          amount1Desired: ethers.utils.parseUnits("0.545748338215849399"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@21 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 22
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@22 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 23
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@23 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 24
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@24 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 25
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@25 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 26
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@26 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 27
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@27 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 28
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@28 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 29
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@29 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 30
        await this.echodexFarmingV3.updatePools([1]);

        await this.echodexFarmingV3.connect(user1).increaseLiquidity({
          tokenId: 1,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("0.929584593669192594"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@30 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 31
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@31 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 32
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@32 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 33
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@33 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 34
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@34 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 35
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@35 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 36
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@36 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 37
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@37 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 38
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@38 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 39
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@39 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 40
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@40 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 41
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@41 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 42
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@42 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 43
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@43 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 44
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@44 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 45
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@45 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 46
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@46 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 47
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@47 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 48
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@48 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 49
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@49 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 50
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@50 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 51
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@51 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 52
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@52 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 53
        await this.echodexFarmingV3.updatePools([1]);

        await time.increase(1);

        cakeUser1 = (await this.xecpToken.balanceOf(user1.address)).add(await this.echodexFarmingV3.pendingXECP(1));
        cakeUser2 = (await this.xecpToken.balanceOf(user2.address)).add(await this.echodexFarmingV3.pendingXECP(2));

        console.log("@53 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        assert(cakeUser1.sub(ethers.utils.parseUnits("73.99948783")).abs().lte(ethers.utils.parseUnits("0.0000001")));
        assert(cakeUser2.sub(ethers.utils.parseUnits("122.0005122")).abs().lte(ethers.utils.parseUnits("0.0000001")));
      });
    });
  });
});
