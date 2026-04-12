// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {
    IEntryPoint
} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {Fido2Account} from "./fido2_account.sol";

/**
 * Info: (20260412 - Luphia)
 * @title Fido2AccountFactory
 * @dev A Factory to counterfactually deploy and track ERC4337 FIDO2 Accounts.
 */
contract Fido2AccountFactory {
    Fido2Account public immutable accountImplementation;

    /**
     * Info: (20260412 - Luphia) Mapping from FIDO2 Credential ID (hashed) to Address
     * To allow quick registry lookups: "has this FIDO2 device already created a wallet?"
     */
    mapping(bytes32 => address) public fido2ToAccount;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new Fido2Account(_entryPoint);
    }

    event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string username, string imageUrl);

    /**
     * Info: (20260412 - Luphia)
     * @dev Creates an account, and returns its address.
     * Returns the address even if the account is already deployed.
     * Note that during UserOperation execution, this method is called by the EntryPoint.
     *
     * @param credentialId The unique FIDO2 WebAuthn credential identifier.
     * @param pubKeyX WebAuthn P256 X coordinate.
     * @param pubKeyY WebAuthn P256 Y coordinate.
     * @param salt Custom salt for CREATE2 (usually 0).
     * @param username The user's nickname.
     * @param imageUrl The user's avatar.
     */
    function createAccount(
        bytes calldata credentialId,
        uint256 pubKeyX,
        uint256 pubKeyY,
        uint256 salt,
        string calldata username,
        string calldata imageUrl
    ) public returns (Fido2Account ret) {
        address addr = getAddress(credentialId, pubKeyX, pubKeyY, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return Fido2Account(payable(addr));
        }

        bytes memory initCode = abi.encodeCall(
            Fido2Account.initialize,
            (credentialId, pubKeyX, pubKeyY)
        );
        ret = Fido2Account(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    initCode
                )
            )
        );

        // Info: (20260412 - Luphia) Register the credential Hash to the deployed proxy address
        fido2ToAccount[keccak256(credentialId)] = address(ret);

        emit AccountCreated(address(ret), pubKeyX, pubKeyY, salt, string(credentialId), username, imageUrl);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Calculates the counterfactual address of a Fido2Account.
     */
    function getAddress(
        bytes calldata credentialId,
        uint256 pubKeyX,
        uint256 pubKeyY,
        uint256 salt
    ) public view returns (address) {
        bytes memory initCode = abi.encodeCall(
            Fido2Account.initialize,
            (credentialId, pubKeyX, pubKeyY)
        );
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(address(accountImplementation), initCode)
                    )
                )
            )
        );
        return address(uint160(uint256(hash)));
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Checks if a FIDO2 token has established a wallet and returns it.
     * Returns `address(0)` if none exists.
     */
    function getAccountByCredentialId(
        bytes calldata credentialId
    ) public view returns (address) {
        return fido2ToAccount[keccak256(credentialId)];
    }
}
