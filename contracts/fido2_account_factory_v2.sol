// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Create2} from "./lib/@openzeppelin/contracts/utils/Create2.sol";
import {
    ERC1967Proxy
} from "./lib/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {
    AccessControl
} from "./lib/@openzeppelin/contracts/access/AccessControl.sol";
import {
    IEntryPoint
} from "./lib/@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {Fido2Account} from "./fido2_account.sol";
import {Fido2AccountV2} from "./fido2_account_v2.sol";
import {Fido2AccountAnchor} from "./fido2_account_anchor.sol";

/**
 * Info: (20260821 - Luphia)
 * @title Fido2AccountFactoryV2
 * @dev 可升級帳戶實作的 factory（D 方案）。與 V1 的差別只有一件事，
 * 而那件事有兩半：
 *
 * 1. `accountImplementation` 從 immutable 變成可由管理者更換——**新**錢包
 *    從此拿到當下的正式實作，帳戶實作升版不再需要換 factory。
 * 2. CREATE2 位址推導改綁**anchor**（見 fido2_account_anchor.sol）而不是實作：
 *    V1 把實作位址編進 init-code hash，實作一換位址就變——那才是 V1 不能
 *    支援升級的根因。anchor 讓 `getAddress` 對同一組 credential **永遠**回
 *    同一個位址，不論實作換過幾版；`webauthn.service` 那些「從 factory 回推
 *    位址」的路徑因此對新舊使用者都持續正確。
 *
 * ## 信任邊界（刻意維持）
 *
 * `setAccountImplementation` 只影響**之後建立**的錢包。既有錢包的實作存在
 * 各自 proxy 的 ERC-1967 slot，升級只能由錢包持有人簽 UserOp 觸發
 * （`Fido2Account._authorizeUpgrade` 限 EntryPoint）。這裡**沒有**、也不該有
 * 讓平台單方面替既有錢包換邏輯的能力——那是 beacon 模式被否決的原因：
 * beacon 的持有者可以一次替全體錢包換掉任何邏輯（含移轉資產），
 * 與本產品「資產移動必經持有人簽章」的既定邊界（服務條款 §3.3）相反。
 *
 * ## 與 V1 的相容
 *
 * - `AccountCreated` 事件的型別與 indexed 完全同形（app 以事件掃描回查位址，
 *   topic0 只看型別）。
 * - `createAccount` / `getAddress` / `getAccountByCredentialId` 介面不變。
 * - V1 factory 與其既有錢包**不受影響**：兩個 factory 並存，既有使用者一律
 *   以 DB 記錄的位址為準（不得對舊使用者用新 factory 重推位址——推導基底
 *   不同，必然對不上）。
 */
contract Fido2AccountFactoryV2 is AccessControl {
    // Info: (20260821 - Luphia) 位址推導的錨點：永久固定，這是「可升級」的前提
    Fido2AccountAnchor public immutable accountAnchor;

    // Info: (20260821 - Luphia) 當下的正式實作：只作用於之後建立的錢包
    address public accountImplementation;

    // Info: (20260821 - Luphia) credential hash → 已部署位址（與 V1 同用途）
    mapping(bytes32 => address) public fido2ToAccount;

    // Info: (20260821 - Luphia) 與 V1 逐型別同形（app 的事件掃描不需要改 ABI）
    event AccountCreated(
        address indexed scw,
        uint256 pubKeyX,
        uint256 pubKeyY,
        uint256 salt,
        string credentialId,
        string username,
        string imageUrl
    );

    event AccountImplementationUpdated(
        address indexed previousImplementation,
        address indexed newImplementation
    );

    error ImplementationHasNoCode(address implementation);

    constructor(IEntryPoint _entryPoint, address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        accountAnchor = new Fido2AccountAnchor();
        // Info: (20260821 - Luphia) 出廠即 V2（含 ERC-721 接收），不會有一批 V1 新錢包
        accountImplementation = address(new Fido2AccountV2(_entryPoint));
    }

    /**
     * Info: (20260821 - Luphia) 換正式實作。只驗「有 code」——實作的行為正確性
     * 由部署流程的 canary 驗證把關（見 documents/architecture/scw_upgrade_plan_d.md），
     * 合約層驗不出「validateUserOp 是不是被弄壞了」這種事。
     */
    function setAccountImplementation(
        address newImplementation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newImplementation.code.length == 0) {
            revert ImplementationHasNoCode(newImplementation);
        }
        emit AccountImplementationUpdated(
            accountImplementation,
            newImplementation
        );
        accountImplementation = newImplementation;
    }

    /**
     * Info: (20260821 - Luphia) 建立帳戶。proxy 以 anchor 為建構參數部署，
     * anchor 的 initialize 會在同一筆交易內寫入鑰匙並自我升級到
     * `accountImplementation`（讀的是**部署當下**的值）。
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
        if (addr.code.length > 0) {
            return Fido2Account(payable(addr));
        }

        bytes memory initCode = abi.encodeCall(
            Fido2AccountAnchor.initialize,
            (credentialId, pubKeyX, pubKeyY)
        );
        ret = Fido2Account(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountAnchor),
                    initCode
                )
            )
        );

        fido2ToAccount[keccak256(credentialId)] = address(ret);

        emit AccountCreated(
            address(ret),
            pubKeyX,
            pubKeyY,
            salt,
            string(credentialId),
            username,
            imageUrl
        );
    }

    /**
     * Info: (20260821 - Luphia) 反事實位址。只依賴 anchor（immutable），
     * 因此**跨實作版本恆定**——這一點有 forge 測試釘住（升版前後同 credential
     * 必須推出同一個位址）。
     */
    function getAddress(
        bytes calldata credentialId,
        uint256 pubKeyX,
        uint256 pubKeyY,
        uint256 salt
    ) public view returns (address) {
        bytes memory initCode = abi.encodeCall(
            Fido2AccountAnchor.initialize,
            (credentialId, pubKeyX, pubKeyY)
        );
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(address(accountAnchor), initCode)
                    )
                )
            );
    }

    function getAccountByCredentialId(
        bytes calldata credentialId
    ) public view returns (address) {
        return fido2ToAccount[keccak256(credentialId)];
    }
}
