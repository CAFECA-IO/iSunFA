# ADR 017: 帶簽章的資料庫系統設定 (Signed System Settings in Database)

> **Date**: 2026-08-09
> **Author**: Luphia
> **Status**: Proposed
> **關聯 ADR**: [016 第三方登入與託管錢包](./016_third_party_login_and_custodial_wallet.md)
> **關聯程式碼**: `src/lib/config/system_setting_signature.ts`、`src/services/system_setting.service.ts`、`src/app/admin/settings/`

---

## Context（脈絡）

系統原本所有設定都放在 `.env`，完整性由 `SUPER_ADMIN_SIGNATURE` 保護（`src/validators/env.ts`）：

```
排序後的 KEY=VALUE 串接 → SHA-256 → base64url → 當作 WebAuthn challenge
                                              → SUPER_ADMIN passkey 簽章
```

這個設計本身是好的，但綁著三個現實成本：

1. **改一個值要重簽整份 `.env`**，因為 digest 涵蓋全檔。
2. **改完要重啟容器**，`process.env` 才會更新。
3. **`validateEnv()` 同時是「系統已初始化」的閘門**，一旦通過，`/admin/setup` 的所有 action 就被 `FO_SYSTEM_INITIALIZED_ALREADY` 鎖死。營運中要改一個 OAuth 用戶端，等於得走一次重新初始化流程。

而 ADR 016 引入的 Google 登入設定（client id / secret）恰恰是「會換、需要輪替、且屬營運決策」的參數。把它塞進 `.env` 會讓上述三個成本變成日常。

## Decision（決策）

**新增 `system_setting` 資料表作為設定的正式保管地，並以與 `.env` 同構的全集簽章保護其完整性。**

### 1. 分層：什麼留 env、什麼進 DB

留 `.env`（`src/constants/system_setting.ts` 有完整說明）：

- **Bootstrap 依賴**：`DATABASE_URL`、`POSTGRES_*` —— 讀 DB 之前就要用到。
- **保護 DB 內容的金鑰**：`SECRET_VAULT_MASTER_KEY`、`DEWT_PRIVATE_KEY_PEM` —— 保護者不能存在被保護的地方。
- **驗證 DB 簽章的信任根**：`SUPER_ADMIN_CRED_ID` / `PUB_X` / `PUB_Y` —— 若信任根也放 DB，能改設定的攻擊者就能一併改公鑰，簽章驗證退化成自欺。
- **所有 `NEXT_PUBLIC_*`** —— Next.js 在 build 時內嵌進 client bundle，DB 的值到不了瀏覽器。這是硬限制。
- **部署拓撲**：`STORAGE_DOMAIN`、`OSRM_ROUTER_URL`、`REPORT_OUTPUT_DIR` / `MISSION_DIR` / `ISSUE_DIR` —— 這些是「這台機器接到哪個服務、寫到哪個路徑」，屬於環境差異而非營運決策。它們不會輪替，搬進 DB 只增加一層間接性。

進 DB：其餘 server-only 且**會輪替**的營運憑證與參數。目前涵蓋：

| 設定鍵 | env fallback | 秘密 | 說明 |
|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | 同名 | | 第三方登入 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 同名 | ✓ | 第三方登入 |
| `GEMINI_API_KEY` | 同名 | ✓ | LLM 金鑰 |
| `LLM_MODEL` | `MODEL` | | DB 鍵名刻意比 env 的 `MODEL` 明確 |
| `OEN_ACCESS_TOKEN` | 同名 | ✓ | 金流憑證 |
| `OEN_MERCHANT_ID` | 同名 | | 商店代號，保底 `mermer` |

### 2. 讀取優先序：`DB（已驗簽） > process.env > 無`

既有部署不改任何東西也能繼續運作；DB 一旦有經簽章的值就以 DB 為準。這讓遷移可以逐項進行，不需要一次性切換。

### 3. 全集簽章而非逐列簽章

`SystemSettingManifest`（單列）存放 digest、簽章、簽署者與 version。canonical string 為：

```
<排序後的 key=明文value 逐行>
__version__=<N>
```

三個刻意的決定：

