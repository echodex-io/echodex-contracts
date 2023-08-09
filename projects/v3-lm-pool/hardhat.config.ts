import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "dotenv/config";
import { NetworkUserConfig } from "hardhat/types";
import "solidity-docgen";
require("dotenv").config({ path: require("find-config")(".env") });

const testnet: NetworkUserConfig = {
  url: "https://rpc.goerli.linea.build",
  chainId: 59140,
  accounts: [process.env.KEY_TESTNET!],
};

const mainnet: NetworkUserConfig = {
  url: "https://rpc.linea.build",
  chainId: 59144,
  accounts: [process.env.KEY_MAINNET!],
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.7.6",
  },
  networks: {
    hardhat: {},
    ...(process.env.KEY_TESTNET && { testnet }),
    ...(process.env.KEY_MAINNET && { mainnet }),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts/",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
