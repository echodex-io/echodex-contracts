import * as dotenv from "dotenv";
dotenv.config({ path: '../.env' });

const Web3 = require('web3')
const web3 = new Web3("https://rpc.goerli.linea.build/")

async function main() {
    const FACTORY_ADDRESS = "0x2A7101ef057237C7B0e854E139aecd1977B61419"
    const abi = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_receiveFeeAddress",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_tokenFee",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "token0",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "token1",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "pair",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "PairCreated",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "INIT_CODE_PAIR_HASH",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "allPairs",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "allPairsLength",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "amountOut",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "tokenOut",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "pair",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "factory",
                    "type": "address"
                }
            ],
            "name": "calcFee",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "fee",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "feeRefund",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "tokenA",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "tokenB",
                    "type": "address"
                }
            ],
            "name": "createPair",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "pair",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "feePath",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "getPair",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "receiveFeeAddress",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "refundPercent",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "tokenOut",
                    "type": "address"
                },
                {
                    "internalType": "address[]",
                    "name": "path",
                    "type": "address[]"
                }
            ],
            "name": "setFeePath",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_receiveFeeAddress",
                    "type": "address"
                }
            ],
            "name": "setReceiveFeeAddress",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "pair",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "_refundPercent",
                    "type": "uint256"
                }
            ],
            "name": "setRefundPercentPair",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_tokenFee",
                    "type": "address"
                }
            ],
            "name": "setTokenFee",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "tokenFee",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    const myAddress = "0x8be21043E75A280a1feD218b62f117a6881573a2"

    var contract = new web3.eth.Contract(
        abi,
        FACTORY_ADDRESS,
        { from: myAddress });

    var data = contract.methods.setFeePath(
        "0x4CCb503a5d792eabEFF688010e609d40f9a54148",
        ["0x4CCb503a5d792eabEFF688010e609d40f9a54148", "0x72038bbaF749F4b10E525C9E2bB8ae987288a8BE"]
    )

    var count = await web3.eth.getTransactionCount(myAddress);
    var rawTransaction = {
        "from": myAddress,
        "gasPrice": web3.utils.toHex(5000000000),
        "gas": web3.utils.toHex(200000),
        "to": FACTORY_ADDRESS,
        "value": web3.utils.toHex('0'),
        "data": data.encodeABI(),
        "nonce": web3.utils.toHex(count)
    };

    try {
        const signedTx = await web3.eth.accounts.signTransaction(rawTransaction, process.env.PRIVATE_KEY);
        web3.eth.sendSignedTransaction(signedTx.rawTransaction).on('transactionHash', function (hash: string) {
            console.log(hash)
        });
    } catch (error) {
        console.log(error)
    }
}

main();