import { ethers, network } from 'hardhat'
import { configs } from '@echodex/common/config'
import { tryVerify } from '@echodex/common/verify'
import fs from 'fs'
import { abi } from '@echodex/v3-core/artifacts/contracts/EchodexV3Factory.sol/EchodexV3Factory.json'

import { parseEther } from 'ethers/lib/utils'
const currentNetwork = network.name

async function main() {
  const [owner] = await ethers.getSigners()
  // Remember to update the init code hash in SC for different chains before deploying
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const v3DeployedContracts = await import(`@echodex/v3-core/deployments/${networkName}.json`)
  const mcV3DeployedContracts = await import(`@echodex/masterchef-v3/deployments/${networkName}.json`)

  const echodexV3Factory_address = v3DeployedContracts.EchodexV3Factory

  const EchodexV3LmPoolDeployer = await ethers.getContractFactory('EchodexV3LmPoolDeployer')
  const echodexV3LmPoolDeployer = await EchodexV3LmPoolDeployer.deploy(mcV3DeployedContracts.MasterChefV3)

  console.log('echodexV3LmPoolDeployer deployed to:', echodexV3LmPoolDeployer.address)

  const echodexV3Factory = new ethers.Contract(echodexV3Factory_address, abi, owner)

  await echodexV3Factory.setLmPoolDeployer(echodexV3LmPoolDeployer.address)

  const contracts = {
    EchodexV3LmPoolDeployer: echodexV3LmPoolDeployer.address,
  }
  fs.writeFileSync(`./deployments/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
