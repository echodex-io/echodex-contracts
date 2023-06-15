// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.6.6;

import './EchodexPair.sol';
import './libraries/EchodexLibrary.sol';

contract EchodexFactory {
    bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(EchodexPair).creationCode));

    address public receiveFeeAddress;
    address public tokenFee;
    address public owner;

    mapping(address => address[]) public feePath;
    mapping(address => uint) public feePathLenght;
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    mapping(address => uint) public refundPercent;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _receiveFeeAddress, address _tokenFee) public {
        receiveFeeAddress = _receiveFeeAddress;
        tokenFee = _tokenFee;
        owner = msg.sender;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'Echodex: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Echodex: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'Echodex: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(EchodexPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        EchodexPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setRefundPercentPair(address pair, uint _refundPercent) external {
        require(msg.sender == owner, 'Echodex: FORBIDDEN');
        refundPercent[pair] = _refundPercent;
    }

    function setTokenFee(address _tokenFee) external {
        require(msg.sender == owner, 'Echodex: FORBIDDEN');
        tokenFee = _tokenFee;
    }

    function setReceiveFeeAddress(address _receiveFeeAddress) external {
        require(msg.sender == owner, 'Echodex: FORBIDDEN');
        receiveFeeAddress = _receiveFeeAddress;
    }

    function setFeePath(address tokenOut, address[] calldata path) external {
        require(msg.sender == owner, 'Echodex: FORBIDDEN');
        feePath[tokenOut] = path;
        feePathLenght[tokenOut] = path.length;
    }

    function calcFee(uint amountOut, address tokenOut, address pair, address factory) external view returns (uint fee, uint feeRefund) {
        uint amountFeeTokenOut = amountOut / 1000;

        uint amountFeeRefundTokenOut = 0;
        feeRefund = 0;
        if (refundPercent[pair] > 0) {
            amountFeeRefundTokenOut = amountOut * refundPercent[pair]  / (100 * 10 ** 18); // refund (0.05 * 10 **18)% fee
            // amountFeeTokenOut = amountFeeTokenOut - amountFeeRefundTokenOut;
        }

        address[] memory path = feePath[tokenOut];
        uint256[] memory amounts = EchodexLibrary.getAmountsOut(factory, amountFeeTokenOut, path);
        fee = amounts[amounts.length - 1];

        if (amountFeeRefundTokenOut > 0) {
            uint256[] memory amountsRefund = EchodexLibrary.getAmountsOut(factory, amountFeeRefundTokenOut, path);
            feeRefund = amountsRefund[amountsRefund.length - 1];
        }
    }
}