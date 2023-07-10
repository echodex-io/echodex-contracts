pragma solidity =0.6.6;


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
contract EchodexERC20 {
    using SafeMath for uint256;

    string public constant name = "Echodex LPs";
    string public constant symbol = "Echodex-LP";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor() public {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
    }

    function _mint(address to, uint256 value) internal {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        balanceOf[from] = balanceOf[from].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint256 value) private {
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        if (allowance[from][msg.sender] != uint256(-1)) {
            allowance[from][msg.sender] = allowance[from][msg.sender].sub(
                value
            );
        }
        _transfer(from, to, value);
        return true;
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "Echodex: EXPIRED");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH,
                        owner,
                        spender,
                        value,
                        nonces[owner]++,
                        deadline
                    )
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(
            recoveredAddress != address(0) && recoveredAddress == owner,
            "Echodex: INVALID_SIGNATURE"
        );
        _approve(owner, spender, value);
    }
}

// SPDX-License-Identifier: GPL-3.0
// a library for performing various math operations
library Math {
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

// SPDX-License-Identifier: GPL-3.0
// a library for handling binary fixed point numbers (https://en.wikipedia.org/wiki/Q_(number_format))
// range: [0, 2**112 - 1]
// resolution: 1 / 2**112
library UQ112x112 {
    uint224 constant Q112 = 2**112;

    // encode a uint112 as a UQ112x112
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112; // never overflows
    }

    // divide a UQ112x112 by a uint112, returning a UQ112x112
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}

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

// SPDX-License-Identifier: GPL-3.0
interface IEchodexCallee {
    function echodexCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}

// SPDX-License-Identifier: GPL-3.0
interface IxECP {
    function mintReward(address _user, uint256 _amount) external;
    function setMinter(address _minter) external;
}

