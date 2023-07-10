pragma solidity =0.6.6;


// SPDX-License-Identifier: GPL-3.0
interface IERC20 {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

// SPDX-License-Identifier: GPL-3.0
interface IEchodexFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    function getPair(address tokenA, address tokenB) external view returns (address pair);

    function allPairs(uint256) external view returns (address pair);

    function allPairsLength() external view returns (uint256);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function INIT_CODE_PAIR_HASH() external view returns (bytes32);

    function calcFeeOrReward(address tokenOut, uint amountOut, uint percent) external view returns(uint amount);

    function tokenFee() external view returns (address);
    function tokenReward() external view returns (address);

    function owner() external view returns (address);

    function receiveFeeAddress() external view returns (address);

    function setTokenFee(address) external;

    function setReceiveFeeAddress(address) external;

    function rewardPercent(address pair) external view returns (uint percent);

    function setRefundPercentPair(address, uint) external;

    function setFeePath(address, address[] calldata) external;

    function feePathLength(address) external view returns(uint);
}

// SPDX-License-Identifier: GPL-3.0-or-later
// helper methods for interacting with ERC20 tokens and sending ETH that do not consistently return true/false
library TransferHelper {
    function safeApprove(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeApprove: approve failed'
        );
    }

    function safeTransfer(
        address token,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::safeTransfer: transfer failed'
        );
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::transferFrom: transferFrom failed'
        );
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');
    }
}

