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

  // verify echodexV3Pool
  // console.log('Verify echodexV3Pool')
  // await verifyContract("0xEbc78d2b3C7982E9d4e4Bf6294E81B2cd9e0778b")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
