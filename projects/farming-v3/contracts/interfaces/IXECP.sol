// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IXECP is IERC20 {
    function mintReward(address _user, uint256 _amount) external;
}