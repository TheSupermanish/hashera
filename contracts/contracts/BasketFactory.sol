// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BasketVault.sol";

/// @title BasketFactory
/// @notice Deploys and registers BasketVaults on HashKey Chain.
contract BasketFactory is Ownable {
    address public immutable stable;
    address public immutable oracle;
    address public treasury;

    address[] public baskets;
    mapping(address => bool) public isBasket;

    event BasketCreated(address indexed vault, string name, string symbol, address[] assets, uint16[] weightsBps);

    constructor(address stable_, address oracle_, address treasury_) Ownable(msg.sender) {
        stable = stable_;
        oracle = oracle_;
        treasury = treasury_;
    }

    function createBasket(
        string calldata name_,
        string calldata symbol_,
        address[] calldata assets_,
        uint16[] calldata weightsBps_,
        uint256 entryFeeBps_,
        uint256 minInvest_
    ) external onlyOwner returns (address vault) {
        BasketVault v = new BasketVault(
            name_,
            symbol_,
            stable,
            oracle,
            assets_,
            weightsBps_,
            treasury,
            entryFeeBps_,
            minInvest_,
            msg.sender
        );
        vault = address(v);
        baskets.push(vault);
        isBasket[vault] = true;
        emit BasketCreated(vault, name_, symbol_, assets_, weightsBps_);
    }

    function basketCount() external view returns (uint256) {
        return baskets.length;
    }

    function allBaskets() external view returns (address[] memory) {
        return baskets;
    }

    function setTreasury(address t) external onlyOwner {
        treasury = t;
    }
}