- **簽全集**：逐列簽章擋不住「整列刪除」——攻擊者刪掉 `GOOGLE_OAUTH_CLIENT_SECRET` 那一列，剩下的列簽章依然有效。只有涵蓋全集的 digest 才偵測得到新增與刪除。
- **簽明文而非密文**：AES-GCM 每次加密的 IV 都不同，簽密文會在每次重新加密後自我失效；而且管理員在畫面上核可的本來就是明文。驗證時先解密再算 digest。
- **空值即省略**：值為空字串的設定不進 canonical string，讓「刪除設定」與「設成空字串」得到同一個 digest，避免同一份實質設定因寫法不同而驗不過。

### 4. Fail Closed

`SystemSettingService.loadSnapshot()` 在下列任一情況都回傳「不可信的空快照」，上層自動退回 env：

- 有設定列但沒有 manifest
- 信任根（SUPER_ADMIN 公鑰）不存在於 env
- 偵測到 version 回滾
- 出現未知的設定鍵
- 秘密值解密失敗（含 GCM authTag 不符 = 密文遭竄改）
- digest 與 manifest 不符
- FIDO2 簽章驗證失敗

**絕不採用內容可疑的設定**。驗簽是 P-256 運算，因此結果以 30 秒 TTL 的記憶體快取，寫入時立即失效。

### 5. 秘密值加密存放

秘密設定以 AES-256-GCM 加密（`src/lib/auth/key_vault.ts`）。主密鑰 `SECRET_VAULT_MASTER_KEY` 留在 env，透過 `VaultPurpose` 做 KDF domain separation，與 ADR 016 的託管錢包私鑰共用同一把主密鑰但派生出互不相通的子金鑰。

淨效果是「**一把 env 主密鑰，換掉所有其他 env 秘密**」。DB dump、備份與 read replica 外流不等於秘密外流。

### 6. 兩條寫入路徑

**A. 部署精靈（初始化期間）** — 步驟 7 收集 Google 設定並暫存於 `.env.setup`，步驟 8 簽章時寫入 DB 並**從 `.env.setup` 移除**（秘密值若同時留在 `.env`，就白費了加密保管的設計）。因為 `.env` 與 DB 是兩份各自獨立的資料，管理員會簽兩次；沒有待簽的系統設定時完全跳過第二次，不增加負擔。

初始化期間 SUPER_ADMIN 的公鑰還在 `.env.setup`、尚未進 `process.env`，因此 `applySigned` 提供 `credentialOverride` 參數，僅供這條路徑使用。

**B. `/admin/settings`（營運期，本 ADR 的主要價值）** — 改設定不需要動 `.env`、不需要重簽 `.env`、**不需要重啟服務**。

這裡刻意不複用既有的 `validateAdminFido2()`：它的 challenge 是 `challengeToken` 內的隨機值，只證明「管理員本人同意做某次操作」，**不證明他同意的是哪份內容**。本設計改以「設定內容的 digest」當 challenge，簽章本身即是對內容的承諾，且可長期保存作為稽核證據。

簽署權限限 **SUPER_ADMIN**（與 `.env` 同一個信任根）；ADMIN 可檢視但不可修改。

寫入採樂觀鎖：`version` 對不上就回 `CF000001`，要求重新載入，避免兩個管理員同時修改時後者靜默覆蓋前者。

### 7. 呼叫端的遷移策略：延遲解析，而非改寫呼叫點

設定改由 DB 解析後，讀取必然變成非同步的，但既有程式碼有大量同步讀取點。兩種處理方式：

- **`ChatService`（20+ 個 `new ChatService()`，含預設參數值與同步 getter）**：把金鑰與模型名的解析從建構子搬到「首次使用時」（`ensureClient()`）。**所有呼叫端一行都不必改**，而且輪替金鑰後新的請求會自動取得新值。代價是「缺少金鑰」的錯誤從建構時延後到首次呼叫時才拋出。
- **OEN 金流（3 個模組層 `const`）**：直接改成在 request handler / cron 內非同步解析。原本模組層的 `const` 是在 import 時求值的——那本來就使得輪替憑證必須重啟服務。

順帶修掉一個潛在缺陷：`payment_method/route.ts` 原本把 `merchantId` 寫死成 `"mermer"`，導致部署精靈收集的 `OEN_MERCHANT_ID` 從未生效。現已改讀設定（保底值仍為 `mermer`，行為相容）。

