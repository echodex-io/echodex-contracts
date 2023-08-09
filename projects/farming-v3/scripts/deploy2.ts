/* eslint-disable camelcase */
import { writeFileSync } from "fs";
import { ethers, run, network } from "hardhat";
import configs from "@echodex/common/config";

async function main() {
  // Get network data from Hardhat config (see hardhat.config.ts).
  const networkName = network.name;
  // Check if the network is supported.
  console.log(`Deploying to ${networkName} network...`);

  // Compile contracts.
  await run("compile");
  console.log("Compiled contracts...");

  const config = configs[networkName as keyof typeof configs];
  if (!config) {
    throw new Error(`No config found for network ${networkName}`);
  }

  const v3PeripheryDeployedContracts = await import(`@echodex/v3-periphery/deployments/${networkName}.json`);
  const positionManager_address = v3PeripheryDeployedContracts.NonfungiblePositionManager;

  const EchodexFarmingV3 = await ethers.getContractFactory("EchodexFarmingV3");
  const echodexFarmingV3 = await EchodexFarmingV3.deploy(config.xECP, positionManager_address, config.WETH);

  console.log("echodexFarmingV3 deployed to:", echodexFarmingV3.address);
  // await tryVerify(echodexFarmingV3, [config.cake, positionManager_address]);

  // Write the address to a file.
  writeFileSync(
    `./deployments/${networkName}.json`,
    JSON.stringify(
      {
        EchodexFarmingV3: echodexFarmingV3.address,
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
