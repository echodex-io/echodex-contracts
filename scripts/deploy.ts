import { ethers } from "hardhat";

async function main() {

    // Deploy Factory
    // const EchodexFactory = await ethers.getContractFactory("EchodexFactory");
    // const echodexFactory = await EchodexFactory.deploy(
    //     "0x8be21043E75A280a1feD218b62f117a6881573a2", //_receiveFeeAddress
    //     "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE", //ECP
    //     "0xa76293ad1dc1f020467e94b330579408b8b7848a" //xECP
    // );
    // await echodexFactory.deployed({ gasPrice: "4000000000000" });
    // console.log(
    //     `EchodexFactory deployed to ${echodexFactory.address}`
    // );

    // Deploy Router
    const EchodexRouter = await ethers.getContractFactory("EchodexRouter");
    const echodexRouter = await EchodexRouter.deploy(
        "0x77079307DA0551208A173733bf862C49807D0965",// echodexFactory.address,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c", // WETH
        { gasPrice: "2000000000000" }
    );
    await echodexRouter.deployed();
    console.log(
        `EchodexRouter deployed to ${echodex(await router.getAddress())}`
    );

    // Deploy Router Fee
    const EchodexRouterFee = await ethers.getContractFactory("EchodexRouterFee");
    const echodexRouterFee = await EchodexRouterFee.deploy(
        "0x77079307DA0551208A173733bf862C49807D0965", //echodexFactory.address,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c", // WETH
        { gasPrice: "2000000000000" }
    );
    await echodexRouterFee.deployed();
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
