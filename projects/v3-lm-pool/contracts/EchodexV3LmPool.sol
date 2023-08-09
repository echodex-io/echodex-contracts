// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "@echodex/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "@echodex/v3-core/contracts/libraries/SafeCast.sol";
import "@echodex/v3-core/contracts/libraries/FullMath.sol";
import "@echodex/v3-core/contracts/libraries/FixedPoint128.sol";
import "@echodex/v3-core/contracts/interfaces/IEchodexV3Pool.sol";

import "./libraries/LmTick.sol";

import "./interfaces/IEchodexV3LmPool.sol";
import "./interfaces/IEchodexFarmingV3.sol";

contract EchodexV3LmPool is IEchodexV3LmPool {
    using LowGasSafeMath for uint256;
    using LowGasSafeMath for int256;
    using SafeCast for uint256;
    using SafeCast for int256;
    using LmTick for mapping(int24 => LmTick.Info);

    uint256 public constant REWARD_PRECISION = 1e12;

    IEchodexV3Pool public immutable pool;
    IEchodexFarmingV3 public immutable farmingContract;

    uint256 public rewardGrowthGlobalX128;

    mapping(int24 => LmTick.Info) public lmTicks;

    uint128 public lmLiquidity;

    uint32 public lastRewardTimestamp;

    modifier onlyPool() {
        require(msg.sender == address(pool), "Not pool");
        _;
    }

    modifier onlyFarmingContract() {
        require(msg.sender == address(farmingContract), "Not farming contract");
        _;
    }

    modifier onlyPoolOrFarmingContract() {
        require(
            msg.sender == address(pool) ||
                msg.sender == address(farmingContract),
            "Not pool or farming contract"
        );
        _;
    }

    constructor(
        address _pool,
        address _farmingContract,
        uint32 rewardStartTimestamp
    ) {
        pool = IEchodexV3Pool(_pool);
        farmingContract = IEchodexFarmingV3(_farmingContract);
        lastRewardTimestamp = rewardStartTimestamp;
    }

    function accumulateReward(
        uint32 currTimestamp
    ) external override onlyPoolOrFarmingContract {
        if (currTimestamp <= lastRewardTimestamp) {
            return;
        }

        if (lmLiquidity != 0) {
            (uint256 rewardPerSecond, uint256 endTime) = farmingContract
                .getLatestPeriodInfo(address(pool));

            uint32 endTimestamp = uint32(endTime);
            uint32 duration;
            if (endTimestamp > currTimestamp) {
                duration = currTimestamp - lastRewardTimestamp;
            } else if (endTimestamp > lastRewardTimestamp) {
                duration = endTimestamp - lastRewardTimestamp;
            }

            if (duration != 0) {
                rewardGrowthGlobalX128 += FullMath.mulDiv(
                    duration,
                    FullMath.mulDiv(
                        rewardPerSecond,
                        FixedPoint128.Q128,
                        REWARD_PRECISION
                    ),
                    lmLiquidity
                );
            }
        }

        lastRewardTimestamp = currTimestamp;
    }

    function crossLmTick(
        int24 tick,
        bool zeroForOne
    ) external override onlyPool {
        if (lmTicks[tick].liquidityGross == 0) {
            return;
        }

        int128 lmLiquidityNet = lmTicks.cross(tick, rewardGrowthGlobalX128);

        if (zeroForOne) {
            lmLiquidityNet = -lmLiquidityNet;
        }

        lmLiquidity = LiquidityMath.addDelta(lmLiquidity, lmLiquidityNet);
    }

    function updatePosition(
        int24 tickLower,
        int24 tickUpper,
        int128 liquidityDelta
    ) external onlyFarmingContract {
        (, int24 tick, , , , , ) = pool.slot0();
        uint128 maxLiquidityPerTick = pool.maxLiquidityPerTick();
        uint256 _rewardGrowthGlobalX128 = rewardGrowthGlobalX128;

        bool flippedLower;
        bool flippedUpper;
        if (liquidityDelta != 0) {
            flippedLower = lmTicks.update(
                tickLower,
                tick,
                liquidityDelta,
                _rewardGrowthGlobalX128,
                false,
                maxLiquidityPerTick
            );
            flippedUpper = lmTicks.update(
                tickUpper,
                tick,
                liquidityDelta,
                _rewardGrowthGlobalX128,
                true,
                maxLiquidityPerTick
            );
        }

        if (tick >= tickLower && tick < tickUpper) {
            lmLiquidity = LiquidityMath.addDelta(lmLiquidity, liquidityDelta);
        }

        if (liquidityDelta < 0) {
            if (flippedLower) {
                lmTicks.clear(tickLower);
            }
            if (flippedUpper) {
                lmTicks.clear(tickUpper);
            }
        }
    }

    function getRewardGrowthInside(
        int24 tickLower,
        int24 tickUpper
    ) external view returns (uint256 rewardGrowthInsideX128) {
        (, int24 tick, , , , , ) = pool.slot0();
        return
            lmTicks.getRewardGrowthInside(
                tickLower,
                tickUpper,
                tick,
                rewardGrowthGlobalX128
            );
    }
}
