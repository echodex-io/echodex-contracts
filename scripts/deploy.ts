import { ethers } from "hardhat";

// custom gas price
async function getFeeData(): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const FEE_DATA = {
                maxFeePerGas: ethers.parseUnits('20', 'gwei'),
                maxPriorityFeePerGas: ethers.parseUnits('20', 'gwei'),
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

    console.log(process.env.PRIVATE_KEY);

    // Deploy Factory
    const EchodexFactory = await ethers.deployContract("EchodexFactory", [
        "0x94DCfaE29F48aC90b1Cbb1432B598aDB02FCC83a", //_receiveFeeAddress
        "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE", //ECP
        "0xa76293ad1dc1f020467e94b330579408b8b7848a" //xECP
    ], signer);
    const addressFactory = await EchodexFactory.getAddress()
    console.log(
        `EchodexFactory deployed to ${addressFactory}`
    );

    // deploy router
    const EchodexRouter = await ethers.deployContract("EchodexRouter", [
        addressFactory,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c"
    ], signer);
    const address = await EchodexRouter.getAddress()
    console.log(
        `EchodexRouter deployed to ${address}`
    );

    // deploy router fee
    const EchodexRouterFee = await ethers.deployContract("EchodexRouterFee", [
        addressFactory,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c"
    ], signer);
    const address1 = await EchodexRouterFee.getAddress()
    console.log(
        `EchodexRouterFee deployed to ${address1}`
    );

    // Deploy farming
    const EchodexFarm = await ethers.deployContract("EchodexFarm", [
        addressFactory,
        "0x2c1b868d6596a18e32e61b901e4060c872647b6c" // WETH
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