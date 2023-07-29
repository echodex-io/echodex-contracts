import { abi as POOL_ABI } from '@echodex/v3-core/artifacts/contracts/EchodexV3Pool.sol/EchodexV3Pool.json'
import { Contract, Wallet } from 'ethers'
import { IEchodexV3Pool } from '../../typechain-types'

export default function poolAtAddress(address: string, wallet: Wallet): IEchodexV3Pool {
  return new Contract(address, POOL_ABI, wallet) as IEchodexV3Pool
}
