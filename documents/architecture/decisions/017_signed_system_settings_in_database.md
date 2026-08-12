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

| 設定鍵                       | env fallback | 秘密 | 說明                              |
| ---------------------------- | ------------ | ---- | --------------------------------- |
| `GOOGLE_OAUTH_CLIENT_ID`     | 同名         |      | 第三方登入                        |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 同名         | ✓    | 第三方登入                        |
| `GEMINI_API_KEY`             | 同名         | ✓    | LLM 金鑰                          |
| `LLM_MODEL`                  | `MODEL`      |      | DB 鍵名刻意比 env 的 `MODEL` 明確 |
| `OEN_ACCESS_TOKEN`           | 同名         | ✓    | 金流憑證                          |
| `OEN_MERCHANT_ID`            | 同名         |      | 商店代號，保底 `mermer`           |

### 2. 讀取優先序取決於快照狀態

| 狀態          | 意義                 | 行為                                             |
| ------------- | -------------------- | ------------------------------------------------ |
| `EMPTY`       | 從未用 DB 保管過設定 | 讀 `process.env`，既有部署不改任何東西也能運作   |
| `TRUSTED`     | 驗簽通過             | **DB 是唯一事實來源，不再讀 env**                |
| `UNTRUSTED`   | DB 有設定但驗不過    | 拒絕服務並告警（`IS000097`）                     |
| `UNAVAILABLE` | DB 暫時讀不到        | 沿用上一份可信快照，否則暫時讀 env，且**不快取** |

#### 20260811 修正：原本的 fail-open 降級

第一版只有一個 `trusted` 布林值，且缺鍵會往下掉去讀 env。那產生兩個問題：

1. **一行 SQL 的憑證降級**：`UPDATE system_setting SET value = value || 'x'` 讓 digest 對不上，整組設定退回 env——於是 `.env` 裡輪替**之前**的舊 `GEMINI_API_KEY` / `OEN_ACCESS_TOKEN` / `GOOGLE_OAUTH_CLIENT_SECRET` 立刻復活（既有部署一定還留著），而對外行為完全正常，只有一行 `logger.error`。
2. **撤銷無效**：SUPER_ADMIN 為了停用某項功能把秘密清空並簽名，DB 內該鍵被刪除，讀取時卻落回 `process.env` 的舊值——功能照樣啟用。管理員簽下的「這一項為空」被系統無視。

修法是把「從來沒設定過」與「設定被竄改」分成不同狀態：前者可以讀 env（遷移期的正常狀態），後者一律 fail closed。`SYSTEM_SETTING_FALLBACKS` 是程式碼常數不是環境狀態，在 `TRUSTED` 下仍然適用。

信任根不在 env 這一種情況刻意保留 env fallback：它只可能來自 `.env` 缺鍵，而能改 `.env` 的人本來就能改任何東西，不在「具 DB 寫入權限的攻擊者」這個威脅模型內；硬性停機會讓一次設定失誤變成全站故障。設定頁另有 `trustRootReady` 明確呈現這個狀態。

第一次寫入時，`effectiveValues()` 會把當下還靠 env 生效的值一併帶進 pending。少了這一步，既有部署只要在設定頁存一次 Google OAuth，原本放在 `.env` 的 `GEMINI_API_KEY` 就會跟著失效——因為寫入成功後狀態變成 `TRUSTED`，env 不再被讀取。

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

#### 20260811 修正：canonical 編碼原本不是單射

第一版沒有 escaping，值裡放一個換行就能偽裝成「多一個設定鍵」：

```
集合 A：{ LLM_MODEL: "flash\nOEN_MERCHANT_ID=attacker" }
集合 B：{ LLM_MODEL: "flash", OEN_MERCHANT_ID: "attacker" }
```

兩者的 canonical string 逐位元相同，digest、簽章、version 全部相同。也就是說只要歷史上有任何一版被簽的設定裡有一個值含換行，具 DB 寫入權限者就能在不動 manifest、不動簽章、不動 version 的前提下把設定列重組成語意完全不同的內容——**而那正是這整套機制唯一要防的攻擊**。

兩層都補上了：`settingValueSchema` 拒絕所有控制字元（含 `\r` `\n`），`buildCanonicalString` 對值做 escaping（反斜線必須先跳脫，否則 `"a\\nb"` 與含換行的 `"a\nb"` 會再次碰撞）。

排序同時從 `localeCompare` 改成 code unit 比較：`localeCompare` 的結果取決於執行環境的 ICU 資料與預設 locale，而這個 digest 要跨瀏覽器、跨實例比對；`.env` 那側用的本來就是 `Object.keys().sort()`，兩邊規則原本並不一致。

