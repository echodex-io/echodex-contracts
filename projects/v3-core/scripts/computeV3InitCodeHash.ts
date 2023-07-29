import { ethers } from 'hardhat'
import EchodexV3PoolArtifact from '../artifacts/contracts/EchodexV3Pool.sol/EchodexV3Pool.json'

const hash = ethers.utils.keccak256(EchodexV3PoolArtifact.bytecode)
console.log(hash)
