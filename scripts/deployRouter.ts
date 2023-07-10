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

    const EchodexRouter = await ethers.deployContract("EchodexRouter", ["0x77079307DA0551208A173733bf862C49807D0965", "0x2c1b868d6596a18e32e61b901e4060c872647b6c"], signer);
    const address = await EchodexRouter.getAddress()
    console.log(
        `EchodexRouter deployed to ${address}`
    );

    const EchodexRouterFee = await ethers.deployContract("EchodexRouterFee", ["0x77079307DA0551208A173733bf862C49807D0965", "0x2c1b868d6596a18e32e61b901e4060c872647b6c"], signer);
    const address1 = await EchodexRouterFee.getAddress()
    console.log(
        `EchodexRouterFee deployed to ${address1}`
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});