import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-contract-sizer";
import "dotenv/config";
import "hardhat-tracer";
import "@nomiclabs/hardhat-etherscan";
require("dotenv").config({ path: require("find-config")(".env") });

const DEFAULT_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 200,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const testnet: NetworkUserConfig = {
  url: "https://rpc.goerli.linea.build",
  chainId: 59140,
  accounts: [process.env.KEY_TESTNET!],
};

const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    ...(process.env.KEY_TESTNET && { testnet }),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      "@echodex/v3-core/contracts/libraries/FullMath.sol":
        DEFAULT_COMPILER_SETTINGS,
      "@echodex/v3-core/contracts/libraries/TickBitmap.sol":
        DEFAULT_COMPILER_SETTINGS,
      "@echodex/v3-core/contracts/libraries/TickMath.sol":
        DEFAULT_COMPILER_SETTINGS,
      "@echodex/v3-periphery/contracts/libraries/PoolAddress.sol":
        DEFAULT_COMPILER_SETTINGS,
      "contracts/libraries/PoolTicksCounter.sol": DEFAULT_COMPILER_SETTINGS,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