`src/__tests__/system_setting_signature.test.ts` 有一條測試專門斷言上面兩個集合的 digest **不得相等**。原本那條叫「避免值內容偽造版本行」的測試只檢查最後一行是 `__version__=N`，根本沒涵蓋這件事——名字宣稱守住某個攻擊、內容卻沒守的測試，比沒有測試更危險。

### 4. Fail Closed

`SystemSettingService.loadSnapshot()` 在下列任一情況都回傳「不可信的空快照」，上層自動退回 env：

- 有設定列但沒有 manifest
- 偵測到 version 回滾
- 出現未知的設定鍵
- **DB 列的 `isSecret` 與程式碼定義不符**（見下）
- 秘密值解密失敗（含 GCM authTag 不符 = 密文遭竄改）
- digest 與 manifest 不符
- FIDO2 簽章驗證失敗

（信任根不存在於 env 屬於部署設定問題而非竄改，處理方式見上方讀取優先序。）

#### 20260811 修正：`isSecret` 不能由資料自己宣告

第一版直接採信 `row.isSecret` 來決定要不要解密。於是這一行 SQL 可以把秘密降級成明文而不被偵測：

```sql
UPDATE system_setting SET is_secret=false, value='<明文>', iv=NULL, auth_tag=NULL
WHERE key='GEMINI_API_KEY';
```

`decryptRow` 不會被呼叫，算出來的 entries 明文與原值相同，於是 digest 與簽章依然有效、系統回報 `trusted`——秘密從此明文躺在 DB 裡，下一次 dump 就外流，而沒有任何機制會發現。

現在以 `SYSTEM_SETTING_DEFINITIONS[key].isSecret` 為唯一事實來源，並斷言 DB 列與它一致，不符即整組判為不可信。加密與否不是資料自己能宣告的事。

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

#### 補充（2026-08-12）：`ChatService` 的讀取點已收斂為單一入口

上面那段描述的「優先序：建構子 > DB > env」是當時的實作，之後有三處改變（見 `fix/llm_key_resolution_precedence`）：

1. **`ensureClient()` 不再自行讀環境變數。** `get()` 已經是四態的，而 `GEMINI_API_KEY` / `MODEL` 正是 `GEMINI_API_KEY` / `LLM_MODEL` 的 `envKey` —— 在 `ensureClient()` 再讀一次 env 於每個狀態下都是死碼，**除了它造成傷害的那一個**：管理員清空並簽名（= 撤銷）之後 DB 回 `undefined`，那一行會把 env 裡的舊金鑰救回來，撤銷因此無效。現在 `get()` 是唯一的 env 入口。
2. **`explicitApiKey` 存在時短路，完全不查資料庫。** 原本 `get()` 在檢查它之前就無條件執行，所以「呼叫端明確傳入」只是取值順序，不是「不必問」。
3. **`GOOGLE_API_KEY` 已移除。** 它不在 `SystemSettingKey` 裡，永遠不受 manifest 簽章涵蓋、也不出現在 `/admin/settings` —— 能設環境變數的人可以繞過整套「全集簽章 + 稽核 + 撤銷」注入一把金鑰。要第二把金鑰請走系統設定。

另外新增 `ChatService` 的 `allowSystemSettings` 選項：設為 `false` 時完全不查設定。唯一用途是**沒有主資料庫權限的節點**（`MissionExecutor`，見 `async_workers/00_async_worker_overview.md`）。那些節點的行為差異記在 `known_issues/executor_settings_isolation.md`。

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

3. **驗簽有 30 秒快取**，因此設定變更在同一個程序內最多延遲 30 秒生效（寫入路徑會立即失效快取，故只影響多程序部署的其他實例）。「DB 暫時讀不到」這個結果刻意不寫入快取、也不覆蓋既有的可信快照——否則一次 200ms 的連線抖動會把降級狀態固化 30 秒，故障早就恢復了但整批請求還在用 env 的舊憑證。

4. **`.env.example` 的隱性契約**：`validateEnvDetailed()` 把 `.env.example` 的每一個鍵都當成必要鍵，缺一個就判定系統未初始化並重開部署精靈——而部署精靈那條路徑在該狀態下沒有身分驗證。因此選填參數（`SECRET_VAULT_MASTER_KEY`、`GOOGLE_OAUTH_*` 等）刻意只以註解記載，不列成鍵值。

   這個約定原本只存在於一行文件裡，是一顆定時炸彈：半年後有人為了「讓 `.env.example` 更完整」把 `GOOGLE_OAUTH_CLIENT_ID=` 加回去，所有既有部署下次重啟就會全部掉進未初始化狀態——code review 看不出來、CI 不會紅、上線才炸。現在由 `src/__tests__/env_example_contract.test.ts` 斷言所有 `SystemSettingKey` 的 `envKey` 加上 `SECRET_VAULT_MASTER_KEY` 都不出現在 `.env.example` 的鍵集合裡。