**刻意不做**：把 `process.env` 在啟動時用 DB 值覆寫（hydrate）。那樣所有讀取點都不必改，但會破壞 fail-closed —— 一旦寫進 `process.env`，之後即使偵測到簽章失效，舊值仍留在記憶體中被使用。

### 8. 遮罩秘密的合併規則

設定頁上秘密值以 `********` 顯示，瀏覽器手上沒有明文。若管理員只改了別的欄位、讓秘密欄位維持遮罩原樣，`toEntries()` 會把遮罩還原成目前存放的值——否則「沒動到的秘密」會被當成刪除。

`buildChallenge` 與 `applySigned` 共用同一個 `toEntries()`，因此**管理員簽下的 digest 與最終寫進 DB 的內容必然一致**。

## Consequences（後果）

### 正面

- 改 OAuth 用戶端從「改 .env → 重簽 → 重啟」變成「改欄位 → 簽名 → 生效」。
- `.env` 需要變更的頻率大幅下降，連帶降低重簽與重啟的次數。
- 每次設定變更都留下一份對內容的 FIDO2 簽章 + version + 變更鍵清單（`SystemSettingAudit`），稽核軌跡比 `.env` 完整（`.env` 只保留最新一份簽章）。
- 秘密值加密存放，安全等級高於明文躺在 `.env` 檔案裡。
- 新增設定項只需在 `SYSTEM_SETTING_DEFINITIONS` 多一筆定義，設定頁、簽章與讀取邏輯自動涵蓋。

### 負面與風險（必須正視）

1. **Rollback 攻擊擋不完全。** 能寫 DB 的攻擊者無法偽造新簽章（沒有 passkey 私鑰），但可以把 `system_setting` + `manifest` 整組還原成一份**過去真實簽過**的舊版本——舊簽章是有效的。`SystemSettingAudit` 的 version 單調性檢查擋得住「只回滾 manifest」，但攻擊者連稽核表一併回滾就繞過了。

   完全防堵需要 DB 以外的錨點（寫進 `.env`，或錨到既有的 `LedgerAnchor` 上鏈機制）。**現況 `.env` 的保護等級其實相同**——能寫檔案的人同樣能把 `.env` 與舊簽章一起還原——所以這不是相對於現況的退步，但也不該被當成已解決。

2. **`SECRET_VAULT_MASTER_KEY` 是單點故障**，且現在同時保護託管錢包與系統設定，影響面比 ADR 016 更大。正式環境應移往 KMS / HSM（`keyVersion` 欄位已預留輪替空間）。

3. **驗簽有 30 秒快取**，因此設定變更在同一個程序內最多延遲 30 秒生效（寫入路徑會立即失效快取，故只影響多程序部署的其他實例）。

4. **`.env.example` 的隱性契約**：`validateEnvDetailed()` 把 `.env.example` 的每一個鍵都當成必要鍵，缺一個就判定系統未初始化並重開部署精靈。因此選填參數（`SECRET_VAULT_MASTER_KEY`、`GOOGLE_OAUTH_*`）刻意只以註解記載，不列成鍵值。**日後新增選填參數時必須遵守這個規則**，否則既有部署升級後會被迫重跑初始化。

## 後續工作

- [x] Phase 2：`GEMINI_API_KEY` / `MODEL` / `OEN_*` 遷移至 DB（`STORAGE_DOMAIN` / `OSRM_ROUTER_URL` 經評估後刻意留在 env，理由見上方分層）。
- [x] `/admin/settings` 加入變更歷史檢視。
- [x] 把 `/admin/settings` 掛進 `ADMIN_MODULES`。
- [ ] 把 manifest digest 錨到 `LedgerAnchor` 或 `.env`，補上 rollback 的最後一道防線。
- [ ] 主密鑰移往 KMS 並實作 `keyVersion` 輪替（含既有密文的重新封裝）。
- [ ] `src/scripts/e2e_seeder/*` 仍直接讀 `process.env.GEMINI_API_KEY`。這些是獨立執行的腳本，維持讀 env 是合理的，但若日後改為只在 DB 保管金鑰，需要為腳本提供一條解析路徑。
