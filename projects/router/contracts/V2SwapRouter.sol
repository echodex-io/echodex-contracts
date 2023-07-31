// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@echodex/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IV2SwapRouter.sol";
import "./base/ImmutableState.sol";
import "./base/PeripheryPaymentsWithFeeExtended.sol";
import "./libraries/Constants.sol";
import "./libraries/SmartRouterHelper.sol";

/// @title EchodexSwap V2 Swap Router
/// @notice Router for stateless execution of swaps against EchodexSwap V2
abstract contract V2SwapRouter is
    IV2SwapRouter,
    ImmutableState,
    PeripheryPaymentsWithFeeExtended,
    ReentrancyGuard
{
    using LowGasSafeMath for uint256;

    // supports fee-on-transfer tokens
    // requires the initial amount to have already been sent to the first pair
    // `refundETH` should be called at very end of all swaps
    function _swap(
        uint256[] memory amounts,
        address[] memory path,
        address _to
    ) private {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = SmartRouterHelper.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1].mul(1000) / 997;
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2
                ? SmartRouterHelper.pairFor(factoryV2, output, path[i + 2])
                : _to;
            IUniswapV2Pair(SmartRouterHelper.pairFor(factoryV2, input, output)).swap(amount0Out, amount1Out, to, new bytes(0));

            // if router has reward token, send it to the caller
            uint256 rewardAmount = IERC20(rewardToken).balanceOf(address(this));
            if (rewardAmount > 0) {
                pay(rewardToken, address(this), msg.sender, rewardAmount);
            }
        }
    }

    /// @inheritdoc IV2SwapRouter
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) external payable override nonReentrant returns (uint256 amountOut) {
        IERC20 srcToken = IERC20(path[0]);
        IERC20 dstToken = IERC20(path[path.length - 1]);

        // use amountIn == Constants.CONTRACT_BALANCE as a flag to swap the entire balance of the contract
        bool hasAlreadyPaid;
        if (amountIn == Constants.CONTRACT_BALANCE) {
            hasAlreadyPaid = true;
            amountIn = srcToken.balanceOf(address(this));
        }

        pay(
            address(srcToken),
            hasAlreadyPaid ? address(this) : msg.sender,
            SmartRouterHelper.pairFor(factoryV2, address(srcToken), path[1]),
            amountIn
        );

        // find and replace to addresses
        if (to == Constants.MSG_SENDER) to = msg.sender;
        else if (to == Constants.ADDRESS_THIS) to = address(this);

        uint256 balanceBefore = dstToken.balanceOf(to);
        _swap(SmartRouterHelper.getAmountsOut(factoryV2, amountIn, path), path, to);

        amountOut = dstToken.balanceOf(to).sub(balanceBefore);
        require(amountOut >= amountOutMin);
    }

    /// @inheritdoc IV2SwapRouter
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to
    ) external payable override nonReentrant returns (uint256 amountIn) {
        uint256[] memory amounts = SmartRouterHelper.getAmountsIn(factory, amountOut, path);
        address srcToken = path[0];
        amountIn = amounts[0];
        require(amountIn <= amountInMax);

        pay(
            srcToken,
            msg.sender,
            SmartRouterHelper.pairFor(factoryV2, srcToken, path[1]),
            amountIn
        );

        // find and replace to addresses
        if (to == Constants.MSG_SENDER) to = msg.sender;
        else if (to == Constants.ADDRESS_THIS) to = address(this);

        _swap(amounts, path, to);
    }
}
