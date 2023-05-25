// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.5.0;

import "./SafeMath.sol";
import "../interfaces/IEchodexFactory.sol";
import "../interfaces/IEchodexPair.sol";

library EchodexLibrary {
    using SafeMath for uint256;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "EchodexLibrary: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "EchodexLibrary: ZERO_ADDRESS");
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    ) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(
            uint256(
                keccak256(
                    abi.encodePacked(
                        hex"ff",
                        factory,
                        keccak256(abi.encodePacked(token0, token1)),
                        hex"b039c56425b9e07f62723163173012c540a2e79c749cceb466167ded396e202a" // init code hash
                    )
                )
            )
        );
    }
    
    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) internal view returns (uint256 reserveA, uint256 reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        pairFor(factory, tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IEchodexPair(pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountB) {
        require(amountA > 0, "EchodexLibrary: INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "EchodexLibrary: INSUFFICIENT_LIQUIDITY");
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "EchodexLibrary: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "EchodexLibrary: INSUFFICIENT_LIQUIDITY");
        // uint256 amountInWithFee = amountIn.mul(1000); // 1 * 1000
        // uint256 numerator = amountInWithFee.mul(reserveOut); // 1000 * 1000
        // uint256 denominator = reserveIn.mul(1000).add(amountInWithFee); // 100 * 1000 + 1000
        // amountOut = numerator / denominator; //1000000 /101000 =  9.9009901

        uint256 amountInWithFee = amountIn; // 1
        uint256 numerator = amountInWithFee.mul(reserveOut); // 1 * 1000
        uint256 denominator = reserveIn.add(amountInWithFee); // 100 + 1
        amountOut = numerator / denominator; //1000 / 101 =  9.9009901

        // amountInWithFee = 100,000,000,000,000,000

        // numerator = 100,000,000,000,000,000 * 1000000000000000000000 = 100,000,000,000,000,000,000,000,000,000,000,000,000
        // denominator = 100000000000000000000 + 100,000,000,000,000,000 = 100,100,000,000,000,000,000
        // amountOut = 999,000,999,000,999,000

    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, "EchodexLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "EchodexLibrary: INSUFFICIENT_LIQUIDITY");
        // uint256 numerator = reserveIn.mul(amountOut).mul(1000); // 100 * 500 * 1000
        // uint256 denominator = reserveOut.sub(amountOut).mul(1000); // (1000 - 500) * 1000
        // amountIn = (numerator / denominator).add(1); // 50000000 / 500000 = 100 + 1 = 2.01

        uint256 numerator = reserveIn.mul(amountOut); // 100 * 500
        uint256 denominator = reserveOut.sub(amountOut); // 1000 - 500
        amountIn = (numerator / denominator).add(1); // 50000 / 500 = 100 + 1 = 2.01
    }

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(
        address factory,
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "EchodexLibrary: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(
        address factory,
        uint256 amountOut,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "EchodexLibrary: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}