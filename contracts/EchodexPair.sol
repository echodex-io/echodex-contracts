// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.5.16;

import './interfaces/IEchodexPair.sol';
import './EchodexERC20.sol';
import './libraries/Math.sol';
import './libraries/UQ112x112.sol';
import './interfaces/IERC20.sol';
import './interfaces/IEchodexFactory.sol';
import './interfaces/IEchodexCallee.sol';

contract EchodexPair is IEchodexPair, EchodexERC20 {
    using SafeMath  for uint;
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;           // uses single storage slot, accessible via getReserves
    uint112 private reserve1;           // uses single storage slot, accessible via getReserves
    uint32  private blockTimestampLast; // uses single storage slot, accessible via getReserves

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint public totalFee;
    uint public currentFee;

    event UseTokenFeeInPool(address receiveFee, uint fee);

    struct SwapState {
        uint balance0;
        uint balance1;
        bool isSubTokenOut;
        uint amount0In;
        uint amount1In;
    }

    struct SwapVarTemp {
        address token0;
        address token1;
        uint amount0Out;
        uint amount1Out;
        address to;
        bytes data;
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
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

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
    function _payFee(uint fee, uint feeRefund, address to, bool payWithTokenFee) private returns (bool isSubTokenOut) {
        isSubTokenOut = false;
        address tokenFee = IEchodexFactory(factory).tokenFee();
        address receiveFee = IEchodexFactory(factory).receiveFee();
        if (currentFee > 0) { //pay with token in pool
            require(currentFee >= (fee + feeRefund), 'Echodex: INSUFFICIENT_FEE');
            currentFee = currentFee - fee;
            _safeTransfer(tokenFee, receiveFee, fee);
            emit UseTokenFeeInPool(receiveFee, fee);
            if (feeRefund > 0) {
                currentFee = currentFee - feeRefund;
                _safeTransfer(tokenFee, to, feeRefund);
                emit UseTokenFeeInPool(to, feeRefund);
            }
        } else { 
            if (!payWithTokenFee) {
                isSubTokenOut = true;
            } else {
                uint balanceTokenFeeInWalletUser = IERC20(tokenFee).balanceOf(to);
                if (balanceTokenFeeInWalletUser >= fee) { // pay with token in user wallet
                    IERC20(tokenFee).transferFrom(msg.sender, receiveFee, fee);
                } else { // pay with sub tokenOut
                    isSubTokenOut = true;
                }
            }
        }
    }

    // this low-level function should be called from a contract which performs important safety checks
    function mint(address to) external lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
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

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // this low-level function should be called from a contract which performs important safety checks
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock { // payWithTokenFee = false
        require(amount0Out > 0 || amount1Out > 0, 'Echodex: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'Echodex: INSUFFICIENT_LIQUIDITY');

        SwapState memory state = SwapState({
            balance0: 0,
            balance1: 0,
            isSubTokenOut: false,
            amount0In: 0,
            amount1In: 0
        });
        { // scope for _token{0,1}, avoids stack too deep errors
        SwapVarTemp memory stateTemp = SwapVarTemp({
            token0: token0,
            token1: token1,
            amount0Out: amount0Out,
            amount1Out: amount1Out,
            to: to,
            data: data
        });

        require(stateTemp.to != stateTemp.token0 && stateTemp.to != stateTemp.token1, 'Echodex: INVALID_TO');

        uint amountOut = stateTemp.amount0Out > 0 ? stateTemp.amount0Out : stateTemp.amount1Out;
        address tokenOut = stateTemp.amount0Out > 0 ? stateTemp.token0 : stateTemp.token1;

        //fee 
        (uint fee, uint feeRefund) = IEchodexFactory(factory).calcFee(amountOut, tokenOut, address(this), factory);
        state.isSubTokenOut = _payFee(fee, feeRefund, stateTemp.to, false); 

        if (state.isSubTokenOut) {
            amountOut = amountOut - amountOut * IEchodexFactory(factory).percentFeeCaseSubTokenOut() / (100 * 10 ** 18); // fee (0.3 * 10 **18)% amountOut
            _safeTransfer(tokenOut, stateTemp.to, amountOut);
        } else {
            _safeTransfer(tokenOut, stateTemp.to, amountOut);
        }

        if (stateTemp.data.length > 0) IEchodexCallee(stateTemp.to).echodexCall(msg.sender, stateTemp.amount0Out, stateTemp.amount1Out, stateTemp.data);
        state.balance0 = IERC20(stateTemp.token0).balanceOf(address(this));
        state.balance1 = IERC20(stateTemp.token1).balanceOf(address(this));
        }

        state.amount0In = state.balance0 > _reserve0 - amount0Out ? state.balance0 - (_reserve0 - amount0Out) : 0;
        state.amount1In = state.balance1 > _reserve1 - amount1Out ? state.balance1 - (_reserve1 - amount1Out) : 0;
        require(state.amount0In > 0 || state.amount1In > 0, 'Echodex: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        if (state.isSubTokenOut) {
            uint balance0Adjusted = state.balance0.mul(1000).sub(state.amount0In.mul(3));
            uint balance1Adjusted = state.balance1.mul(1000).sub(state.amount1In.mul(3));
            require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'Echodex: K');
        } else {
            require(state.balance0.mul(state.balance1).mul(1000**2) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'Echodex: K');
        }
        }
      
        // 100 * 1000
        // 1 -> 9.9009901 // 9.87128713 tru fee
        // 101 * 990.09901
        _update(state.balance0, state.balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, state.amount0In, state.amount1In, amount0Out, amount1Out, to);
    }

    function swapPayWithTokenFee(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock { // payWithTokenFee = true
        require(amount0Out > 0 || amount1Out > 0, 'Echodex: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'Echodex: INSUFFICIENT_LIQUIDITY');

        SwapState memory state = SwapState({
            balance0: 0,
            balance1: 0,
            isSubTokenOut: false,
            amount0In: 0,
            amount1In: 0
        });
        { // scope for _token{0,1}, avoids stack too deep errors
        SwapVarTemp memory stateTemp = SwapVarTemp({
            token0: token0,
            token1: token1,
            amount0Out: amount0Out,
            amount1Out: amount1Out,
            to: to,
            data: data
        });

        require(stateTemp.to != stateTemp.token0 && stateTemp.to != stateTemp.token1, 'Echodex: INVALID_TO');

        uint amountOut = stateTemp.amount0Out > 0 ? stateTemp.amount0Out : stateTemp.amount1Out;
        address tokenOut = stateTemp.amount0Out > 0 ? stateTemp.token0 : stateTemp.token1;

        //fee 
        (uint fee, uint feeRefund) = IEchodexFactory(factory).calcFee(amountOut, tokenOut, address(this), factory);
        state.isSubTokenOut = _payFee(fee, feeRefund, stateTemp.to, true); 

        if (state.isSubTokenOut) {
            amountOut = amountOut - amountOut * IEchodexFactory(factory).percentFeeCaseSubTokenOut() / (100 * 10 ** 18); // fee (0.3 * 10 **18)% amountOut
            _safeTransfer(tokenOut, stateTemp.to, amountOut);
        } else {
            _safeTransfer(tokenOut, stateTemp.to, amountOut);
        }

        if (stateTemp.data.length > 0) IEchodexCallee(stateTemp.to).echodexCall(msg.sender, stateTemp.amount0Out, stateTemp.amount1Out, stateTemp.data);
        state.balance0 = IERC20(stateTemp.token0).balanceOf(address(this));
        state.balance1 = IERC20(stateTemp.token1).balanceOf(address(this));
        }

        state.amount0In = state.balance0 > _reserve0 - amount0Out ? state.balance0 - (_reserve0 - amount0Out) : 0;
        state.amount1In = state.balance1 > _reserve1 - amount1Out ? state.balance1 - (_reserve1 - amount1Out) : 0;
        require(state.amount0In > 0 || state.amount1In > 0, 'Echodex: INSUFFICIENT_INPUT_AMOUNT');
        { // scope for reserve{0,1}Adjusted, avoids stack too deep errors
        if (state.isSubTokenOut) {
            uint balance0Adjusted = state.balance0.mul(1000).sub(state.amount0In.mul(3));
            uint balance1Adjusted = state.balance1.mul(1000).sub(state.amount1In.mul(3));
            require(balance0Adjusted.mul(balance1Adjusted) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'Echodex: K');
        } else {
            require(state.balance0.mul(state.balance1).mul(1000**2) >= uint(_reserve0).mul(_reserve1).mul(1000**2), 'Echodex: K');
        }
        }
      
        // 100 * 1000
        // 1 -> 9.9009901 // 9.87128713 tru fee
        // 101 * 990.09901
        _update(state.balance0, state.balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, state.amount0In, state.amount1In, amount0Out, amount1Out, to);
    }

    function addFee(uint amount, address from) external lock {
        address tokenFee = IEchodexFactory(factory).tokenFee();
        IERC20(tokenFee).transferFrom(from, address(this), amount);
        totalFee = totalFee + amount;
        currentFee = currentFee + amount;
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