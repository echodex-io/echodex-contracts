import { verifyContract } from '@echodex/common/verify'
import { sleep } from '@echodex/common/sleep'
import { network } from 'hardhat'

async function main() {
  const networkName = network.name
  const deployedContracts = await import(`@echodex/v3-core/deployments/${networkName}.json`)

  // Verify EchodexV3PoolDeployer
  console.log('Verify EchodexV3PoolDeployer')
  await verifyContract(deployedContracts.EchodexV3PoolDeployer)
  await sleep(10000)

  // Verify echodexV3Factory
  console.log('Verify echodexV3Factory')
  await verifyContract(deployedContracts.EchodexV3Factory, [deployedContracts.EchodexV3PoolDeployer])
  await sleep(10000)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
