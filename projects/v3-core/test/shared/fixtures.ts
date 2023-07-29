import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { MockTimeEchodexV3Pool } from '../../typechain-types/contracts/test/MockTimeEchodexV3Pool'
import { TestERC20 } from '../../typechain-types/contracts/test/TestERC20'
import { EchodexV3Factory } from '../../typechain-types/contracts/EchodexV3Factory'
import { EchodexV3PoolDeployer } from '../../typechain-types/contracts/EchodexV3PoolDeployer'
import { TestEchodexV3Callee } from '../../typechain-types/contracts/test/TestEchodexV3Callee'
import { TestEchodexV3Router } from '../../typechain-types/contracts/test/TestEchodexV3Router'
import { MockTimeEchodexV3PoolDeployer } from '../../typechain-types/contracts/test/MockTimeEchodexV3PoolDeployer'
import EchodexV3LmPoolArtifact from '@echodex/v3-lm-pool/artifacts/contracts/EchodexV3LmPool.sol/EchodexV3LmPool.json'

import { Fixture } from 'ethereum-waffle'

interface FactoryFixture {
  factory: EchodexV3Factory
}

interface DeployerFixture {
  deployer: EchodexV3PoolDeployer
}

async function factoryFixture(): Promise<FactoryFixture> {
  const { deployer } = await deployerFixture()
  const factoryFactory = await ethers.getContractFactory('EchodexV3Factory')
  const factory = (await factoryFactory.deploy(deployer.address)) as EchodexV3Factory
  return { factory }
}
async function deployerFixture(): Promise<DeployerFixture> {
  const deployerFactory = await ethers.getContractFactory('EchodexV3PoolDeployer')
  const deployer = (await deployerFactory.deploy()) as EchodexV3PoolDeployer
  return { deployer }
}

interface TokensFixture {
  token0: TestERC20
  token1: TestERC20
  token2: TestERC20
}

async function tokensFixture(): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory('TestERC20')
  const tokenA = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  const tokenB = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  const tokenC = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20

  const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort((tokenA, tokenB) =>
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
  )

  return { token0, token1, token2 }
}

type TokensAndFactoryFixture = FactoryFixture & TokensFixture

interface PoolFixture extends TokensAndFactoryFixture {
  swapTargetCallee: TestEchodexV3Callee
  swapTargetRouter: TestEchodexV3Router
  createPool(
    fee: number,
    tickSpacing: number,
    firstToken?: TestERC20,
    secondToken?: TestERC20
  ): Promise<MockTimeEchodexV3Pool>
}

// Monday, October 5, 2020 9:00:00 AM GMT-05:00
export const TEST_POOL_START_TIME = 1601906400

export const poolFixture: Fixture<PoolFixture> = async function (): Promise<PoolFixture> {
  const { factory } = await factoryFixture()
  const { token0, token1, token2 } = await tokensFixture()

  const MockTimeEchodexV3PoolDeployerFactory = await ethers.getContractFactory('MockTimeEchodexV3PoolDeployer')
  const MockTimeEchodexV3PoolFactory = await ethers.getContractFactory('MockTimeEchodexV3Pool')

  const calleeContractFactory = await ethers.getContractFactory('TestEchodexV3Callee')
  const routerContractFactory = await ethers.getContractFactory('TestEchodexV3Router')

  const swapTargetCallee = (await calleeContractFactory.deploy()) as TestEchodexV3Callee
  const swapTargetRouter = (await routerContractFactory.deploy()) as TestEchodexV3Router

  const EchodexV3LmPoolFactory = await ethers.getContractFactoryFromArtifact(EchodexV3LmPoolArtifact)

  return {
    token0,
    token1,
    token2,
    factory,
    swapTargetCallee,
    swapTargetRouter,
    createPool: async (fee, tickSpacing, firstToken = token0, secondToken = token1) => {
      const mockTimePoolDeployer =
        (await MockTimeEchodexV3PoolDeployerFactory.deploy()) as MockTimeEchodexV3PoolDeployer
      const tx = await mockTimePoolDeployer.deploy(
        factory.address,
        firstToken.address,
        secondToken.address,
        fee,
        tickSpacing
      )

      const receipt = await tx.wait()
      const poolAddress = receipt.events?.[0].args?.pool as string

      const mockTimeEchodexV3Pool = MockTimeEchodexV3PoolFactory.attach(poolAddress) as MockTimeEchodexV3Pool

      await (
        await factory.setLmPool(
          poolAddress,
          (
            await EchodexV3LmPoolFactory.deploy(
              poolAddress,
              ethers.constants.AddressZero,
              Math.floor(Date.now() / 1000)
            )
          ).address
        )
      ).wait()

      return mockTimeEchodexV3Pool
    },
  }
}
