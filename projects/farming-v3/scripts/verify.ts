/* eslint-disable camelcase */
import { verifyContract } from "@echodex/common/verify";
import { sleep } from "@echodex/common/sleep";
import configs from "@echodex/common/config";
import { network } from "hardhat";

async function main() {
  const networkName = network.name;
  const config = configs[networkName as keyof typeof configs];

  if (!config) {
    throw new Error(`No config found for network ${networkName}`);
  }
  const deployedContracts_masterchef_v3 = await import(`@echodex/farming-v3/deployments/${networkName}.json`);
  const deployedContracts_v3_periphery = await import(`@echodex/v3-periphery/deployments/${networkName}.json`);

  // Verify echodexFarmingV3
  console.log("Verify echodexFarmingV3");
  await verifyContract(deployedContracts_masterchef_v3.EchodexFarmingV3, [
    config.xECP,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
    config.WETH,
  ]);
  await sleep(10000);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
