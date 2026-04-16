// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {KYCRegistry} from "./kyc_registry.sol";

/**
 * Info: (20260416 - Luphia)
 * @title CreditPoint
 * @dev An enterprise-grade token representing system points incorporating ERC-3643 compliance concepts.
 * Acts as the Treasury: dictates that tokens minted need an ISC equivalent provided as collateral.
 * Provides a `burnAndUnlock` functionality to reclaim that value.
 * 會員卡持有點數在增發前都必需抵押等比例的 ISC，透過超額抵押鑄造維持總體經濟穩定。
 */
contract CreditPoint is ERC20, AccessControl {
    KYCRegistry public kycRegistry;

    // Info: (20260411 - Luphia) Config: required ISC collateral per 1 full point representation
    uint256 public collateralRate;

    address public subscriptionManager;

    error Unauthorized();
    error NeedsIdentityVerification();
    error InsufficientCollateral(uint256 provided, uint256 required);
    error InsufficientPoints(uint256 requested);
    error TreasuryEmpty();

    event CollateralizedMint(
        address indexed to,
        uint256 amount,
        uint256 collateralProvided
    );
    event BurnedAndUnlocked(
        address indexed from,
        uint256 amount,
        uint256 unlockedISC
    );

    modifier onlyAuthorized() {
        if (
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            msg.sender != subscriptionManager
        ) revert Unauthorized();
        _;
    }

    constructor(
        address defaultAdmin,
        address _kycRegistry,
        uint256 _collateralRate
    ) ERC20("iSunFA Credit Point", "ICP") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        kycRegistry = KYCRegistry(_kycRegistry);
        collateralRate = _collateralRate;
    }

    function setSubscriptionManager(
        address _manager
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        subscriptionManager = _manager;
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Core ERC-3643 compliance check concept: Token can only move between compliant identities.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // Info: (20260411 - Luphia) Enforce compliance on receiving address
        if (to != address(0) && address(kycRegistry) != address(0)) {
            if (kycRegistry.isFrozen(to)) revert NeedsIdentityVerification();
        }

        // Info: (20260411 - Luphia) Enforce compliance on sending address
        if (from != address(0) && address(kycRegistry) != address(0)) {
            if (kycRegistry.isFrozen(from)) revert NeedsIdentityVerification();
        }

        super._update(from, to, value);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Administrator or SubManager minting tokens based on collateral logic.
     * ISC is permanently locked in this contract until burned.
     */
    function collateralizedMint(
        address to,
        uint256 amount
    ) external payable onlyAuthorized {
        uint256 requiredISC = (amount * collateralRate) / (10 ** decimals());
        if (msg.value < requiredISC)
            revert InsufficientCollateral(msg.value, requiredISC);

        _mint(to, amount);
        emit CollateralizedMint(to, amount, msg.value);

        // Info: (20260411 - Luphia) Refund excess ISC if overpaid
        if (msg.value > requiredISC) {
            (bool success, ) = msg.sender.call{value: msg.value - requiredISC}(
                ""
            );
            require(success, "ISC refund failed");
        }
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Redeems points and burns them to retrieve the underlying ISC.
     */
    function burnAndUnlock(uint256 amount) external {
        if (balanceOf(msg.sender) < amount) revert InsufficientPoints(amount);

        uint256 unlockISC = (amount * collateralRate) / (10 ** decimals());
        if (address(this).balance < unlockISC) revert TreasuryEmpty();

        _burn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: unlockISC}("");
        require(success, "ISC transfer failed");

        emit BurnedAndUnlocked(msg.sender, amount, unlockISC);
    }
}
