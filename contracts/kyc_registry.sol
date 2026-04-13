// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Info: (20260412 - Luphia)
 * @title KYCRegistry
 * @dev Manages enterprise account (TBA) compliance levels and frozen states.
 * Only the administrator (Web2 backend or Super Admin) can call updates.
 */
contract KYCRegistry is AccessControl {
    enum KYCLevel {
        LEVEL_0,
        LEVEL_1,
        LEVEL_2
    }

    struct UserData {
        KYCLevel level;
        bool isFrozen;
    }

    mapping(address => UserData) private _users;

    error AddressFrozen(address account);
    error LengthMismatch();

    event KYCUpdated(address indexed user, KYCLevel level);
    event UserFrozenStatusChanged(address indexed user, bool isFrozen);

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Updates KYC level for a single user.
     */
    function updateKYC(address user, KYCLevel _level) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!_users[user].isFrozen, "Cannot update KYC for frozen user");
        _users[user].level = _level;
        emit KYCUpdated(user, _level);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Updates KYC level for multiple users to save Gas.
     */
    function batchUpdateKYC(
        address[] calldata userList,
        KYCLevel[] calldata levelList
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (userList.length != levelList.length) revert LengthMismatch();
        for (uint256 i = 0; i < userList.length; i++) {
            if (!_users[userList[i]].isFrozen) {
                _users[userList[i]].level = levelList[i];
                emit KYCUpdated(userList[i], levelList[i]);
            }
        }
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Freezes or unfreezes an account.
     * When frozen, forces the account down to LEVEL_0.
     */
    function setFreezeStatus(address user, bool _freeze) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _users[user].isFrozen = _freeze;
        if (_freeze) {
            _users[user].level = KYCLevel.LEVEL_0;
            emit KYCUpdated(user, KYCLevel.LEVEL_0);
        }
        emit UserFrozenStatusChanged(user, _freeze);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Retrieves the frozen status.
     */
    function isFrozen(address user) external view returns (bool) {
        return _users[user].isFrozen;
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Retrieves the KYC level status.
     */
    function getKYCLevel(address user) external view returns (KYCLevel) {
        return _users[user].level;
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Retrieves the maximum allowed points limit based on the KYC level.
     */
    function getPointsLimit(address user) external view returns (uint256) {
        if (_users[user].isFrozen) return 500;

        KYCLevel lvl = _users[user].level;
        if (lvl == KYCLevel.LEVEL_2) return 100000;
        if (lvl == KYCLevel.LEVEL_1) return 10000;
        return 500; // Info: (20260411 - Luphia) LEVEL_0
    }
}
