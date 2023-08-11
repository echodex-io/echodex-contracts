/* eslint-disable no-console */
import {ethers, network} from "hardhat";
import configs from '@echodex/common/config';

async function main() {
    const networkName = network.name;
    const config  = configs[networkName as keyof typeof configs];
    // get deployments from ./deployments/${networkName}.json
    const deployedContract = await import(`../deployments/${networkName}.json`);
    console.log("EchodexFarmingV3 deployed", deployedContract.EchodexFarmingV3);
    const EchodexFarmingV3 = await ethers.getContractAt("EchodexFarmingV3", deployedContract.EchodexFarmingV3);
    // get deployments from "@echodex/v3-lm-pool/deployments/${networkName}.json"
    const lmPoolDeployed = await import(`@echodex/v3-lm-pool/deployments/${networkName}.json`);
    console.log("EchodexV3LmPoolDeployer deployed", lmPoolDeployed.EchodexV3LmPoolDeployer);

    const account = (await ethers.getSigners())[0];
    console.log("Admin account", account.address);

    // approve max amount xECP to EchodexFarmingV3
    const xECP = await ethers.getContractAt("IERC20", config.xECP);
    // check allowance
    const allowance = await xECP.allowance(account.address, EchodexFarmingV3.address);

    console.log("allowance", allowance.toString());

    if(allowance.lt(ethers.constants.MaxUint256)) {
        const tx = await xECP.approve(EchodexFarmingV3.address, ethers.constants.MaxUint256);
        console.log("approve tx", tx.hash);
    }

    const currentReceiver = await EchodexFarmingV3.receiver();
    console.log("currentReceiver", currentReceiver);

    if(currentReceiver !== account.address) {
        const tx = await EchodexFarmingV3.setReceiver(account.address);
        console.log("setReceiver tx", tx.hash);
    }

    // 10k xECP per month
    const tx = await EchodexFarmingV3.upkeep(ethers.utils.parseUnits(`${10000}`), 30 * 24 * 60 * 60, true)
    console.log("upkeep tx", tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