// SPDX-License-Identifier: MIT
/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryAdd(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        uint256 c = a + b;
        if (c < a) return (false, 0);
        return (true, c);
    }

    /**
     * @dev Returns the substraction of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function trySub(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b > a) return (false, 0);
        return (true, a - b);
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryMul(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) return (true, 0);
        uint256 c = a * b;
        if (c / a != b) return (false, 0);
        return (true, c);
    }

    /**
     * @dev Returns the division of two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryDiv(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b == 0) return (false, 0);
        return (true, a / b);
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryMod(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b == 0) return (false, 0);
        return (true, a % b);
    }

    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: modulo by zero");
        return a % b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {trySub}.
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        return a - b;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryDiv}.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting with custom message when dividing by zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryMod}.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a % b;
    }
}

// SPDX-License-Identifier: GPL-3.0
contract EchodexFarm {
    using SafeMath  for uint;

    address public owner;
    uint256 public currentPoolId;
    address public factory;

    address public immutable WETH;

    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    struct PoolInfo {
        uint256 poolId; 
        address pairAddress;
        uint256 amountReward;
        address tokenReward;
        uint256 startDate;  // second timestamp
        uint256 endDate;    // second timestamp
        uint256 realEndDate;  // second timestamp
        address owner;
    }

    struct PoolReward {
        uint256 accAmountPerShare;
        uint256 totalLP;
        uint256 totalReward;
        uint256 amountPerSecond;
        uint256 lastRewardTimestamp;
        uint256 totalExcessReward;
        uint256 startTimeExcess;
    }
    mapping (uint256 => PoolInfo) public poolInfos;
    mapping (uint256 => PoolReward) public poolRewards;

    struct User {
        uint256 amount;
        uint256 rewardDebt;
        uint256 rewardEarn;
    }
    mapping(address => mapping(uint256 => User)) public users; // address => poolId => UserInfo

    event PoolCreated(
        uint256 poolId,
        address pairAddress,
        address tokenA,
        address tokenB,
        uint256 amountReward,
        address tokenReward,
        uint256 startDate,
        uint256 endDate,
        uint256 amountPerSecond
    );

    event PoolUpdate(
        uint256 poolId,
        uint256 accAmountPerShare,
        uint256 totalLP,
        uint256 totalReward,
        uint256 lastRewardTimestamp
    );

    event UserUpdate(
        address user,
        uint256 poolId,
        uint256 amount,
        uint256 rewardDebt,
        uint256 rewardEarn
    );

    event Stake(
        uint256 poolId,
        address user,
        uint256 amount
    );

    event Unstake(
        uint256 poolId,
        address user,
        uint256 amount
    );

    event Harvest(
        uint256 poolId,
        address user,
        uint256 amountHarvested
    );

    event WithdrawExcess(
        uint256 poolId,
        uint256 amount
    );

    event BlueCheck(
        uint256 poolId,
        bool isBlueCheck
    );

    event StopPool(
        uint256 poolId
    );

    constructor(address _factory, address _WETH) public {
        owner = msg.sender;
        factory = _factory;
        WETH = _WETH;
    }

    function createPool(address tokenA, address tokenB, uint256 amountReward, address tokenReward, uint256 startDate, uint256 endDate) payable external {
        require(block.timestamp <= startDate, "EchodexFarm: WRONG_TIME");
        require(startDate + 30 * 60 <= endDate, "EchodexFarm: WRONG_TIME");
        require(amountReward > 0, "EchodexFarm: AMOUNT_NOT_VALID");
        address pairAddress = IEchodexFactory(factory).getPair(tokenA, tokenB);
        require(pairAddress != address(0), "EchodexFarm: PAIR_NOT_EXIST");

        if (tokenReward == WETH) {
            require(msg.value > 0, "EchodexFarm: AMOUNT_NOT_VALID");
            require(msg.value == amountReward, "EchodexFarm: AMOUNT_NOT_VALID");
        } else {
            TransferHelper.safeTransferFrom(tokenReward, msg.sender, address(this), amountReward);
        }
       
        uint256 amountPerSecond = amountReward.div(endDate.sub(startDate));
       
        poolInfos[currentPoolId] = PoolInfo({
            poolId: currentPoolId,
            pairAddress: pairAddress,
            amountReward: amountReward,
            tokenReward: tokenReward,
            startDate: startDate,
            endDate: endDate,
            realEndDate: endDate,
            owner: msg.sender
        });

        poolRewards[currentPoolId] = PoolReward({
            accAmountPerShare: 0,
            totalLP: 0,
            totalReward: 0,
            amountPerSecond: amountPerSecond,
            lastRewardTimestamp: 0,
            startTimeExcess: startDate,
            totalExcessReward: 0
        });
       
        emit PoolCreated(currentPoolId, pairAddress, tokenA, tokenB, amountReward, tokenReward, startDate, endDate, amountPerSecond);

        currentPoolId++;
    }
  
    function stake(uint256 poolId, uint256 amountLP) external {
        require(amountLP > 0 , "EchodexFarm: AMOUNT_LP_NOT_ZERO");

        PoolInfo storage poolInfo = poolInfos[poolId];
        require(poolInfo.startDate <= block.timestamp, "EchodexFarm: NOT_START");
        require(block.timestamp <= poolInfo.endDate, "EchodexFarm: OVER_TIME");

        PoolReward storage poolReward = poolRewards[poolId];
        if (poolReward.lastRewardTimestamp == 0) {
            poolReward.lastRewardTimestamp = block.timestamp;
        }

        if (poolReward.startTimeExcess != 0) {
            poolReward.totalExcessReward = poolReward.totalExcessReward.add(block.timestamp.sub(poolReward.startTimeExcess));
            poolReward.startTimeExcess = 0;
        }

        User storage user = users[msg.sender][poolId];

        _update(poolInfo, poolReward);
        _audit(user, poolReward);

        TransferHelper.safeTransferFrom(poolInfo.pairAddress, msg.sender, address(this), amountLP);
        poolReward.totalLP = poolReward.totalLP.add(amountLP);
        user.amount = user.amount.add(amountLP);
        user.rewardDebt = user.amount.mul(poolReward.accAmountPerShare).div(1e12);

        emit PoolUpdate(poolId, poolReward.accAmountPerShare, poolReward.totalLP, poolReward.totalReward, poolReward.lastRewardTimestamp);
        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
        emit Stake(poolId, msg.sender, amountLP);
    }

    function unstake(uint256 poolId, uint256 amountLP) external {
        require(amountLP > 0 , "EchodexFarm: AMOUNT_LP_NOT_ZERO");

        PoolInfo storage poolInfo = poolInfos[poolId];
        PoolReward storage poolReward = poolRewards[poolId];
        User storage user = users[msg.sender][poolId];
        require(amountLP <= user.amount , "EchodexFarm: INSUFFICIENT_AMOUNT");

        _update(poolInfo, poolReward);
        _audit(user, poolReward);

        _safeTransfer(poolInfo.pairAddress, msg.sender, amountLP);

        poolReward.totalLP = poolReward.totalLP.sub(amountLP);
        user.amount = user.amount.sub(amountLP);
        user.rewardDebt = user.amount.mul(poolReward.accAmountPerShare).div(1e12);

        if (poolReward.totalLP == 0 && block.timestamp < poolInfo.endDate) {
            poolReward.startTimeExcess = block.timestamp;
        }

        emit PoolUpdate(poolId, poolReward.accAmountPerShare, poolReward.totalLP, poolReward.totalReward, poolReward.lastRewardTimestamp);
        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
        emit Unstake(poolId, msg.sender, amountLP);
    }

    function harvest(uint256 poolId) external {
        PoolInfo storage poolInfo = poolInfos[poolId];
        PoolReward storage poolReward = poolRewards[poolId];
        User storage user = users[msg.sender][poolId];

        _update(poolInfo, poolReward);
        _audit(user, poolReward);

        require(user.rewardEarn > 0, "EchodexFarm: NO_REWARD");

        if (poolInfo.tokenReward == WETH) {
            msg.sender.transfer(user.rewardEarn);
        } else {
            _safeTransfer(poolInfo.tokenReward, msg.sender, user.rewardEarn);
        }
      
        emit Harvest(poolId, msg.sender, user.rewardEarn);

        user.rewardEarn = 0;

        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
    }

    function withdrawExcessReward(uint256 poolId) external {
        PoolInfo storage poolInfo = poolInfos[poolId];
        PoolReward storage poolReward = poolRewards[poolId];
        require(poolInfo.owner == msg.sender, "EchodexFarm: NO_PERMISSION");
        require(poolInfo.endDate < block.timestamp, "EchodexFarm: POOL_NOT_END");

        if (poolReward.startTimeExcess != 0) {
            poolReward.totalExcessReward = poolReward.totalExcessReward.add(poolInfo.realEndDate.sub(poolReward.startTimeExcess));
            poolReward.startTimeExcess = 0;
        }

        require(poolReward.totalExcessReward > 0, "EchodexFarm: NO_EXCESS");

        if (poolInfo.tokenReward == WETH) {
            msg.sender.transfer(poolReward.totalExcessReward.mul(poolReward.amountPerSecond));
        } else {
            _safeTransfer(poolInfo.tokenReward, msg.sender, poolReward.totalExcessReward.mul(poolReward.amountPerSecond));
        }

        emit WithdrawExcess(poolId, poolReward.totalExcessReward);
        poolReward.totalExcessReward = 0;
    }

    function setBlueCheck(uint256 poolId, bool isBlueCheck) external {
        require(owner == msg.sender, "EchodexFarm: FORBIDDEN");
        require(poolId < currentPoolId, "EchodexFarm: NOT_EXIST");

        emit BlueCheck(poolId, isBlueCheck);
    }

    function stopPool(uint256 poolId) external {
        PoolInfo storage poolInfo = poolInfos[poolId];
        PoolReward storage poolReward = poolRewards[poolId];
        require(poolInfo.owner == msg.sender, "EchodexFarm: NO_PERMISSION");

        if (poolReward.startTimeExcess != 0) {
            poolReward.totalExcessReward = poolReward.totalExcessReward.add(poolInfo.endDate.sub(poolReward.startTimeExcess));
            poolReward.startTimeExcess = 0;
        } else {
            poolReward.totalExcessReward = poolReward.totalExcessReward.add(poolInfo.endDate.sub(block.timestamp));
        }

        poolInfo.endDate = block.timestamp;

        emit StopPool(poolId);
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'EchodexFarm: TRANSFER_FAILED');
    }

    function _update(PoolInfo storage poolInfo, PoolReward storage poolReward) private {
        if (poolReward.totalLP > 0 && poolReward.lastRewardTimestamp <= poolInfo.endDate) {
            uint256 currentReward = block.timestamp.sub(poolReward.lastRewardTimestamp).mul(poolReward.amountPerSecond);
            if (block.timestamp > poolInfo.endDate) {
                currentReward = poolInfo.endDate.sub(poolReward.lastRewardTimestamp).mul(poolReward.amountPerSecond);
                poolReward.lastRewardTimestamp = poolInfo.endDate;
            } else {
                poolReward.lastRewardTimestamp = block.timestamp;
            }
            poolReward.accAmountPerShare = poolReward.accAmountPerShare.add(currentReward.mul(1e12).div(poolReward.totalLP));
            poolReward.totalReward = poolReward.totalReward.add(currentReward);
        }
    }

    function _audit(User storage user, PoolReward storage poolReward) private {
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(poolReward.accAmountPerShare).div(1e12).sub(user.rewardDebt);
            user.rewardEarn = user.rewardEarn.add(pending);
            user.rewardDebt = user.amount.mul(poolReward.accAmountPerShare).div(1e12);
        }
    }
}