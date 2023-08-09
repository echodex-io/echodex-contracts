/* eslint-disable no-console */
import { ethers, network } from "hardhat";

async function main() {
  const networkName = network.name;
  // get deployments from ./deployments/${networkName}.json
  const deployedContract = await import(`../deployments/${networkName}.json`);
  console.log("EchodexFarmingV3 deployed", deployedContract.EchodexFarmingV3);
  const EchodexFarmingV3 = await ethers.getContractAt("EchodexFarmingV3", deployedContract.EchodexFarmingV3);
  // get deployments from "@echodex/v3-lm-pool/deployments/${networkName}.json"
  const lmPoolDeployed = await import(`@echodex/v3-lm-pool/deployments/${networkName}.json`);
  console.log("EchodexV3LmPoolDeployer deployed", lmPoolDeployed.EchodexV3LmPoolDeployer);

  const tx = await EchodexFarmingV3.setLMPoolDeployer(lmPoolDeployed.EchodexV3LmPoolDeployer);
  console.log("setLMPoolDeployer tx", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
