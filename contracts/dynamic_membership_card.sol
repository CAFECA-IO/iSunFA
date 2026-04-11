// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {
    ERC721URIStorage
} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {KYCRegistry} from "./kyc_registry.sol";
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";

/**
 * Info: (20260411 - Luphia)
 * @title DynamicMembershipCard
 * @dev ERC721 Token combined with EIP-4906 (MetadataUpdate) and linked to KYCRegistry
 * to freeze non-compliant assets dynamically. Can be bound to ERC-6551 accounts.
 */
contract DynamicMembershipCard is ERC721URIStorage, Ownable {
    KYCRegistry public kycRegistry;
    uint256 private _nextTokenId;

    // Info: (20260411 - Luphia) Mapping tracking dynamic experience points per card
    mapping(uint256 => uint256) public experiencePoints;

    constructor(
        address initialOwner,
        address _kycRegistry
    ) ERC721("iSunFA Membership", "ISMC") Ownable(initialOwner) {
        kycRegistry = KYCRegistry(_kycRegistry);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Sets a new KYC Registry address in case of an upgrade.
     */
    function setKYCRegistry(address _kycRegistry) external onlyOwner {
        kycRegistry = KYCRegistry(_kycRegistry);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Mint a new membership card for the user.
     */
    function mintCard(
        address to,
        string memory uri
    ) external onlyOwner returns (uint256) {
        // Info: (20260411 - Luphia) Disallow minting if user is frozen
        if (address(kycRegistry) != address(0)) {
            require(!kycRegistry.isFrozen(to), "Receiver address is frozen");
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Updates experience points and emits MetadataUpdate event (EIP-4906)
     */
    function updateExperience(
        uint256 tokenId,
        uint256 addedExp
    ) external onlyOwner {
        _requireOwned(tokenId); // Info: (20260411 - Luphia) OZ v5 logic to check existence
        experiencePoints[tokenId] += addedExp;
        emit MetadataUpdate(tokenId);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Explicitly change token URI and notify external indexers.
     */
    function setTokenURI(
        uint256 tokenId,
        string memory uri
    ) external onlyOwner {
        _requireOwned(tokenId);
        _setTokenURI(tokenId, uri);
        emit MetadataUpdate(tokenId);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Overrides `_update` logic (introduced in OZ v5) to enforce frozen states
     * during any token transfer, stopping compliant rule-breakers from dumping.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Info: (20260411 - Luphia) Prevent transfer if sender is frozen in KYC Registry
        if (from != address(0) && address(kycRegistry) != address(0)) {
            require(
                !kycRegistry.isFrozen(from),
                "Transfer blocked: sender is frozen"
            );
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * Info: (20260411 - Luphia)
     * @dev Supports interface for ERC721, ERC721URIStorage and EIP4906.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721URIStorage) returns (bool) {
        return
            interfaceId == bytes4(0x49064906) ||
            super.supportsInterface(interfaceId);
    }
}
