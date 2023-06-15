// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.6;

interface IEchodexFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    function getPair(address tokenA, address tokenB) external view returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function INIT_CODE_PAIR_HASH() external view returns (bytes32);

    function calcFee(uint, address, address, address) external view returns(uint, uint);

    function tokenFee() external view returns (address);

    function receiveFeeAddress() external view returns (address);

    function setTokenFee(address) external;

    function setReceiveFeeAddress(address) external;

    function refundPercent(address pair) external view returns (uint _refundPercent);

    function setRefundPercentPair(address, uint) external;

    function setFeePath(address, address[] calldata) external;

    function feePathLength(address, uint) external;
}