// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;

import './interfaces/IPancakeFactory.sol';
import './PancakePair.sol';
import './libraries/PancakeLibrary.sol';

contract PancakeFactory is IPancakeFactory {
    bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(PancakePair).creationCode));

    address public feeTo;
    address public feeToSetter;
    address public receiveFee;
    address public tokenFee;
    address public tokenMedialFee;
    address public owner;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter, address _receiveFee, address _tokenFee, address _tokenMedialFee) public {
        feeToSetter = _feeToSetter;
        receiveFee = _receiveFee;
        tokenFee = _tokenFee;
        tokenMedialFee = _tokenMedialFee;
        owner = msg.sender;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'Pancake: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Pancake: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'Pancake: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(PancakePair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        PancakePair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'Pancake: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'Pancake: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    function setTokenFee(address _tokenFee) external {
        require(msg.sender == owner, 'Pancake: FORBIDDEN');
        tokenFee = _tokenFee;
    }

    function setTokenMedialFee(address _tokenMedialFee) external {
        require(msg.sender == owner, 'Pancake: FORBIDDEN');
        tokenMedialFee = _tokenMedialFee;
    }

    function setReceiveFee(address _receiveFee) external {
        require(msg.sender == owner, 'Pancake: FORBIDDEN');
        receiveFee = _receiveFee;
    }

    function calcFee(uint amountOut, address tokenOut, address factory) external view returns (uint fee) {
        uint amountFeeTokenOut = amountOut / 1000; //0.1% fee

        address pairWithTokenFee = getPair[tokenOut][tokenFee];
        if (pairWithTokenFee == address(0)) { // have no pair
            //tokenOut -> tokenMedialFee -> tokenFee
            address[] memory path = new address[](3);
            path[0] = tokenOut;
            path[1] = tokenMedialFee;
            path[2] = tokenFee;
            uint256[] memory amounts = PancakeLibrary.getAmountsOut(factory, amountFeeTokenOut, path);
            fee = amounts[amounts.length - 1];
        } else { // have pair
            //tokenOut -> tokenFee
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = tokenFee;
            uint256[] memory amounts = PancakeLibrary.getAmountsOut(factory, amountFeeTokenOut, path);
            fee = amounts[amounts.length - 1];
        }
    }
}