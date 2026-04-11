// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    Ownable2Step,
    Ownable
} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {KYCRegistry} from "./kyc_registry.sol";

/**
 * Info: (20260411 - Luphia)
 * @title PointERC3643Treasury
 * @dev An enterprise-grade token representing system points incorporating ERC-3643 compliance concepts.
 * Acts as the Treasury: dictates that tokens minted need an ETH equivalent provided as collateral.
 * Provides a `burnAndUnlock` functionality to reclaim that value.
 */
contract PointERC3643Treasury is ERC20, Ownable2Step {
    KYCRegistry public kycRegistry;

    // Info: (20260411 - Luphia) Config: required ETH collateral per 1 full point representation
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
        uint256 unlockedETH
    );

    modifier onlyAuthorized() {
        if (msg.sender != owner() && msg.sender != subscriptionManager)
            revert Unauthorized();
        _;
    }

    constructor(
        address initialOwner,
        address _kycRegistry,
        uint256 _collateralRate
    ) ERC20("iSunFA Point", "ISPT") Ownable(initialOwner) {
        kycRegistry = KYCRegistry(_kycRegistry);
        collateralRate = _collateralRate;
    }

    function setSubscriptionManager(address _manager) external onlyOwner {
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
     * Info: (20260411 - Luphia)
     * @dev Administrator or SubManager minting tokens based on collateral logic.
     * ETH is permanently locked in this contract until burned.
     */
    function collateralizedMint(
        address to,
        uint256 amount
    ) external payable onlyAuthorized {
        uint256 requiredETH = (amount * collateralRate) / (10 ** decimals());
        if (msg.value < requiredETH)
            revert InsufficientCollateral(msg.value, requiredETH);

        _mint(to, amount);
        emit CollateralizedMint(to, amount, msg.value);

        // Info: (20260411 - Luphia) Refund excess ETH if overpaid
        if (msg.value > requiredETH) {
            (bool success, ) = msg.sender.call{value: msg.value - requiredETH}(
                ""
            );
            require(success, "ETH refund failed");
        }
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Redeems points and burns them to retrieve the underlying ETH.
     */
    function burnAndUnlock(uint256 amount) external {
        if (balanceOf(msg.sender) < amount) revert InsufficientPoints(amount);

        uint256 unlockETH = (amount * collateralRate) / (10 ** decimals());
        if (address(this).balance < unlockETH) revert TreasuryEmpty();

        _burn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: unlockETH}("");
        require(success, "ETH transfer failed");

        emit BurnedAndUnlocked(msg.sender, amount, unlockETH);
    }
}
