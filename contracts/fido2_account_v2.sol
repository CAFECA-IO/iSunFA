// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fido2Account} from "./fido2_account.sol";
import {
    IEntryPoint
} from "./lib/@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {
    IERC721Receiver
} from "./lib/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * Info: (20260821 - Luphia)
 * @title Fido2AccountV2
 * @dev V1 加上 ERC-721 接收能力，其他一行不動（D 方案，最小差異原則）。
 *
 * 為什麼需要 V2：`DynamicKYCMembership.mintCard` 用 `_safeMint`，對有 code 的
 * 收受人會呼叫 `onERC721Received` 並要求回傳 selector——V1 沒有這個函式，
 * 因此鑄卡對所有既有錢包**必定** revert `ERC721InvalidReceiver`（鏈上已實測，
 * 三個 SCW 皆 `0x64a0ae92`，對照組 EOA 成功）。
 *
 * 刻意**不**加的東西，與原因：
 *
 * - `receive()`：會改變「這個地址能不能收原生幣」的語意。升級壞掉的代價是
 *   錢包永久鎖死（見下），最小差異原則壓過便利性。
 * - 任何 storage：V1 的佈局是 slot0 credentialId / slot1 pubKeyX / slot2 pubKeyY
 *   （Initializable 與 UUPSUpgradeable 皆為 ERC-7201 命名空間儲存，不佔序列 slot；
 *   BaseAccount 只有常數）。V2 純加函式，佈局不變，既有錢包升級後狀態原封不動。
 *
 * 升級路徑（僅供既有錢包）：`_authorizeUpgrade` 沿用 V1 的 EntryPoint 限定——
 * 只有錢包持有人簽出的 UserOp 能觸發升級，平台**沒有**單方面替使用者換邏輯的
 * 後門。這是刻意保留的信任邊界（與 chain_receipt_status 測試釘住的
 * 「平台無權單方面銷毀成員代幣」同一條線）。
 *
 * ⚠️ 升級的唯一重大風險：若某個新版本弄壞 `validateUserOp` 或 `_authorizeUpgrade`，
 * 該錢包**永久鎖死**（再也簽不出任何 UserOp，包括修復用的再升級）。因此每一版
 * 都必須先在本地鏈對 canary 錢包完整驗證（簽章、轉點、再升級一次）才能開放。
 */
contract Fido2AccountV2 is Fido2Account, IERC721Receiver {
    constructor(IEntryPoint anEntryPoint) Fido2Account(anEntryPoint) {}

    /**
     * Info: (20260821 - Luphia) `_safeMint` / `safeTransferFrom` 的接收確認。
     * pure：這個錢包無條件接受任何 ERC-721（是否「認得」某張卡是離鏈判斷的事，
     * 合約層拒收只會把鑄造打回 revert，回到 V1 的問題）。
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * Info: (20260821 - Luphia) ERC-165。除了標準用途，這也是離鏈 worker 的探針：
     * 鑄卡前以 `supportsInterface(0x150b7a02)` 一次 eth_call 判斷錢包能不能收——
     * V1 沒有這個函式（呼叫會 revert → 視為 false），升級完成的下一輪掃描
     * 自動變 true，卡片開始鑄造，離鏈側不需要任何改動或重置。
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == 0x01ffc9a7; // Info: (20260821 - Luphia) ERC-165 自身
    }

    // Info: (20260821 - Luphia) 供營運確認某個 proxy 目前跑的是哪一版實作
    function accountVersion() external pure returns (uint256) {
        return 2;
    }
}
