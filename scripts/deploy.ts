import { ethers } from "hardhat";

async function main() {

    // Deploy Factory
    // const EchodexFactory = await ethers.getContractFactory("EchodexFactory");
    // const echodexFactory = await EchodexFactory.deploy(
    //     "0xC0F007ef85eC29A911c022DfebA75e63EC5ff98A", //_receiveFeeAddress
    //     "0xf440Bef79904289aBaF48bbFa69E15ce9c774709" //_tokenFee
    // );
    // await echodexFactory.deployed();
    // console.log(
    //     `EchodexFactory deployed to ${echodexFactory.address}`
    // );

    // Deploy Router
    const EchodexRouter = await ethers.getContractFactory("EchodexRouter");
    const echodexRouter = await EchodexRouter.deploy(
        "0x41838D4F691ee09cf77305A148BAB18217a35596", // echodexFactory.address // factory address
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c" // WETH
    );
    await echodexRouter.deployed();
    console.log(
        `EchodexRouter deployed to ${echodexRouter.address}` //0x0a82ccA304Fb8aEa8A4a392C710eE8779c828277
    );

    // Deploy Router Fee
    const EchodexRouterFee = await ethers.getContractFactory("EchodexRouterFee");
    const echodexRouterFee = await EchodexRouterFee.deploy(
        "0x41838D4F691ee09cf77305A148BAB18217a35596", // echodexFactory.address // factory address
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c" // WETH
    );
    await echodexRouterFee.deployed();
    console.log(
        `EchodexRouterFee deployed to ${echodexRouterFee.address}` //0xC053301891b0903a037fCABd71A952cD8eFC28ba
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
