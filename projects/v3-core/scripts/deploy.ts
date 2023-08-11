import { tryVerify } from '@echodex/common/verify'
import { ContractFactory } from 'ethers'
import { ethers, network } from 'hardhat'
import fs from 'fs'

type ContractJson = { abi: any; bytecode: string }
const artifacts: { [name: string]: ContractJson } = {
  // eslint-disable-next-line global-require
  EchodexV3PoolDeployer: require('../artifacts/contracts/EchodexV3PoolDeployer.sol/EchodexV3PoolDeployer.json'),
  // eslint-disable-next-line global-require
  EchodexV3Factory: require('../artifacts/contracts/EchodexV3Factory.sol/EchodexV3Factory.json'),
}

async function main() {
  const [owner] = await ethers.getSigners()
  const networkName = network.name
  console.log('owner', owner.address)

  let echodexV3PoolDeployer_address = ''
  let echodexV3PoolDeployer
  const EchodexV3PoolDeployer = new ContractFactory(
    artifacts.EchodexV3PoolDeployer.abi,
    artifacts.EchodexV3PoolDeployer.bytecode,
    owner
  )
  if (!echodexV3PoolDeployer_address) {
    echodexV3PoolDeployer = await EchodexV3PoolDeployer.deploy()

    echodexV3PoolDeployer_address = echodexV3PoolDeployer.address
    console.log('echodexV3PoolDeployer', echodexV3PoolDeployer_address)
  } else {
    echodexV3PoolDeployer = new ethers.Contract(
      echodexV3PoolDeployer_address,
      artifacts.EchodexV3PoolDeployer.abi,
      owner
    )
  }

  let echodexV3Factory_address = ''
  let echodexV3Factory
  if (!echodexV3Factory_address) {
    const EchodexV3Factory = new ContractFactory(
      artifacts.EchodexV3Factory.abi,
      artifacts.EchodexV3Factory.bytecode,
      owner
    )
    echodexV3Factory = await EchodexV3Factory.deploy(echodexV3PoolDeployer_address)

    echodexV3Factory_address = echodexV3Factory.address
    console.log('echodexV3Factory', echodexV3Factory_address)
  } else {
    echodexV3Factory = new ethers.Contract(echodexV3Factory_address, artifacts.EchodexV3Factory.abi, owner)
  }

  // Set FactoryAddress for echodexV3PoolDeployer.
  await echodexV3PoolDeployer.setFactoryAddress(echodexV3Factory_address)

  const contracts = {
    EchodexV3Factory: echodexV3Factory_address,
    EchodexV3PoolDeployer: echodexV3PoolDeployer_address,
  }

  fs.writeFileSync(`./deployments/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
