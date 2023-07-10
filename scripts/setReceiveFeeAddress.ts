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
    const FACTORY_ADDRESS = "0x77079307DA0551208A173733bf862C49807D0965"

    const signingKey = new ethers.SigningKey("0x" + process.env.PRIVATE_KEY || "0x");
    const signer = new ethers.Wallet(signingKey, ethers.provider);

    var contract = await ethers.getContractAt(
        "EchodexFactory",
        FACTORY_ADDRESS,
        signer);

    const result = await contract.setReceiveFeeAddress(
        "0x94DCfaE29F48aC90b1Cbb1432B598aDB02FCC83a"
    )

    console.log(result)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});