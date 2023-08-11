/* eslint-disable no-console */
import {ethers, network} from "hardhat";

async function main() {
    const networkName = network.name;
    // get deployments from ./deployments/${networkName}.json
    const deployedContract = await import(`../deployments/${networkName}.json`);
    console.log("EchodexFarmingV3 deployed", deployedContract.EchodexFarmingV3);
    const EchodexFarmingV3 = await ethers.getContractAt("EchodexFarmingV3", deployedContract.EchodexFarmingV3);

    const pool = "0xE4F5Dc6cAb4B23e124d3a73a2CfEE32DC070F72d";

    const tx = await EchodexFarmingV3.add(
        300,
        pool,
        true
    );
    console.log("add tx", tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
