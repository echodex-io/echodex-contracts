// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import './pool/IEchodexV3PoolImmutables.sol';
import './pool/IEchodexV3PoolState.sol';
import './pool/IEchodexV3PoolDerivedState.sol';
import './pool/IEchodexV3PoolActions.sol';
import './pool/IEchodexV3PoolOwnerActions.sol';
import './pool/IEchodexV3PoolEvents.sol';

/// @title The interface for a EchodexSwap V3 Pool
/// @notice A EchodexSwap pool facilitates swapping and automated market making between any two assets that strictly conform
/// to the ERC20 specification
/// @dev The pool interface is broken up into many smaller pieces
interface IEchodexV3Pool is
    IEchodexV3PoolImmutables,
    IEchodexV3PoolState,
    IEchodexV3PoolDerivedState,
    IEchodexV3PoolActions,
    IEchodexV3PoolOwnerActions,
    IEchodexV3PoolEvents
{

}
