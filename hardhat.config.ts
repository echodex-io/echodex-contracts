import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "dotenv/config";

const lineaTestnet: NetworkUserConfig = {
    url: "https://rpc.goerli.linea.build/",
    chainId: 59140,
    accounts: ["7405d14a489b723000415c63e06b58c1389ba9d34dc2828b30bce703440eea1d"],
};

const bscMainnet: NetworkUserConfig = {
    url: "https://bsc-dataseed.binance.org/",
    chainId: 56,
    accounts: [process.env.KEY_MAINNET!],
};

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {},
        linea: lineaTestnet
        // testnet: bscTestnet,
        // mainnet: bscMainnet,
    },
    solidity: {
        compilers: [
            {
                version: "0.8.4",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 10,
                    },
                },
            },
            {
                version: "0.6.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 10,
                    },
                },
            },
            {
                version: "0.5.16",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 10,
                    },
                },
            },
            {
                version: "0.4.18",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 10,
                    },
                },
            },
        ],
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    abiExporter: {
        path: "./data/abi",
        clear: true,
        flat: false,
    },
};

export default config;