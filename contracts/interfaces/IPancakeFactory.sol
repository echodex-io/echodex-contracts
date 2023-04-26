// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.5.0;

interface IPancakeFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    function getPair(address tokenA, address tokenB) external view returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function INIT_CODE_PAIR_HASH() external view returns (bytes32);

    function calcFee(uint, address, address, address) external view returns(uint, uint);

    function tokenFee() external view returns (address);

    function receiveFee() external view returns (address);

    function percentFee() external view returns(uint);

    function percentFeeCaseSubTokenOut() external view returns(uint);

    function setTokenFee(address) external;

    function setTokenMedialFee(address) external;

    function setReceiveFee(address) external;

    function percentRefund(address pair) external view returns (uint _percentRefund);

    function setPercentRefundPair(address, uint) external;

    function setPercentFee(uint) external;

    function setPercentFeeCaseSubTokenOut(uint) external;
}