// SPDX-License-Identifier: GPL-3.0
contract EchodexPair is EchodexERC20 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));
    uint private constant FEE_DENOMINATOR = 10000;
    uint private constant MAX_PAY_DEFAULT_PERCENT = 30; // 0.3%
    uint private constant MAX_PAY_WITH_TOKEN_FEE_PERCENT = 10; // 0.1%

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1, as of immed`iately after the most recent liquidity event

    uint public totalFee;
    uint public currentFee;

    struct SwapState {
        uint balance0;
        uint balance1;
        uint amount0In;
        uint amount1In;
        uint112 _reserve0;
        uint112 _reserve1;
    }

    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'Echodex: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'Echodex: TRANSFER_FAILED');
    }

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to,
        uint amountTokenFee,
        uint amountTokenReward
    );
    event Sync(uint112 reserve0, uint112 reserve1);
    event AddFee(uint amount);

    constructor() public {
        factory = msg.sender;
        totalFee = 0;
        currentFee = 0;
    }

    // called once by the factory at time of deployment
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, 'Echodex: FORBIDDEN'); // sufficient check
        token0 = _token0;
        token1 = _token1;
    }

    // update reserves and, on the first call per block, price accumulators
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= uint112(-1) && balance1 <= uint112(-1), 'Echodex: OVERFLOW');
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    // pay fee
    function _payFee(uint fee) private { //payWithTokenFee = true
        address tokenFee = IEchodexFactory(factory).tokenFee();
        address receiveFeeAddress = IEchodexFactory(factory).receiveFeeAddress();
        require(currentFee >= fee, 'Echodex: INSUFFICIENT_FEE_TOKEN');

        currentFee = currentFee - fee;
        _safeTransfer(tokenFee, receiveFeeAddress, fee);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function mint(address to) external lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));

        if (token0 == IEchodexFactory(factory).tokenFee()) {
            balance0 = balance0.sub(currentFee);
        }

        if (token1 == IEchodexFactory(factory).tokenFee()) {
            balance1 = balance1.sub(currentFee);
        }

        uint amount0 = balance0.sub(_reserve0);
        uint amount1 = balance1.sub(_reserve1);

        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
           _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
        }
        require(liquidity > 0, 'Echodex: INSUFFICIENT_LIQUIDITY_MINTED');
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function burn(address to) external lock returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        if (token0 == IEchodexFactory(factory).tokenFee()) {
            balance0 = balance0.sub(currentFee);
        }

        if (token1 == IEchodexFactory(factory).tokenFee()) {
            balance1 = balance1.sub(currentFee);
        }

        uint liquidity = balanceOf[address(this)];

        uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
        amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
        amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(amount0 > 0 && amount1 > 0, 'Echodex: INSUFFICIENT_LIQUIDITY_BURNED');
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        if (token0 == IEchodexFactory(factory).tokenFee()) {
            balance0 = balance0.sub(currentFee);
        }

        if (token1 == IEchodexFactory(factory).tokenFee()) {
            balance1 = balance1.sub(currentFee);
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function _preSwap(uint amount0Out, uint amount1Out, address to) private view returns(SwapState memory state){
        require(amount0Out > 0 || amount1Out > 0, 'Echodex: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'Echodex: INSUFFICIENT_LIQUIDITY');
        state = SwapState({
            balance0: 0,
            balance1: 0,
            amount0In: 0,
            amount1In: 0,
            _reserve0: _reserve0,
            _reserve1: _reserve1
        });

        require(to != token0 && to != token1, 'Echodex: INVALID_TO');
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock { // payWithTokenFee = false
        SwapState memory state = _preSwap(amount0Out, amount1Out, to);

        uint amountOut = amount0Out > 0 ? amount0Out : amount1Out;
        address tokenOut = amount0Out > 0 ? token0 : token1;
        uint fee = amountOut.mul(MAX_PAY_DEFAULT_PERCENT) / FEE_DENOMINATOR;

        // calc reward
        uint rewardPercent = IEchodexFactory(factory).rewardPercent(address(this));
        uint amountTokenReward = 0;
        if(rewardPercent > 0 && IEchodexFactory(factory).feePathLength(tokenOut) > 0) {
            amountTokenReward = IEchodexFactory(factory).calcFeeOrReward(tokenOut, amountOut, rewardPercent);
            IxECP(IEchodexFactory(factory).tokenReward()).mintReward(to, amountTokenReward);
        }

        _safeTransfer(tokenOut, to, amountOut.sub(fee));
        _safeTransfer(tokenOut, IEchodexFactory(factory).receiveFeeAddress(), fee);

        if (data.length > 0) IEchodexCallee(to).echodexCall(msg.sender, amount0Out, amount1Out, data);
        state.balance0 = IERC20(token0).balanceOf(address(this));
        state.balance1 = IERC20(token1).balanceOf(address(this));

        if (token0 == IEchodexFactory(factory).tokenFee()) {
            state.balance0 = state.balance0.sub(currentFee);
        }

        if (token1 == IEchodexFactory(factory).tokenFee()) {
            state.balance1 = state.balance1.sub(currentFee);
        }

        state.amount0In = state.balance0 > state._reserve0 - amount0Out ? state.balance0 - (state._reserve0 - amount0Out) : 0;
        state.amount1In = state.balance1 > state._reserve1 - amount1Out ? state.balance1 - (state._reserve1 - amount1Out) : 0;
        require(state.amount0In > 0 || state.amount1In > 0, 'Echodex: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
            require(state.balance0.mul(state.balance1) >= uint(state._reserve0).mul(state._reserve1), 'Echodex: K');
        }

        _update(state.balance0, state.balance1, state._reserve0, state._reserve1);
        emit Swap(msg.sender, state.amount0In, state.amount1In, amount0Out, amount1Out, to, 0, amountTokenReward);
    }

    function swapPayWithTokenFee(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock { // payWithTokenFee = true
        SwapState memory state = _preSwap(amount0Out, amount1Out, to);

        uint amountOut = amount0Out > 0 ? amount0Out : amount1Out;
        address tokenOut = amount0Out > 0 ? token0 : token1;

        //fee
        uint fee = IEchodexFactory(factory).calcFeeOrReward(tokenOut, amountOut, MAX_PAY_WITH_TOKEN_FEE_PERCENT); // 0.1%
        _payFee(fee);
        _safeTransfer(tokenOut, to, amountOut);

        if (data.length > 0) IEchodexCallee(to).echodexCall(msg.sender, amount0Out, amount1Out, data);
        state.balance0 = IERC20(token0).balanceOf(address(this));
        state.balance1 = IERC20(token1).balanceOf(address(this));

        if (token0 == IEchodexFactory(factory).tokenFee()) {
            state.balance0 = state.balance0.sub(currentFee);
        }

        if (token1 == IEchodexFactory(factory).tokenFee()) {
            state.balance1 = state.balance1.sub(currentFee);
        }

        state.amount0In = state.balance0 > state._reserve0 - amount0Out ? state.balance0 - (state._reserve0 - amount0Out) : 0;
        state.amount1In = state.balance1 > state._reserve1 - amount1Out ? state.balance1 - (state._reserve1 - amount1Out) : 0;
        require(state.amount0In > 0 || state.amount1In > 0, 'Echodex: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        require(state.balance0.mul(state.balance1) >= uint(state._reserve0).mul(state._reserve1), 'Echodex: K');
        }
        _update(state.balance0, state.balance1, state._reserve0, state._reserve1);
        emit Swap(msg.sender, state.amount0In, state.amount1In, amount0Out, amount1Out, to, fee, 0);
    }

    function addFee(uint amount) external lock {
        address tokenFee = IEchodexFactory(factory).tokenFee();
        IERC20(tokenFee).transferFrom(msg.sender, address(this), amount);
        totalFee = totalFee + amount;
        currentFee = currentFee + amount;

        emit AddFee(amount);
    }

    function withdrawFee(uint amount) external lock {
        address owner = IEchodexFactory(factory).owner();
        require(owner == msg.sender, "Echodex: FORBIDDEN");
        require(amount <= currentFee, "Echodex: INSUFFICIENT_INPUT_AMOUNT");

        address tokenFee = IEchodexFactory(factory).tokenFee();
        address receiveFeeAddress = IEchodexFactory(factory).receiveFeeAddress();
        totalFee = totalFee - amount;
        currentFee = currentFee - amount;

        _safeTransfer(tokenFee, receiveFeeAddress, amount);
    }

    // force balances to match reserves
    function skim(address to) external lock {
        address _token0 = token0; // gas savings
        address _token1 = token1; // gas savings
        _safeTransfer(_token0, to, IERC20(_token0).balanceOf(address(this)).sub(reserve0));
        _safeTransfer(_token1, to, IERC20(_token1).balanceOf(address(this)).sub(reserve1));
    }

    // force reserves to match balances
    function sync() external lock {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)), reserve0, reserve1);
    }
}