import { verifyContract } from '@echodex/common/verify'
import { sleep } from '@echodex/common/sleep'
import { configs } from '@echodex/common/config'

async function main() {
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }
  const deployedContracts_v3_core = await import(`@echodex/v3-core/deployments/${networkName}.json`)
  const deployedContracts_v3_periphery = await import(`@echodex/v3-periphery/deployments/${networkName}.json`)
  const deployedContracts_smart_router = await import(`@echodex/smart-router/deployments/${networkName}.json`)

  // Verify SmartRouterHelper
  console.log('Verify SmartRouterHelper')
  await verifyContract(deployedContracts_smart_router.SmartRouterHelper)
  await sleep(10000)

  // Verify swapRouter
  console.log('Verify swapRouter')
  await verifyContract(deployedContracts_smart_router.SmartRouter, [
    config.v2Factory,
    deployedContracts_v3_core.EchodexV3PoolDeployer,
    deployedContracts_v3_core.EchodexV3Factory,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
    config.stableFactory,
    config.stableInfo,
    config.WNATIVE,
  ])
  await sleep(10000)

  // Verify mixedRouteQuoterV1
  console.log('Verify mixedRouteQuoterV1')
  await verifyContract(deployedContracts_smart_router.MixedRouteQuoterV1, [
    deployedContracts_v3_core.EchodexV3PoolDeployer,
    deployedContracts_v3_core.EchodexV3Factory,
    config.v2Factory,
    config.stableFactory,
    config.WNATIVE,
  ])
  await sleep(10000)

  // Verify quoterV2
  console.log('Verify quoterV2')
  await verifyContract(deployedContracts_smart_router.QuoterV2, [
    deployedContracts_v3_core.EchodexV3PoolDeployer,
    deployedContracts_v3_core.EchodexV3Factory,
    config.WNATIVE,
  ])
  await sleep(10000)

  // Verify tokenValidator
  console.log('Verify tokenValidator')
  await verifyContract(deployedContracts_smart_router.TokenValidator, [
    config.v2Factory,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
  ])
  await sleep(10000)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
