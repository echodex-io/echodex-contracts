import { ethers } from "hardhat";

// custom gas price
async function getFeeData(): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const FEE_DATA = {
                maxFeePerGas: ethers.parseUnits('4', 'gwei'),
                maxPriorityFeePerGas: ethers.parseUnits('4', 'gwei'),
            };
            resolve(FEE_DATA);
        }, 1000);
    })
}

async function main() {
    ethers.provider.getFeeData = getFeeData
    // Create the signer for the mnemonic, connected to the provider with hardcoded fee data
    const signingKey = new ethers.SigningKey("0x" + process.env.PRIVATE_KEY || "0x");
    const signer = new ethers.Wallet(signingKey, ethers.provider);

    const WETH = "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f"

    // Deploy Factory
    const EchodexFactory = await ethers.deployContract("EchodexFactory", [
        "0x94DCfaE29F48aC90b1Cbb1432B598aDB02FCC83a", //_receiveFeeAddress
        "0x9201f3b9DfAB7C13Cd659ac5695D12D605B5F1e6", //ECP
        "0xB7e9eF7713fA256E6d360F9ebcd4D007B107FDea" //xECP
    ], signer);
    const addressFactory = await EchodexFactory.getAddress()
    console.log(
        `EchodexFactory deployed to ${addressFactory}`
    );

    // deploy router
    const EchodexRouter = await ethers.deployContract("EchodexRouter", [
        addressFactory,
        WETH
    ], signer);
    const address = await EchodexRouter.getAddress()
    console.log(
        `EchodexRouter deployed to ${address}`
    );

    // deploy router fee
    const EchodexRouterFee = await ethers.deployContract("EchodexRouterFee", [
        addressFactory,
        WETH
    ], signer);
    const address1 = await EchodexRouterFee.getAddress()
    console.log(
        `EchodexRouterFee deployed to ${address1}`
    );

    // Deploy farming
    const EchodexFarm = await ethers.deployContract("EchodexFarm", [
        addressFactory,
        WETH
    ], signer);
    const addressFarm = await EchodexFarm.getAddress()
    console.log(
        `EchodexFarm deployed to ${addressFarm}`
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});