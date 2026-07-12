// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";
import "./RWAToken.sol";

/// @title BasketVault
/// @notice A one-click investable basket of synthetic RWA tokens on HashKey Chain.
///
///         Users deposit the stablecoin (USDC, 6 decimals). The vault splits the
///         deposit across the basket's assets by target weight, minting synthetic
///         RWA tokens to itself at the oracle price, and mints basket shares
///         (18 decimals) to the user at the current NAV. Redemption burns shares
///         and underlying units pro-rata and pays out USDC at NAV.
///
///         Synthetic spot: no margin, no liquidation. Assets are priced via
///         NYSE/NASDAQ-linked oracles, avoiding thin on-chain orderbook distortion.
///         Deposited USDC stays in the vault as collateral; the treasury can add
///         collateral via fund() as a solvency backstop when NAV outgrows deposits.
contract BasketVault is ERC20, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE"); // rebalancer (AI agent)

    uint256 public constant BPS = 10_000;
    uint256 public constant PRICE_DECIMALS = 1e8; // oracle price decimals

    IERC20 public immutable stable;        // USDC, 6 decimals
    PriceOracle public immutable oracle;
    address public treasury;

    RWAToken[] public assets;
    uint16[] public weightsBps;            // target weights, sums to 10_000

    uint256 public entryFeeBps;            // e.g. 50 = 0.5%
    uint256 public minInvest;              // in stable units (6 decimals)

    event Invested(address indexed user, uint256 stableIn, uint256 fee, uint256 sharesOut);
    event Redeemed(address indexed user, uint256 sharesIn, uint256 stableOut);
    event Rebalanced(uint16[] oldWeights, uint16[] newWeights, string reason);
    event Funded(address indexed from, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        address stable_,
        address oracle_,
        address[] memory assets_,
        uint16[] memory weightsBps_,
        address treasury_,
        uint256 entryFeeBps_,
        uint256 minInvest_,
        address admin_
    ) ERC20(name_, symbol_) {
        require(assets_.length > 0 && assets_.length == weightsBps_.length, "vault: bad config");
        uint256 sum;
        for (uint256 i = 0; i < weightsBps_.length; i++) sum += weightsBps_[i];
        require(sum == BPS, "vault: weights != 100%");
        require(entryFeeBps_ <= 500, "vault: fee too high");

        stable = IERC20(stable_);
        oracle = PriceOracle(oracle_);
        treasury = treasury_;
        entryFeeBps = entryFeeBps_;
        minInvest = minInvest_;
        for (uint256 i = 0; i < assets_.length; i++) {
            assets.push(RWAToken(assets_[i]));
        }
        weightsBps = weightsBps_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(MANAGER_ROLE, admin_);
    }

    // ---------------------------------------------------------------- views

    function assetCount() external view returns (uint256) {
        return assets.length;
    }

    function getAssets() external view returns (address[] memory addrs, uint16[] memory weights) {
        addrs = new address[](assets.length);
        weights = weightsBps;
        for (uint256 i = 0; i < assets.length; i++) addrs[i] = address(assets[i]);
    }

    /// @notice Total basket value in stable units (6 decimals).
    function totalValue() public view returns (uint256 value) {
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 units = assets[i].balanceOf(address(this)); // 18 decimals
            if (units == 0) continue;
            uint256 price = oracle.getPrice(address(assets[i])); // 8 decimals
            // units(1e18) * price(1e8) -> USD(1e26); scale to 6 decimals
            value += (units * price) / 1e20;
        }
    }

    /// @notice NAV per share in stable units (6 decimals). 1e6 = $1.00.
    function sharePrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e6;
        return (totalValue() * 1e18) / supply;
    }

    function previewInvest(uint256 amount) external view returns (uint256 sharesOut, uint256 fee) {
        fee = (amount * entryFeeBps) / BPS;
        uint256 net = amount - fee;
        uint256 supply = totalSupply();
        if (supply == 0) {
            sharesOut = net * 1e12; // bootstrap: 1 share = $1
        } else {
            sharesOut = (net * supply) / totalValue();
        }
    }

    function previewRedeem(uint256 shares) external view returns (uint256 stableOut) {
        uint256 supply = totalSupply();
        require(supply > 0, "vault: empty");
        // Solvent payout: the lesser of NAV-per-share and the redeemer's
        // pro-rata slice of the actual USDC collateral (see redeem()).
        uint256 navOut = (shares * totalValue()) / supply;
        uint256 collateralOut = (stable.balanceOf(address(this)) * shares) / supply;
        stableOut = navOut < collateralOut ? navOut : collateralOut;
    }

    // -------------------------------------------------------------- actions

    /// @notice Invest `amount` of stable and receive basket shares at NAV.
    function invest(uint256 amount) external nonReentrant returns (uint256 sharesOut) {
        require(amount >= minInvest, "vault: below minimum");

        uint256 fee = (amount * entryFeeBps) / BPS;
        uint256 net = amount - fee;

        uint256 valueBefore = totalValue();
        uint256 supply = totalSupply();

        stable.safeTransferFrom(msg.sender, address(this), net);
        if (fee > 0) stable.safeTransferFrom(msg.sender, treasury, fee);

        // Mint underlying synthetic units per target weight at oracle prices.
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 portion = (net * weightsBps[i]) / BPS;
            if (portion == 0) continue;
            uint256 price = oracle.getPrice(address(assets[i]));
            // portion(1e6) -> units(1e18): portion * 1e20 / price(1e8)
            uint256 units = (portion * 1e20) / price;
            assets[i].mint(address(this), units);
        }

        if (supply == 0) {
            sharesOut = net * 1e12;
        } else {
            sharesOut = (net * supply) / valueBefore;
        }
        _mint(msg.sender, sharesOut);
        emit Invested(msg.sender, amount, fee, sharesOut);
    }

    /// @notice Redeem shares for stable. Payout is the lesser of NAV-per-share
    ///         and the redeemer's pro-rata slice of the vault's actual USDC
    ///         collateral. This keeps the vault solvent by construction: in a
    ///         rising market where synthetic NAV outruns deposited collateral,
    ///         every holder redeems their fair pro-rata share of the real USDC
    ///         (order-independent, no bank run), and once the treasury tops up
    ///         collateral via fund() payouts rise to full NAV.
    function redeem(uint256 shares) external nonReentrant returns (uint256 stableOut) {
        uint256 supply = totalSupply();
        require(shares > 0 && shares <= balanceOf(msg.sender), "vault: bad shares");

        uint256 navOut = (shares * totalValue()) / supply;
        uint256 collateralOut = (stable.balanceOf(address(this)) * shares) / supply;
        stableOut = navOut < collateralOut ? navOut : collateralOut;

        // Burn pro-rata underlying units.
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 units = (assets[i].balanceOf(address(this)) * shares) / supply;
            if (units > 0) assets[i].burn(address(this), units);
        }

        _burn(msg.sender, shares);
        stable.safeTransfer(msg.sender, stableOut);
        emit Redeemed(msg.sender, shares, stableOut);
    }

    /// @notice Value-neutral rebalance to new target weights: burns all units and
    ///         re-mints per the new weights at current oracle prices. Called by the
    ///         AI portfolio agent when the strategy thesis changes.
    function rebalance(uint16[] calldata newWeights, string calldata reason) external onlyRole(MANAGER_ROLE) {
        require(newWeights.length == assets.length, "vault: bad weights");
        uint256 sum;
        for (uint256 i = 0; i < newWeights.length; i++) sum += newWeights[i];
        require(sum == BPS, "vault: weights != 100%");

        uint256 value = totalValue(); // 6 decimals
        uint16[] memory old = weightsBps;
        weightsBps = newWeights;

        if (value > 0) {
            for (uint256 i = 0; i < assets.length; i++) {
                uint256 held = assets[i].balanceOf(address(this));
                if (held > 0) assets[i].burn(address(this), held);
            }
            for (uint256 i = 0; i < assets.length; i++) {
                uint256 portion = (value * newWeights[i]) / BPS;
                if (portion == 0) continue;
                uint256 price = oracle.getPrice(address(assets[i]));
                assets[i].mint(address(this), (portion * 1e20) / price);
            }
        }
        emit Rebalanced(old, newWeights, reason);
    }

    /// @notice Solvency backstop: anyone (in practice the treasury) can add collateral.
    function fund(uint256 amount) external {
        stable.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = t;
    }

    function setFees(uint256 entryFeeBps_, uint256 minInvest_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(entryFeeBps_ <= 500, "vault: fee too high");
        entryFeeBps = entryFeeBps_;
        minInvest = minInvest_;
    }
}
