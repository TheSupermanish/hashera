// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";
import "./RWAToken.sol";

/// @title StockStore
/// @notice Direct buy/sell of a single synthetic RWA token (a tokenized stock)
///         against USDC at the oracle price. Buying mints the token straight to
///         the user's wallet; selling burns it and pays USDC. The store must
///         hold VAULT_ROLE on every token it lists.
///
///         Same synthetic-spot model as BasketVault: no leverage, no
///         liquidation. Sell payout is capped at the store's USDC balance so it
///         is always solvent; the treasury tops up via fund() to cover gains.
contract StockStore is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    IERC20 public immutable stable; // USDC, 6 decimals
    PriceOracle public immutable oracle;
    address public treasury;
    uint256 public feeBps = 30; // 0.3%

    event Bought(address indexed user, address indexed token, uint256 stableIn, uint256 fee, uint256 units);
    event Sold(address indexed user, address indexed token, uint256 units, uint256 stableOut);
    event Funded(address indexed from, uint256 amount);

    constructor(address stable_, address oracle_, address treasury_, address admin_) {
        stable = IERC20(stable_);
        oracle = PriceOracle(oracle_);
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    // ------------------------------------------------------------- views

    /// @notice Units (18 dec) minted for `stableIn` (6 dec) and the fee taken.
    function previewBuy(address token, uint256 stableIn)
        external
        view
        returns (uint256 units, uint256 fee)
    {
        fee = (stableIn * feeBps) / BPS;
        uint256 net = stableIn - fee;
        uint256 price = oracle.getPrice(token); // 8 dec
        units = (net * 1e20) / price; // 6dec * 1e20 / 8dec -> 18dec
    }

    /// @notice USDC (6 dec) paid for selling `units` (18 dec), solvency-capped.
    function previewSell(address token, uint256 units) external view returns (uint256 stableOut) {
        uint256 price = oracle.getPrice(token);
        uint256 gross = (units * price) / 1e20; // 18dec * 8dec / 1e20 -> 6dec
        uint256 bal = stable.balanceOf(address(this));
        stableOut = gross <= bal ? gross : bal;
    }

    // ----------------------------------------------------------- actions

    /// @notice Buy `token` with `stableIn` USDC; tokens are minted to the buyer.
    function buy(address token, uint256 stableIn) external nonReentrant returns (uint256 units) {
        require(stableIn > 0, "store: zero");
        uint256 fee = (stableIn * feeBps) / BPS;
        uint256 net = stableIn - fee;

        stable.safeTransferFrom(msg.sender, address(this), net);
        if (fee > 0) stable.safeTransferFrom(msg.sender, treasury, fee);

        uint256 price = oracle.getPrice(token);
        units = (net * 1e20) / price;
        RWAToken(token).mint(msg.sender, units);
        emit Bought(msg.sender, token, stableIn, fee, units);
    }

    /// @notice Sell `units` of `token`; tokens are burned and USDC paid out.
    function sell(address token, uint256 units) external nonReentrant returns (uint256 stableOut) {
        require(units > 0, "store: zero");
        require(RWAToken(token).balanceOf(msg.sender) >= units, "store: insufficient balance");

        uint256 price = oracle.getPrice(token);
        uint256 gross = (units * price) / 1e20;
        uint256 bal = stable.balanceOf(address(this));
        stableOut = gross <= bal ? gross : bal;

        RWAToken(token).burn(msg.sender, units); // store holds VAULT_ROLE
        stable.safeTransfer(msg.sender, stableOut);
        emit Sold(msg.sender, token, units, stableOut);
    }

    /// @notice Add collateral so sells can pay full oracle value in an up market.
    function fund(uint256 amount) external {
        stable.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    function setFee(uint256 feeBps_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(feeBps_ <= 500, "store: fee too high");
        feeBps = feeBps_;
    }

    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = t;
    }
}
