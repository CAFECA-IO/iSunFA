// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICreditPoint is IERC20 {
    function collateralRate() external view returns (uint256);
    function decimals() external view returns (uint8);
    function collateralizedMint(address to, uint256 amount) external payable;
}

/**
 * Info: (20260413 - AI Agent)
 * @title MembershipSystem
 * @dev Manages user registration, daily check-ins, and point top-ups.
 * It holds points and native ISC, utilizing self-minting to distribute points appropriately.
 */
contract MembershipSystem is AccessControl {
    ICreditPoint public creditPoint;

    // Constants
    uint256 public constant REGISTRATION_REWARD = 100 * 10**18;
    uint256 public constant DAILY_CHECKIN_REWARD = 5 * 10**18;
    uint256 public constant CHECKIN_COOLDOWN = 24 hours;

    // State
    mapping(address => uint256) public userRegistrationTimes;
    mapping(address => uint256) public userLastCheckIns;
    mapping(address => uint256) public userTotalCheckInRewards;
    mapping(address => uint256) public userTotalPurchasedPoints;

    error Unauthorized();
    error AlreadyRegistered();
    error CheckInCooldown(uint256 timeRemaining);
    error InsufficientContractReserves();

    event UserRegistered(address indexed user, uint256 rewardAmount, uint256 timestamp);
    event DailyCheckInClaimed(address indexed user, uint256 rewardAmount, uint256 timestamp);
    event PointsPurchased(address indexed user, uint256 amount, uint256 timestamp);
    event ISCReceived(address indexed sender, uint256 amount);

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized();
        _;
    }

    constructor(address defaultAdmin, address _creditPoint) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        creditPoint = ICreditPoint(_creditPoint);
    }

    /**
     * @dev Accept native ISC directly to serve as a backing reserve for dynamic minting.
     */
    receive() external payable {
        emit ISCReceived(msg.sender, msg.value);
    }

    /**
     * @dev Register a user, giving them the one-time registration reward.
     */
    function registerUser(address user) external onlyAdmin {
        if (userRegistrationTimes[user] != 0) revert AlreadyRegistered();

        userRegistrationTimes[user] = block.timestamp;
        _issuePoints(user, REGISTRATION_REWARD);

        emit UserRegistered(user, REGISTRATION_REWARD, block.timestamp);
    }

    /**
     * @dev Issue the daily check-in reward to a user. Cannot exceed 1 per 24 hours.
     */
    function dailyCheckIn(address user) external onlyAdmin {
        uint256 lastCheckIn = userLastCheckIns[user];
        if (block.timestamp < lastCheckIn + CHECKIN_COOLDOWN) {
            revert CheckInCooldown((lastCheckIn + CHECKIN_COOLDOWN) - block.timestamp);
        }

        userLastCheckIns[user] = block.timestamp;
        userTotalCheckInRewards[user] += DAILY_CHECKIN_REWARD;
        
        _issuePoints(user, DAILY_CHECKIN_REWARD);

        emit DailyCheckInClaimed(user, DAILY_CHECKIN_REWARD, block.timestamp);
    }

    /**
     * @dev Distribute purchased or subscription points to a user.
     */
    function issuePurchasedPoints(address user, uint256 amount) external onlyAdmin {
        userTotalPurchasedPoints[user] += amount;
        _issuePoints(user, amount);

        emit PointsPurchased(user, amount, block.timestamp);
    }

    /**
     * @dev Fallback issuance logic. Priority 1: Direct transfer from contract's balance. 
     * Priority 2: Mint using contract's native ISC reserves if available.
     */
    function _issuePoints(address user, uint256 amount) internal {
        // Priority 1: Check existing token balance
        uint256 currentBalance = creditPoint.balanceOf(address(this));
        
        if (currentBalance >= amount) {
            bool success = creditPoint.transfer(user, amount);
            require(success, "Token transfer failed");
            return;
        }

        // Priority 2: We need to mint extra using our ISC.
        // If we have some tokens, but not enough, we just mint the *total* amount and transfer.
        // It's cleaner to mint exactly what we need for the user right now, or just the full amount.
        // Let's mint the full amount for simplicity so we don't have to split transfers.
        
        uint256 requiredISC = (amount * creditPoint.collateralRate()) / (10 ** creditPoint.decimals());
        
        if (address(this).balance < requiredISC) {
            revert InsufficientContractReserves();
        }

        // Call collateralized mint from the CreditPoint contract
        creditPoint.collateralizedMint{value: requiredISC}(address(this), amount);
        
        bool successAfterMint = creditPoint.transfer(user, amount);
        require(successAfterMint, "Token transfer failed after mint");
    }
}
