// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseAccount} from "@account-abstraction/contracts/core/BaseAccount.sol";
import {
    IEntryPoint
} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {
    PackedUserOperation
} from "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {
    SIG_VALIDATION_FAILED,
    SIG_VALIDATION_SUCCESS
} from "@account-abstraction/contracts/core/Helpers.sol";
import {FCL_WebAuthn} from "./lib/fcl_webauthn.sol";
import {
    Initializable
} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {
    UUPSUpgradeable
} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * Info: (20260412 - Luphia)
 * @title Fido2Account
 * @dev An ERC4337 smart contract wallet authenticated by FIDO2 (Secp256r1) WebAuthn signatures.
 */
contract Fido2Account is BaseAccount, Initializable, UUPSUpgradeable {
    IEntryPoint private immutable _entryPoint;

    bytes public credentialId;
    uint256 public pubKeyX;
    uint256 public pubKeyY;

    event Fido2AccountInitialized(
        IEntryPoint indexed entryPoint,
        bytes credentialId
    );

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Initializes the smart contract wallet.
     * @param _credentialId The WebAuthn credential identifier.
     * @param _pubKeyX The X coordinate of the P256 public key.
     * @param _pubKeyY The Y coordinate of the P256 public key.
     */
    function initialize(
        bytes calldata _credentialId,
        uint256 _pubKeyX,
        uint256 _pubKeyY
    ) public initializer {
        credentialId = _credentialId;
        pubKeyX = _pubKeyX;
        pubKeyY = _pubKeyY;
        emit Fido2AccountInitialized(_entryPoint, _credentialId);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Returns the entry point contract. Required by BaseAccount.
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Validates the UserOperation signature using P256/WebAuthn.
     */
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        /**
         * Info: (20260412 - Luphia) Decode the extra WebAuthn metadata packed inside the `signature` field
         * The sender should encode: (authenticatorData, clientDataJSON, challengeIndex, typeIndex, r, s)
         */
        (
            bytes memory authenticatorData,
            bytes memory clientDataJSON,
            uint256 challengeIndex,
            , // Info: Skip typeIndex
            uint256 r,
            uint256 s
        ) = abi.decode(
                userOp.signature,
                (bytes, bytes, uint256, uint256, uint256, uint256)
            );

        uint256[2] memory rs = [r, s];
        // Info: (20260412 - Luphia) Use the FreshCryptoLib WebAuthn validator to check the Secp256r1 signature
        bool isValid = FCL_WebAuthn.checkSignature(
            authenticatorData,
            bytes1(0x01), // Info: (20260412 - Luphia) flag: User Presence required
            clientDataJSON,
            userOpHash, // Info: (20260412 - Luphia) the challenge is the userOpHash itself (bytes32)
            challengeIndex,
            rs,
            pubKeyX,
            pubKeyY
        );

        if (isValid) {
            return SIG_VALIDATION_SUCCESS;
        }
        return SIG_VALIDATION_FAILED;
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Executes a single call.
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        _requireFromEntryPoint();
        _call(dest, value, func);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Executes a batch of calls.
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external {
        _requireFromEntryPoint();
        require(
            dest.length == func.length &&
                (value.length == 0 || value.length == func.length),
            "wrong array lengths"
        );
        if (value.length == 0) {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], 0, func[i]);
            }
        } else {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], value[i], func[i]);
            }
        }
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Overrides UUPS requirement. Only EntryPoint can authorize upgrades.
     * Alternatively, this could require the actual WebAuthn signature if called independently.
     */
    function _authorizeUpgrade(
        address /* newImplementation */
    ) internal view override {
        _requireFromEntryPoint();
    }
}
