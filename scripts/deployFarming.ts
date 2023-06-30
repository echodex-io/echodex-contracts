import { ethers } from "hardhat";

async function main() {

    // Deploy Factory
    const EchodexFarm = await ethers.getContractFactory("EchodexFarm");
    const echodexFarm = await EchodexFarm.deploy(
        "0x1930b00e116f1dc285e7722a1eb81a396000D1f7", // factory
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c" // WETH
    );
    await echodexFarm.deployed({ gasPrice: "2000000000000" });
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
