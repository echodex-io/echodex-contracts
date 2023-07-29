// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import '@echodex/v3-core/contracts/interfaces/IEchodexV3Factory.sol';
import '@echodex/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';

import './EchodexV3LmPool.sol';

/// @dev This contract is for Master Chef to create a corresponding LmPool when
/// adding a new farming pool. As for why not just create LmPool inside the
/// Master Chef contract is merely due to the imcompatibility of the solidity
/// versions.
contract EchodexV3LmPoolDeployer {
    address public immutable masterChef;

    modifier onlyMasterChef() {
        require(msg.sender == masterChef, "Not MC");
        _;
    }

    constructor(address _masterChef) {
        masterChef = _masterChef;
    }

    /// @dev Deploys a LmPool
    /// @param pool The contract address of the EchodexSwap V3 pool
    function deploy(IEchodexV3Pool pool) external onlyMasterChef returns (IEchodexV3LmPool lmPool) {
        lmPool = new EchodexV3LmPool(address(pool), masterChef, uint32(block.timestamp));
        IEchodexV3Factory(INonfungiblePositionManager(IMasterChefV3(masterChef).nonfungiblePositionManager()).factory()).setLmPool(address(pool), address(lmPool));
    }
}
