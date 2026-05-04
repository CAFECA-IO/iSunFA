// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "./lib/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {
    ERC721URIStorage
} from "./lib/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {AccessControl} from "./lib/@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Info: (20260418 - Luphia)
 * @title DynamicKYCMembership
 * @dev Combines ERC-3643 KYC Registry logic with an ERC721 Dynamic Membership Card.
 * Incorporates a strict Blacklist (Frozen) mechanism to restrict non-compliant users.
 */
contract DynamicKYCMembership is ERC721URIStorage, AccessControl {
    // Info: (20260418 - Luphia) KYC & Blacklist (Frozen) Data Structures
    enum KYCLevel {
        LEVEL_0,
        LEVEL_1,
        LEVEL_2,
        LEVEL_3,
        LEVEL_4,
        LEVEL_5,
        LEVEL_6,
        LEVEL_7,
        LEVEL_8,
        LEVEL_9,
        LEVEL_10
    }

    struct UserData {
        KYCLevel level;
        // Info: (20260418 - Luphia) Acts as the Blacklist status
        bool isFrozen;
    }

    mapping(address => UserData) private _users;

    // Info: (20260418 - Luphia) NFT Data Structures
    uint256 private _nextTokenId;
    mapping(uint256 => uint256) public experiencePoints;

    // Info: (20260418 - Luphia) Events & Errors
    error AddressBlacklisted(address account);
    error LengthMismatch();

    event KYCUpdated(address indexed user, KYCLevel level);
    event UserBlacklistStatusChanged(address indexed user, bool isBlacklisted);

    /**
     * Info: (20260418 - Luphia)
     * @dev Restricts operations for users who are frozen/blacklisted.
     */
    modifier notBlacklisted(address user) {
        if (_users[user].isFrozen) revert AddressBlacklisted(user);
        _;
    }

    // Info: (20260418 - Luphia) Constructor
    constructor(address defaultAdmin) ERC721("iSunFA Membership", "ISMC") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    // Info: (20260418 - Luphia) KYC & Blacklist Admin Functions
    function updateKYC(
        address user,
        KYCLevel _level
    ) external onlyRole(DEFAULT_ADMIN_ROLE) notBlacklisted(user) {
        _users[user].level = _level;
        emit KYCUpdated(user, _level);
    }

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
     * Info: (20260418 - Luphia)
     * @dev Freezes (Blacklists) or unfreezes an account.
     * When blacklisted, forces the account down to LEVEL_0.
     */
    function setBlacklistStatus(
        address user,
        bool _isBlacklisted
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _users[user].isFrozen = _isBlacklisted;
        if (_isBlacklisted) {
            _users[user].level = KYCLevel.LEVEL_0;
            emit KYCUpdated(user, KYCLevel.LEVEL_0);
        }
        emit UserBlacklistStatusChanged(user, _isBlacklisted);
    }

    // Info: (20260418 - Luphia) KYC View Functions
    function isBlacklisted(address user) external view returns (bool) {
        return _users[user].isFrozen;
    }

    function getKYCLevel(address user) external view returns (KYCLevel) {
        return _users[user].level;
    }

    /**
     * Info: (20260418 - Luphia)
     * @dev Retrieves the maximum allowed points limit based on the updated KYC level.
     */
    function getPointsLimit(address user) external view returns (uint256) {
        // Info: (20260418 - Luphia) Blacklisted users are restricted to base limit
        if (_users[user].isFrozen) return 500;

        KYCLevel lvl = _users[user].level;

        if (lvl == KYCLevel.LEVEL_10) return type(uint256).max; // Info: (20260418 - Luphia) 無上限 (Unlimited)
        if (lvl == KYCLevel.LEVEL_9) return 5000000;
        if (lvl == KYCLevel.LEVEL_8) return 1000000;
        if (lvl == KYCLevel.LEVEL_7) return 500000;
        if (lvl == KYCLevel.LEVEL_6) return 200000;
        if (lvl == KYCLevel.LEVEL_5) return 50000;
        if (lvl == KYCLevel.LEVEL_4) return 25000;
        if (lvl == KYCLevel.LEVEL_3) return 10000;
        if (lvl == KYCLevel.LEVEL_2) return 5000;
        if (lvl == KYCLevel.LEVEL_1) return 1000;

        return 500; // Info: (20260418 - Luphia) LEVEL_0 預設值
    }

    // Info: (20260418 - Luphia) Dynamic NFT Functions
    function mintCard(
        address to,
        string memory uri
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        notBlacklisted(to)
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    function updateExperience(
        uint256 tokenId,
        uint256 addedExp
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireOwned(tokenId);

        address owner = _ownerOf(tokenId);
        if (_users[owner].isFrozen) revert AddressBlacklisted(owner);

        experiencePoints[tokenId] += addedExp;
        emit MetadataUpdate(tokenId);
    }

    function setTokenURI(
        uint256 tokenId,
        string memory uri
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requireOwned(tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Info: (20260418 - Luphia) Core Logic Overrides
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && _users[from].isFrozen) {
            revert AddressBlacklisted(from);
        }

        if (to != address(0) && _users[to].isFrozen) {
            revert AddressBlacklisted(to);
        }

        return super._update(to, tokenId, auth);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return
            interfaceId == bytes4(0x49064906) ||
            super.supportsInterface(interfaceId);
    }
}
