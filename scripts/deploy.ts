import { ethers } from "hardhat";

async function main() {

    // Deploy Factory
    const EchodexFactory = await ethers.getContractFactory("EchodexFactory");
    const echodexFactory = await EchodexFactory.deploy(
        "0x8be21043E75A280a1feD218b62f117a6881573a2", //_receiveFeeAddress
        "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE", //ECP
        "0x3c0B0A0c42c49b6C34B578B59852f2A2d0d62dA9" //xECP
    );
    await echodexFactory.deployed({ gasPrice: "2000000000000" });
    console.log(
        `EchodexFactory deployed to ${echodexFactory.address}`
    );

    // Deploy Router
    const EchodexRouter = await ethers.getContractFactory("EchodexRouter");
    const echodexRouter = await EchodexRouter.deploy(
        echodexFactory.address,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c" // WETH
    );
    await echodexRouter.deployed({ gasPrice: "2000000000000" });
    console.log(
        `EchodexRouter deployed to ${echodexRouter.address}`
    );

    // Deploy Router Fee
    const EchodexRouterFee = await ethers.getContractFactory("EchodexRouterFee");
    const echodexRouterFee = await EchodexRouterFee.deploy(
        echodexFactory.address,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c" // WETH
    );
    await echodexRouterFee.deployed({ gasPrice: "2000000000000" });
    console.log(
        `EchodexRouterFee deployed to ${echodexRouterFee.address}`
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
