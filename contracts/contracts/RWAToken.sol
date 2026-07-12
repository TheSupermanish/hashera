// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RWAToken
/// @notice Synthetic tokenized real-world asset (e.g. a NYSE/NASDAQ equity)
///         on HashKey Chain. Supply is minted/burned only by authorized vaults
///         against USDC collateral at the oracle price, so the token is always
///         fully backed inside the protocol. 18 decimals.
contract RWAToken is ERC20, AccessControl {
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    /// Human-readable underlying instrument, e.g. "Intel Corporation (NASDAQ: INTC)"
    string public underlying;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory underlying_
    ) ERC20(name_, symbol_) {
        underlying = underlying_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(VAULT_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(VAULT_ROLE) {
        _burn(from, amount);
    }
}
