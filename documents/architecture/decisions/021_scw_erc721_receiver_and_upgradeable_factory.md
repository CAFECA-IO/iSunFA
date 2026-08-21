# ADR 021: SCW 的 ERC-721 接收能力與可升級 factory (SCW ERC-721 Receiver & Upgradeable Factory)

> **Date**: 2026-08-21
> **Author**: Luphia
> **Status**: Proposed（合約已寫並通過 forge 測試，尚未部署）
> **關聯 ADR**: [016 第三方登入與託管錢包](./016_third_party_login_and_custodial_wallet.md)
> **關聯程式碼**: `contracts/fido2_account_v2.sol`、`contracts/fido2_account_anchor.sol`、`contracts/fido2_account_factory_v2.sol`、`contracts/forge_test/scw_upgrade.t.sol`
> **關聯設計**: `team_wallet_and_subscription_quota.md` §6.5（訂閱會員卡）

---

## Context（脈絡）

訂閱會員卡（PR #6687）鑄造給團隊 OWNER 的錢包位址，而那個位址是 `Fido2Account` 智慧合約錢包（SCW）。鏈上實測（2026-08-21，本地鏈 20024）：

- `DynamicKYCMembership.mintCard` 用 `_safeMint`，對有 code 的收受人要求 `onERC721Received` 回傳 selector
- 部署中的 `Fido2Account` 實作（`0xeeb5c620…`）**沒有**這個函式（直接呼叫 → revert）
- 對三個 SCW 模擬 `mintCard` 一律 revert `0x64a0ae92` = `ERC721InvalidReceiver`；對照組 EOA 成功
- 依序排除的假設：白名單（`isBlacklisted=false`、錯誤 selector 不符 `0xdaf49ab9`）、權限（EOA 成功、不符 `0xe2517d3f`）、KYC（level 1 的 SCW 同樣 revert）、ISC（`mintCard` 非 payable；有 8,064 ISC 的 admin 結果相同）

**所以：不動合約層，現有的 2,115 個 passkey 錢包一張會員卡都收不到。**

而 V1 factory 有第二個結構性問題，讓「換一版實作」變得昂貴：

```solidity
// V1 getAddress：實作位址被編進 CREATE2 的 init-code hash
abi.encode(address(accountImplementation), initCode)   // accountImplementation 是 immutable
```

實作一換，**同一組 credential 推導出的位址就變了**。V1 不能支援升級不是缺一個 setter，是位址推導綁死了實作。

## Decision（決定）

三個新合約，**既有已部署合約一個都不動**：

### 1. `Fido2AccountV2` — V1 加上 ERC-721 接收，其他一行不動

- `onERC721Received` 回 selector（無條件接受；「認不認得某張卡」是離鏈判斷）
- `supportsInterface(0x150b7a02)` — 同時是離鏈 worker 的探針（見下）
- `accountVersion() = 2` 供營運確認
- **不加 `receive()`**：會改變「能不能收原生幣」的語意，而升級壞掉的代價是錢包永久鎖死，最小差異原則壓過便利性
- **不加 storage**：V1 佈局是 slot0 `credentialId` / slot1 `pubKeyX` / slot2 `pubKeyY`（Initializable 與 UUPS 皆 ERC-7201 命名空間儲存），升級後狀態原封不動

### 2. `Fido2AccountAnchor` — 位址推導的永久錨點

所有新 proxy 一律以 anchor 為建構參數部署，推導只依賴 `(factory, anchor, credential, salt)`。anchor 的 `initialize` 在 proxy 建構的同一筆交易內寫入三把鑰匙、向 factory（`msg.sender`）讀取**當下**的正式實作、自我升級過去。完成後就是普通的 UUPS 帳戶。

`initializer` 寫的是與正式實作同一個 ERC-7201 slot → 升級後 `initialize` 不可能重跑（劫持鑰匙的路鎖死）；anchor 本體 `_disableInitializers()`。

### 3. `Fido2AccountFactoryV2` — `accountImplementation` 可換

- `setAccountImplementation` 限 `DEFAULT_ADMIN_ROLE`，只影響**之後建立**的錢包
- `getAddress` 綁 anchor → **跨實作版本恆定**（有 forge 測試釘住）
- `AccountCreated` 事件與 V1 逐型別同形（app 的事件掃描 ABI 不用改）

### 被否決的替代方案

