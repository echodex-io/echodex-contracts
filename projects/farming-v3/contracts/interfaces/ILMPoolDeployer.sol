// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./IEchodexV3Pool.sol";
import "./ILMPool.sol";

interface ILMPoolDeployer {
    function deploy(IEchodexV3Pool pool) external returns (ILMPool lmPool);
}
