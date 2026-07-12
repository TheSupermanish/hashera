// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PriceOracle
/// @notice Push oracle for RWA (tokenized equity) and crypto prices on HashKey Chain.
///         Prices are posted by off-chain updaters fed from NYSE/NASDAQ market data,
///         quoted in USD with 8 decimals (Chainlink convention).
contract PriceOracle is AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    struct PriceData {
        uint256 price;      // USD price, 8 decimals
        uint256 updatedAt;  // block timestamp of last update
    }

    /// asset token address => price data
    mapping(address => PriceData) private prices;

    /// Maximum staleness before reads revert. RWA markets close on weekends,
    /// so this is intentionally generous.
    uint256 public maxStaleness = 4 days;

    /// Max allowed move per update vs. the last price (basis points). A circuit
    /// breaker against a fat-fingered or compromised updater; admin can widen it
    /// or use setPriceForce for a legitimate large gap (e.g. a stock split).
    uint256 public maxDeviationBps = 3000; // 30%

    event PriceUpdated(address indexed asset, uint256 price, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }

    function setPrice(address asset, uint256 price) public onlyRole(UPDATER_ROLE) {
        require(price > 0, "oracle: zero price");
        uint256 last = prices[asset].price;
        if (last > 0) {
            uint256 diff = price > last ? price - last : last - price;
            require(diff * 10_000 <= last * maxDeviationBps, "oracle: deviation too large");
        }
        prices[asset] = PriceData(price, block.timestamp);
        emit PriceUpdated(asset, price, block.timestamp);
    }

    /// @notice Admin-only unbounded set, for the initial price or a legitimate
    ///         discontinuity (split, redenomination) that exceeds maxDeviationBps.
    function setPriceForce(address asset, uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(price > 0, "oracle: zero price");
        prices[asset] = PriceData(price, block.timestamp);
        emit PriceUpdated(asset, price, block.timestamp);
    }

    function setMaxDeviationBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxDeviationBps = bps;
    }

    function setPrices(address[] calldata assets, uint256[] calldata newPrices) external onlyRole(UPDATER_ROLE) {
        require(assets.length == newPrices.length, "oracle: length mismatch");
        for (uint256 i = 0; i < assets.length; i++) {
            setPrice(assets[i], newPrices[i]);
        }
    }

    function setMaxStaleness(uint256 seconds_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxStaleness = seconds_;
    }

    /// @notice Latest USD price (8 decimals). Reverts if unset or stale.
    function getPrice(address asset) external view returns (uint256) {
        PriceData memory d = prices[asset];
        require(d.price > 0, "oracle: no price");
        require(block.timestamp - d.updatedAt <= maxStaleness, "oracle: stale price");
        return d.price;
    }

    function getPriceData(address asset) external view returns (uint256 price, uint256 updatedAt) {
        PriceData memory d = prices[asset];
        return (d.price, d.updatedAt);
    }
}
