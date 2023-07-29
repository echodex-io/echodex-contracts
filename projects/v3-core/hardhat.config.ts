import type { HardhatUserConfig, NetworkUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-watcher'
import 'dotenv/config'
import 'solidity-docgen'
require('dotenv').config({ path: require('find-config')('.env') })

const LOW_OPTIMIZER_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 200,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const testnet: NetworkUserConfig = {
  url: 'https://rpc.goerli.linea.build',
  chainId: 59140,
  accounts: [process.env.KEY_TESTNET!],
}

export default {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    ...(process.env.KEY_TESTNET && { testnet }),
    // mainnet: bscMainnet,
  },
  etherscan: {
    apiKey: {
      testnet: process.env.ETHERSCAN_API_KEY
    },
    customChains: [
      {
        network: "testnet",
        chainId: testnet.chainId,
        urls: {
          apiURL: "https://api-goerli.lineascan.build/api",
          browserURL: "https://goerli.lineascan.build"
        }
      }
    ]
  },
  solidity: {
    compilers: [LOW_OPTIMIZER_COMPILER_SETTINGS],
  },
  watcher: {
    test: {
      tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
      files: ['./test/**/*'],
      verbose: true,
    },
  },
  docgen: {
    pages: 'files',
  },
}
