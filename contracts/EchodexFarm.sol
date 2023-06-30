// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.6.6;

import './interfaces/IERC20.sol';
import './interfaces/IEchodexFactory.sol';
import "./libraries/TransferHelper.sol";
import "./libraries/SafeMath.sol";

contract EchodexFarm {
    using SafeMath  for uint;

    address public owner;
    uint256 public currentPoolId;
    address public factory;

    address public immutable WETH;

    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    struct Pool {
        uint256 poolId;
        address pairAddress;
        uint256 amountReward;
        address tokenReward;
        uint256 startDate;  // second timestamp
        uint256 endDate;    // second timestamp
        uint256 accAmountPerShare;
        uint256 totalLP;
        uint256 totalReward;
        uint256 amountPerSecond;
        uint256 lastRewardTimestamp;
        address owner;
        uint256 totalExcessReward;
        uint256 startTimeExcess;
    }
    mapping (uint256 => Pool) public pools;

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

    constructor(address _factory, address _WETH) public {
        owner = msg.sender;
        factory = _factory;
        WETH = _WETH;
    }

    function createPool(address tokenA, address tokenB, uint256 amountReward, address tokenReward, uint256 startDate, uint256 endDate) external {
        require(block.timestamp <= startDate, "EchodexFarm: WRONG_TIME");
        require(startDate + 30 * 60 <= endDate, "EchodexFarm: WRONG_TIME");
        require(amountReward > 0, "EchodexFarm: AMOUNT_NOT_VALID");
        address pairAddress = IEchodexFactory(factory).getPair(tokenA, tokenB);
        require(pairAddress != address(0), "EchodexFarm: PAIR_NOT_EXIST");

        uint256 amountPerSecond = amountReward.div(endDate.sub(startDate));
        pools[currentPoolId] = Pool({
            poolId: currentPoolId,
            pairAddress: pairAddress,
            amountReward: amountReward,
            tokenReward: tokenReward,
            startDate: startDate,
            endDate: endDate,
            accAmountPerShare: 0,
            totalLP: 0,
            totalReward: 0,
            amountPerSecond: amountPerSecond,
            lastRewardTimestamp: 0,
            owner: msg.sender,
            startTimeExcess: startDate,
            totalExcessReward: 0
        });

        TransferHelper.safeTransferFrom(tokenReward, msg.sender, address(this), amountReward);
        emit PoolCreated(currentPoolId, pairAddress, tokenA, tokenB, amountReward, tokenReward, startDate, endDate, amountPerSecond);

        currentPoolId++;
    }

    function createPoolRewardETH(address tokenA, address tokenB, uint256 startDate, uint256 endDate) payable external {
        require(block.timestamp <= startDate, "EchodexFarm: WRONG_TIME");
        require(startDate + 30 * 60 <= endDate, "EchodexFarm: WRONG_TIME");
        require(msg.value > 0, "EchodexFarm: AMOUNT_NOT_VALID");
        
        address pairAddress = IEchodexFactory(factory).getPair(tokenA, tokenB);
        require(pairAddress != address(0), "EchodexFarm: PAIR_NOT_EXIST");
       

        uint256 amountPerSecond = msg.value.div(endDate.sub(startDate));
        pools[currentPoolId] = Pool({
            poolId: currentPoolId,
            pairAddress: pairAddress,
            amountReward: msg.value,
            tokenReward: WETH,
            startDate: startDate,
            endDate: endDate,
            accAmountPerShare: 0,
            totalLP: 0,
            totalReward: 0,
            amountPerSecond: amountPerSecond,
            lastRewardTimestamp: 0,
            owner: msg.sender,
            startTimeExcess: startDate,
            totalExcessReward: 0
        });

        emit PoolCreated(currentPoolId, pairAddress, tokenA, tokenB, msg.value, WETH, startDate, endDate, amountPerSecond);

        currentPoolId++;
    }

    function stake(uint256 poolId, uint256 amountLP) external {
        require(amountLP > 0 , "EchodexFarm: AMOUNT_LP_NOT_ZERO");

        Pool storage pool = pools[poolId];
        require(pool.startDate <= block.timestamp, "EchodexFarm: NOT_START");
        require(block.timestamp <= pool.endDate, "EchodexFarm: OVER_TIME");

        if (pool.lastRewardTimestamp == 0) {
            pool.lastRewardTimestamp = block.timestamp;
        }

        if (pool.startTimeExcess != 0) {
            pool.totalExcessReward = pool.totalExcessReward.add(block.timestamp.sub(pool.startTimeExcess));
            pool.startTimeExcess = 0;
        }

        User storage user = users[msg.sender][poolId];

        _update(pool);
        _audit(user, pool);

        TransferHelper.safeTransferFrom(pool.pairAddress, msg.sender, address(this), amountLP);
        pool.totalLP = pool.totalLP.add(amountLP);
        user.amount = user.amount.add(amountLP);
        user.rewardDebt = user.amount.mul(pool.accAmountPerShare).div(1e12);

        emit PoolUpdate(poolId, pool.accAmountPerShare, pool.totalLP, pool.totalReward, pool.lastRewardTimestamp);
        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
        emit Stake(poolId, msg.sender, amountLP);
    }

    function unstake(uint256 poolId, uint256 amountLP) external {
        require(amountLP > 0 , "EchodexFarm: AMOUNT_LP_NOT_ZERO");

        Pool storage pool = pools[poolId];
        User storage user = users[msg.sender][poolId];
        require(amountLP <= user.amount , "EchodexFarm: INSUFFICIENT_AMOUNT");

        _update(pool);
        _audit(user, pool);

        _safeTransfer(pool.pairAddress, msg.sender, amountLP);

        pool.totalLP = pool.totalLP.sub(amountLP);
        user.amount = user.amount.sub(amountLP);
        user.rewardDebt = user.amount.mul(pool.accAmountPerShare).div(1e12);

        if (pool.totalLP == 0) {
            pool.startTimeExcess = block.timestamp;
        }

        emit PoolUpdate(poolId, pool.accAmountPerShare, pool.totalLP, pool.totalReward, pool.lastRewardTimestamp);
        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
        emit Unstake(poolId, msg.sender, amountLP);
    }

    function harvest(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        User storage user = users[msg.sender][poolId];

        require(pool.tokenReward != WETH, "EchodexFarm: ERROR");

        _update(pool);
        _audit(user, pool);

        require(user.rewardEarn > 0, "EchodexFarm: NO_REWARD");

        _safeTransfer(pool.tokenReward, msg.sender, user.rewardEarn);

        emit Harvest(poolId, msg.sender, user.rewardEarn);

        user.rewardEarn = 0;

        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
    }

    function harvestETH(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        User storage user = users[msg.sender][poolId];

        require(pool.tokenReward == WETH, "EchodexFarm: ERROR");

        _update(pool);
        _audit(user, pool);

        require(user.rewardEarn > 0, "EchodexFarm: NO_REWARD");

        msg.sender.transfer(user.rewardEarn);

        emit Harvest(poolId, msg.sender, user.rewardEarn);

        user.rewardEarn = 0;

        emit UserUpdate(msg.sender, poolId, user.amount, user.rewardDebt, user.rewardEarn);
    }


    function withdrawExcessReward(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        require(pool.owner == msg.sender, "EchodexFarm: NO_PERMISSION");
        require(pool.endDate < block.timestamp, "EchodexFarm: POOL_NOT_END");

        if (pool.startTimeExcess != 0) {
            pool.totalExcessReward = pool.totalExcessReward.add(pool.endDate.sub(pool.startTimeExcess));
            pool.startTimeExcess = 0;
        }

        require(pool.totalExcessReward > 0, "EchodexFarm: NO_EXCESS");

        _safeTransfer(pool.tokenReward, msg.sender, pool.totalExcessReward.mul(pool.amountPerSecond));
        emit WithdrawExcess(poolId, pool.totalExcessReward);
        pool.totalExcessReward = 0;
    }

    function setBlueCheck(uint256 poolId, bool isBlueCheck) external {
        require(owner == msg.sender, "EchodexFarm: FORBIDDEN");
        require(poolId < currentPoolId, "EchodexFarm: NOT_EXIST");

        emit BlueCheck(poolId, isBlueCheck);
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'EchodexFarm: TRANSFER_FAILED');
    }

    function _update(Pool storage pool) private {
        if (pool.totalLP > 0 && pool.lastRewardTimestamp <= pool.endDate) {
            uint256 currentReward = block.timestamp.sub(pool.lastRewardTimestamp).mul(pool.amountPerSecond);
            if (block.timestamp > pool.endDate) {
                currentReward = pool.endDate.sub(pool.lastRewardTimestamp).mul(pool.amountPerSecond);
                pool.lastRewardTimestamp = pool.endDate;
            } else {
                pool.lastRewardTimestamp = block.timestamp;
            }
            pool.accAmountPerShare = pool.accAmountPerShare.add(currentReward.mul(1e12).div(pool.totalLP));
            pool.totalReward = pool.totalReward.add(currentReward);
        }
    }

    function _audit(User storage user, Pool storage pool) private {
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accAmountPerShare).div(1e12).sub(user.rewardDebt);
            user.rewardEarn = user.rewardEarn.add(pending);
            user.rewardDebt = user.amount.mul(pool.accAmountPerShare).div(1e12);
        }
    }
}