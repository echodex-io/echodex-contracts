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
    const FACTORY_ADDRESS = "0x985Aa0607a4ab865fdB8FaB3dc821f4c773f33e5"

    const signingKey = new ethers.SigningKey("0x" + process.env.PRIVATE_KEY || "0x");
    const signer = new ethers.Wallet(signingKey, ethers.provider);

    var contract = await ethers.getContractAt(
        "EchodexFactory",
        FACTORY_ADDRESS,
        signer);

    // var data = contract.methods.setFeePath(
    //     "0xBE12703A2321fB5be67c1cfe5c5675671BCb94f1",
    //     ["0xBE12703A2321fB5be67c1cfe5c5675671BCb94f1", "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE"] //eUsdc -> ECP
    // )

    const result = await contract.setFeePath(
        "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE",
        ["0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE", "0x2c1b868d6596a18e32e61b901e4060c872647b6c", "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE"] // ECP -> ETH -> ECP
    )

    // const result = await contract.setFeePath(
    //     "0x4ccb503a5d792eabeff688010e609d40f9a54148",
    //     ["0x4ccb503a5d792eabeff688010e609d40f9a54148", "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE"] //eUsdt -> ECP
    // )

    // const result = await contract.setFeePath(
    //     "0x2c1b868d6596a18e32e61b901e4060c872647b6c",
    //     ["0x2c1b868d6596a18e32e61b901e4060c872647b6c", "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE"] // ETH -> ECP
    // )

    console.log(result)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});