5. **部署精靈的無認證階段曾可覆寫信任根。** `saveSystemSettingDraft` 原本只檢查「鍵是否已定義」，值則原封寫進 `.env.setup`；而 `updateOrAppendEnv` 沒有任何 escaping。塞一個換行就能憑空長出第二行環境變數——包括 `SUPER_ADMIN_PUB_X`。由於 `readSuperAdminCredential()` 讀的是 `.env` ⊕ `.env.setup` 的合併結果（後者覆蓋前者），攻擊者可藉此把自己變成簽章者，之後自簽任意系統設定。

   三道都補上了：值必須通過 `settingValueSchema`、`updateOrAppendEnv` 斷言單行、`readSuperAdminCredential()` 優先取 `.env`（只有 `.env` 完全沒有時才看暫存區，初次部署才需要）。

6. **精靈的第二次簽章原本是盲簽。** `getSystemSettingChallenge()` 回傳的 `items` 被直接丟棄，畫面只顯示 `.env` 的內容，管理員會簽下一份自己從未看過的設定，而那份簽章帶有完整的 FIDO2 稽核證據。本 ADR 「管理員在畫面上核可的本來就是明文」這個論點在 `/admin/settings` 成立，但在精靈那條路徑原本並不成立。現在待簽的設定會逐項顯示（秘密顯示遮罩，關鍵是讓管理員看到有哪些鍵）。

7. **精靈重跑會靜默回退已輪替的金鑰。** `readStagedSettings()` 原本讀 `computePredictedFinalEnvString()`（`.env` ⊕ `.env.setup`），也就是把 `.env` 裡的舊值一起當成「這次暫存的變更」。在設定頁輪替過 `GEMINI_API_KEY` 之後，任何一次重跑精靈都會從 `.env` 撈到輪替前的舊金鑰並簽章寫回；而 `applySystemSettingSignature` 只清 `.env.setup`，`.env` 的舊值還在，下次再來一次。現在只讀 `.env.setup`——暫存區就該只有暫存區。

## 後續工作

- [x] Phase 2：`GEMINI_API_KEY` / `MODEL` / `OEN_*` 遷移至 DB（`STORAGE_DOMAIN` / `OSRM_ROUTER_URL` 經評估後刻意留在 env，理由見上方分層）。
- [x] `/admin/settings` 加入變更歷史檢視。
- [x] 把 `/admin/settings` 掛進 `ADMIN_MODULES`。
- [ ] 把 manifest digest 錨到 `LedgerAnchor` 或 `.env`，補上 rollback 的最後一道防線。**現況的 rollback 防護實效接近零**：`version` 的來源就是 manifest 自己，沒有 DB 序列也沒有外部錨點，單調性檢查只有「manifest.version 不得低於稽核表最高版本」一條，而三張表在同一個 DB。攻擊者還原 v3 的設定與 manifest，再 `DELETE FROM system_setting_audit WHERE version > 3` 就通過了。它擋得住的其實是「手滑只還原一張表」，對有 DB 寫入權限的攻擊者是零成本繞過——而那正是這個機制唯一存在的理由。`signedAt` 也不在 digest 內，同一份簽章可無限期重放。
- [ ] 主密鑰移往 KMS 並實作 `keyVersion` 輪替（含既有密文的重新封裝）。`keyVersion` 目前**只寫不讀**：`openSecret` 不參考它，`getSubKey` 也不接受版本參數。把 `VAULT_KEY_VERSION` 改成 2 並換掉主密鑰的話，舊密文（含所有託管私鑰）會一律 authTag 失敗且無法並存兩版本。欄位存在，機制不存在。
- [ ] 寫入路徑的 TOCTOU：讀 → 驗 → 寫三步都在 transaction 外，transaction 內沒有 version 條件式更新。兩位 SUPER_ADMIN 同時以相同 `baseVersion` 送出時，第二筆會撞 audit 的 version 唯一鍵而整筆 rollback，使用者拿到 500 而非設計好的 `CF000001`。結果不會半套（`replaceAll` 在單一 transaction 內），但錯誤訊息會誤導。
- [ ] `sealSecret` / `openSecret` 把 `key`（託管金鑰則是 `userId`）當成 AES-GCM 的 AAD，防止密文在鍵之間或使用者之間被搬移。
- [ ] `src/scripts/e2e_seeder/*` 仍直接讀 `process.env.GEMINI_API_KEY`。這些是獨立執行的腳本，維持讀 env 是合理的，但若日後改為只在 DB 保管金鑰，需要為腳本提供一條解析路徑。
