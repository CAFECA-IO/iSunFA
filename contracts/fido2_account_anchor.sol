// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    Initializable
} from "./lib/@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {
    ERC1967Utils
} from "./lib/@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

// Info: (20260821 - Luphia) anchor 只需要 factory 的這一個讀取器
interface IAccountImplementationProvider {
    function accountImplementation() external view returns (address);
}

/**
 * Info: (20260821 - Luphia)
 * @title Fido2AccountAnchor
 * @dev 錢包位址的**錨點實作**：它存在的唯一目的，是讓 CREATE2 位址推導
 * 永遠不隨帳戶實作版本改變。
 *
 * ## 它解的問題
 *
 * V1 factory 的 `getAddress` 把 `accountImplementation` 編進 CREATE2 的
 * init-code hash——實作一換，**同一組 credential 推導出的位址就變了**。
 * 這正是 V1 factory 無法支援升級的根因：不是缺一個 setter，而是位址推導
 * 綁死了實作。
 *
 * ## 它怎麼解
 *
 * 所有 proxy 一律以 anchor（本合約，位址永久固定）為建構參數部署，
 * 因此推導只依賴 (factory, anchor, credential, salt)。`initialize` 在
 * proxy 建構的同一筆交易內：
 *
 * 1. 寫入三把鑰匙（storage 佈局**必須**與 Fido2Account 完全一致——
 *    slot0 credentialId / slot1 pubKeyX / slot2 pubKeyY；Initializable
 *    是 ERC-7201 命名空間儲存，不佔序列 slot）
 * 2. 向 factory（proxy 建構期間的 `msg.sender`）讀取**當下**的正式實作
 * 3. 把 ERC-1967 implementation slot 自我升級過去
 *
 * 完成後這個 proxy 就是一個普通的 UUPS 帳戶，之後的升級照舊由錢包持有人
 * 自己簽（`_authorizeUpgrade` 限 EntryPoint），anchor 不再參與。
 *
 * ## 安全性
 *
 * - `initializer` 寫入的是與正式實作**同一個** ERC-7201 slot，因此升級過去
 *   之後 `initialize` 不可能被再呼叫一次（劫持鑰匙的路被鎖死）。
 * - anchor 本體 `_disableInitializers()`：沒有人能初始化 anchor 自己。
 * - 任何人都可以拿 anchor 去部署自己的 proxy 配自己的假 factory——那是
 *   他自己的 proxy，與本系統的推導（綁定我們的 factory 位址）無關。
 */
contract Fido2AccountAnchor is Initializable {
    // Info: (20260821 - Luphia) 與 Fido2Account 逐 slot 對齊，順序不可動
    bytes public credentialId;
    uint256 public pubKeyX;
    uint256 public pubKeyY;

    error AnchorImplementationMissing();

    constructor() {
        _disableInitializers();
    }

    function initialize(
        bytes calldata _credentialId,
        uint256 _pubKeyX,
        uint256 _pubKeyY
    ) public initializer {
        credentialId = _credentialId;
        pubKeyX = _pubKeyX;
        pubKeyY = _pubKeyY;

        address implementation = IAccountImplementationProvider(msg.sender)
            .accountImplementation();
        if (implementation == address(0)) {
            revert AnchorImplementationMissing();
        }
        /**
         * Info: (20260821 - Luphia) 空 data：只換 slot、不再呼叫任何初始化——
         * 鑰匙已經寫好，而正式實作的 initialize 也已被上面的 initializer 鎖住。
         */
        ERC1967Utils.upgradeToAndCall(implementation, "");
    }
}