| 方案 | 否決原因 |
|---|---|
| **Beacon proxy** | beacon 持有者可以一次替**全體**錢包換掉任何邏輯（含移轉資產）。與本產品「資產移動必經持有人簽章」的既定邊界（服務條款 §3.3、`chain_receipt_status` 測試釘住的同一條線）相反。位址穩定的問題由 anchor 解，不需要付這個信任代價 |
| **factory 只加 mutable implementation（不加 anchor）** | 位址推導仍隨實作版本漂移，`webauthn.service` 的「從 factory 回推位址」路徑對舊使用者必然算錯——那是一整類會安靜發生的 bug |
| **鑄給平台 EOA 代持** | 「卡是誰的」語意改變，與「鏈上為準＝會員卡狀態」的產品定義相牴觸 |
| **改 `DynamicKYCMembership` 用 `_mint`** | 要重新部署卡片合約；且放棄接收確認等於允許把卡鑄進任何黑洞地址 |

## 對現有錢包客戶的影響

| 面向 | 結論 | 依據 |
|---|---|---|
| 不升級的錢包 | **零影響**：proxy 各自的 ERC-1967 slot 不動，付款、簽章、點數照舊；只是繼續收不到卡 | forge `testUntouchedV1WalletKeepsOldImplementation` |
| 誰要動手 | passkey 2,115 人**各一次**生物辨識（升級 UserOp 夾進下次登入／付款流程）；託管 4 人由平台代簽靜默完成 | DB 實測 `users=2119 custodial=4` |
| 覆蓋率 | **永遠不到 100%**（不回訪的使用者停在 V1）→ 混合狀態是常態設計，不是過渡 | — |
| 資費 | 平台墊付（relayer 全額買單是現況，`bundler.service.ts` 註明），自營鏈成本趨近零 | 實測錢包 ISC 餘額 0、EntryPoint deposit 0，一切照常運作 |
| 唯一重大風險 | 新版實作若弄壞 `validateUserOp` / `_authorizeUpgrade` → 該錢包**永久鎖死**（資產凍結，無法再簽任何 UserOp 修復） | 緩解：最小差異 + canary（見 Rollout） |

## 離鏈側的接縫（讓 D 上線不需要再發版）

worker 鑄卡前以一次 `eth_call` 探測 `supportsInterface(0x150b7a02)`：

- V1 錢包沒有這個函式 → revert → 視為 false → 標記「錢包尚不具備接收能力」，**跳過、不算失敗、不燒重試次數**
- 錢包升級完成的**下一輪掃描**探針變 true → 卡片自動開始鑄造，不需重置任何欄位

forge `testV2WalletAnswersReceiverProbe` 與 `testUntouchedV1WalletKeepsOldImplementation` 分別釘住探針的兩側語意。

## Rollout（部署順序，每一步可獨立回退）

1. **部署** `Fido2AccountFactoryV2`（anchor 與 V2 實作由 factory 建構子自帶）——此刻對任何人零影響
2. **Canary**：在本地鏈對一個 V1 錢包做完整升級驗證（簽章、轉點、收卡、再升級一次），再對正式鏈的平台自有錢包重複一次
3. **託管批次**（4 個）：平台代簽升級 UserOp，全程可觀測
4. **新註冊切換**：env 的 `NEXT_PUBLIC_SCW_FACTORY_ADDRESS` 指向 V2 factory。**切換前必須逐一驗證所有 DB `user.address` 在鏈上都有 code**（factory 事件 2,144 ≈ 使用者 2,119，看似急切部署，仍須驗證）；V1 factory 位址保留在設定中，既有使用者的位址一律以 DB 為準，禁止對舊使用者重推
5. **passkey 漸進升級**：app 在下次登入／付款時夾帶升級 UserOp（一次額外的生物辨識確認），滲透率跟著活躍度走
6. 會員卡 worker 的探針邏輯（PR #6687 的 A 方案）在任何一步之前就可以先上——它對 V1 錢包的行為是便宜地跳過

## Consequences（後果）

- ＋ 會員卡（與未來任何 ERC-721 / `safeTransferFrom` 資產）對升級後的錢包可用
- ＋ 之後的實作升版只需 `setAccountImplementation`，不再換 factory、位址永久穩定
- ＋ 錢包主權邊界不變：平台仍然沒有替既有錢包換邏輯的能力
- － 永久的混合狀態：離鏈側必須以探針處理「這個錢包能不能收」，直到自然收斂
- － 兩個 factory 並存的設定與文件成本；`webauthn.service` 的位址推導路徑需要一次稽核
- － repo 多了 foundry 工具鏈（僅 `forge test` 用，`foundry.toml` 開 `via_ir`——V1 factory 的 7 參數 emit 在 legacy codegen 會 stack too deep）

## 驗證

`forge test`：12 條全綠。三條關鍵不變式做過變異驗證（推導改綁實作 → 2 紅；anchor 不自我升級 → 3 紅；initializer 鎖拿掉 → 1 紅）。jest 全套照跑不受影響（227 suites / 3,022 tests）。
