// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "./lib/@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Info: (20260807 - Luphia)
 * @title LedgerAnchor
 * @dev C 案 Phase 1（ADR 015）：團隊錢包離鏈帳本的每日 merkle root 錨定。
 * 本合約「不持有任何資產」——僅記錄事件，key 淪陷的最壞情況是寫入垃圾 root
 * （可由 DB 重算揭穿），不及資金；故錨定使用獨立的 ANCHOR_ROLE 而非 DEFAULT_ADMIN_ROLE。
 * chainedRoot = keccak256(前日 chainedRoot ‖ dayRoot)，鏈式綁定歷史，
 * 任何人可自 DB 重算並與事件比對驗證（設計書 §3 鏈上錨定）。
 */
contract LedgerAnchor is AccessControl {
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");

    // Info: (20260807 - Luphia) day = 該營業日（UTC+8 日界）00:00 的 epoch 秒
    event AnchorCommitted(
        uint256 indexed day,
        bytes32 dayRoot,
        bytes32 chainedRoot,
        uint256 entryCount
    );

    constructor(address defaultAdmin, address anchorer) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ANCHOR_ROLE, anchorer);
    }

    function commitAnchor(
        uint256 day,
        bytes32 dayRoot,
        bytes32 chainedRoot,
        uint256 entryCount
    ) external onlyRole(ANCHOR_ROLE) {
        emit AnchorCommitted(day, dayRoot, chainedRoot, entryCount);
    }
}
