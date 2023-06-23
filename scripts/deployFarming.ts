import { ethers } from "hardhat";

async function main() {

    // Deploy Factory
    const EchodexFarm = await ethers.getContractFactory("EchodexFarm");
    const echodexFarm = await EchodexFarm.deploy(
        "0x1930b00e116f1dc285e7722a1eb81a396000D1f7", // factory
    );
    await echodexFarm.deployed();
    console.log(
        `EchodexFarm deployed to ${echodexFarm.address}`
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
