import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import { NetworkUserConfig } from "hardhat/types/config";

const testnet: NetworkUserConfig = {
    url: "https://rpc.goerli.linea.build/",
    chainId: 59140,
    accounts: [process.env.PRIVATE_KEY as string],
};

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            accounts: {
                accountsBalance: "1000000000000000000000000000" // 1,000,000 ETH
            }
        },
        testnet
    },
    solidity: {
        compilers: [
            {
                version: "0.6.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ]
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};

export default config