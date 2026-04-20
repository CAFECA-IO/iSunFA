// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CreditPoint} from "./credit_point.sol";
import {DynamicKYCMembership} from "./dynamic_kyc_membership.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Info: (20260416 - Luphia)
 * @title SubscriptionManager
 * @dev The core logic component dealing with the Triple-Track Ledger
 * (Permanent, Subscription, Purchased) and point lifecycle management.
 * 會員卡付費方案，負責處理商業級的月租邏輯，包含展延效期。
 * 定期清算，落實不使用即失效的付費包月商業規則。
 * 點數消費使用三軌分離帳本，提供階層 Cascade Burn 機制，在用戶消費時強制優先折抵快過期的月租點數，保障用戶最大權益。
 */
contract SubscriptionManager is AccessControl {
    DynamicKYCMembership public kycRegistry;
    CreditPoint public treasury;

    address public treasuryReceiver;

    struct SubscriptionData {
        uint256 permanentPoints;
        uint256 subscriptionPoints;
        uint256 purchasedPoints;
        uint256 subExpiry;
        uint256 lastDailyClaim;
    }

    mapping(address => SubscriptionData) public userAccounts;

    // Info: (20260411 - Luphia) Constants mapping to real-world definitions
    uint256 public constant DAILY_CLAIM_AMOUNT = 5 * 10 ** 18;
    uint256 public constant CLAIM_INTERVAL = 1 days;
    uint256 public constant SUB_DURATION = 30 days;

    error ExceedsKYCLimit();
    error ClaimTooSoon();
    error InsufficientPoints();
    error NotEnoughFundInManager();

    event DailyClaimed(address indexed user, uint256 amount);
    event SubscriptionRenewed(
        address indexed user,
        uint256 amount,
        uint256 newExpiry
    );
    event PointsSpent(
        address indexed user,
        uint256 subSpent,
        uint256 permSpent,
        uint256 purSpent
    );
    event PointsPurchased(address indexed user, uint256 amount);
    event PointsExpired(address indexed user, uint256 amount);
    event TreasuryReceiverUpdated(address indexed newReceiver);

    constructor(address defaultAdmin, address _kyc, address _treasury) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        kycRegistry = DynamicKYCMembership(_kyc);
        treasury = CreditPoint(_treasury);
        treasuryReceiver = defaultAdmin;
    }

    function setKYCRegistry(
        address _kyc
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kycRegistry = DynamicKYCMembership(_kyc);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Accepts ISC from the Developer/Admin to fund the Daily Claim collateral.
     */
    receive() external payable {}

    function setTreasuryReceiver(
        address newReceiver
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasuryReceiver = newReceiver;
        emit TreasuryReceiverUpdated(newReceiver);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev User interaction: Claims daily free points.
     * With ERC-4337, this costs no gas for the user.
     */
    function dailyClaim() external {
        uint256 limit = kycRegistry.getPointsLimit(msg.sender) * 10 ** 18;
        SubscriptionData storage data = userAccounts[msg.sender];

        if (block.timestamp < data.lastDailyClaim + CLAIM_INTERVAL)
            revert ClaimTooSoon();
        if (
            data.permanentPoints +
                data.subscriptionPoints +
                DAILY_CLAIM_AMOUNT >
            limit
        ) revert ExceedsKYCLimit();

        data.lastDailyClaim = block.timestamp;
        data.permanentPoints += DAILY_CLAIM_AMOUNT;

        _mintFromTreasury(msg.sender, DAILY_CLAIM_AMOUNT);
        emit DailyClaimed(msg.sender, DAILY_CLAIM_AMOUNT);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Admin/Backend adds subscription points directly when user upgrades
     * plan via Stripe/Web2 gateways.
     */
    function addSubscription(
        address user,
        uint256 pointsAmount
    ) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 limit = kycRegistry.getPointsLimit(user) * 10 ** 18;
        SubscriptionData storage data = userAccounts[user];

        if (
            data.permanentPoints + data.subscriptionPoints + pointsAmount >
            limit
        ) revert ExceedsKYCLimit();

        // Info: (20260411 - Luphia) Stacks expiration mapping
        if (data.subExpiry < block.timestamp) {
            data.subExpiry = block.timestamp + SUB_DURATION;
        } else {
            data.subExpiry += SUB_DURATION;
        }

        data.subscriptionPoints += pointsAmount;

        _mintFromTreasury(user, pointsAmount);
        emit SubscriptionRenewed(user, pointsAmount, data.subExpiry);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Directly purchase uncapped points. Bypasses KYC ledger limit checking.
     */
    function purchasePoints(
        address user,
        uint256 amount
    ) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        SubscriptionData storage data = userAccounts[user];
        data.purchasedPoints += amount;

        _mintFromTreasury(user, amount);
        emit PointsPurchased(user, amount);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Triple-Track Ledger reduction algorithm.
     * Requires msg.sender to have called `approve(SubscriptionManager)` on Treasury token!
     */
    function spendPoints(uint256 amount) external {
        SubscriptionData storage data = userAccounts[msg.sender];

        // Info: (20260411 - Luphia) 1. Lazy evaluation for expiration
        if (data.subExpiry < block.timestamp && data.subscriptionPoints > 0) {
            _burnExpired(msg.sender, data.subscriptionPoints);
            data.subscriptionPoints = 0;
        }

        if (
            data.subscriptionPoints +
                data.permanentPoints +
                data.purchasedPoints <
            amount
        ) revert InsufficientPoints();

        uint256 remaining = amount;
        uint256 subSpent = 0;
        uint256 permSpent = 0;
        uint256 purSpent = 0;

        // Info: (20260411 - Luphia) 2. Cascade Burn: Subscription -> Permanent -> Purchased
        if (data.subscriptionPoints >= remaining) {
            data.subscriptionPoints -= remaining;
            subSpent = remaining;
            remaining = 0;
        } else {
            subSpent = data.subscriptionPoints;
            remaining -= data.subscriptionPoints;
            data.subscriptionPoints = 0;
        }

        if (remaining > 0) {
            if (data.permanentPoints >= remaining) {
                data.permanentPoints -= remaining;
                permSpent = remaining;
                remaining = 0;
            } else {
                permSpent = data.permanentPoints;
                remaining -= data.permanentPoints;
                data.permanentPoints = 0;
            }
        }

        if (remaining > 0) {
            data.purchasedPoints -= remaining;
            purSpent = remaining;
        }

        // Info: (20260411 - Luphia) Return the points to the Admin/Treasury operator
        require(
            treasury.transferFrom(msg.sender, treasuryReceiver, amount),
            "ERC20 transfer fails"
        );

        emit PointsSpent(msg.sender, subSpent, permSpent, purSpent);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Web3 Keeper (Chainlink/Gelato) endpoint to clean up expired sub points.
     */
    function keeperCleanUp(address[] calldata users) external {
        for (uint256 i = 0; i < users.length; i++) {
            SubscriptionData storage data = userAccounts[users[i]];
            if (
                data.subExpiry < block.timestamp && data.subscriptionPoints > 0
            ) {
                uint256 expired = data.subscriptionPoints;
                data.subscriptionPoints = 0;
                _burnExpired(users[i], expired);
            }
        }
    }

    function _mintFromTreasury(address to, uint256 amount) internal {
        uint256 requiredISC = (amount * treasury.collateralRate()) /
            (10 ** treasury.decimals());
        if (address(this).balance < requiredISC)
            revert NotEnoughFundInManager();
        treasury.collateralizedMint{value: requiredISC}(to, amount);
    }

    function _burnExpired(address user, uint256 amount) internal {
        require(
            treasury.transferFrom(user, treasuryReceiver, amount),
            "Expiration sweep failed"
        );
        emit PointsExpired(user, amount);
    }
}
