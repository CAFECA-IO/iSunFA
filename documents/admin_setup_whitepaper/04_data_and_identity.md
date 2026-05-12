# 第 4 章：資料錨定與超級管理員核發 (Data & Identity)

## 1. 架構定位

在完成區塊鏈智能合約的基礎設施部署後，iSunFA 系統會進入第 5 階段「資料庫初始化 (Init Database)」與第 6 階段「超級管理員核發 (Super Admin)」。
這兩個階段的目標是將「鏈上資產（Smart Contracts）」與「鏈下資料庫（PostgreSQL）」透過一個具備最高權限的密碼學身分（Super Admin）進行無縫且唯一的錨定。

## 2. Stage 5: 資料庫配置與結構同步 (Init Database)

在傳統開發流程中，資料庫的 schema 變更往往需要依賴工程師手動下達 migration 指令。而在 iSunFA 的零信任初始化架構中，這一切被封裝在 `src/services/setup.db.service.ts` 中自動執行。

### 2.1 動態密碼注入與容器同步
在 Stage 2 中，系統已經為 PostgreSQL 生成了一組 24 位元的隨機密碼並寫入 `.env`。在 Stage 5 中，系統會透過 Docker CLI 穿透執行 SQL 指令，強制更新容器內的資料庫密碼，確保 `.env` 與實際運行的 Container 密碼完全一致，這排除了人為配置錯誤的可能：
```bash
# 系統底層執行之等效指令 (帶有嚴格的 SQL 跳脫防護)
psql -U isunfa -d isunfa -c "ALTER USER isunfa WITH PASSWORD '<DYNAMIC_PASSWORD>';"
```

### 2.2 Prisma 結構遷移 (Schema Push)
密碼同步完成後，系統會在背景執行 `npx prisma db push --accept-data-loss`，將 `prisma/schema.prisma` 定義的表結構（Table Schemas）強制推送到資料庫中。介面會即時顯示成功同步的資料表數量（Table Count），並將設定封裝至 `.env.setup` 的 `# PART 3: Database Configuration` 區塊。

## 3. Stage 6: 超級管理員密碼學身分簽發 (Super Admin)

這是 iSunFA 系統中最重要的權限控制核心。系統嚴格禁止透過帳號/密碼 (Password-based) 註冊最高管理員，而是全面採用 FIDO2 (WebAuthn) 與 AA 錢包。實作細節位於 `src/services/setup.service.ts` 的 `createSuperAdminRecord`。

### 3.1 唯一性降級機制 (Uniqueness Guarantee)
為了防止系統權限泛濫，當註冊新的 Super Admin 時，後端邏輯會強制執行「全局降級」：將資料庫中現存的所有 `SUPER_ADMIN` 降級為一般 `USER`，確保在同一時間，全系統**有且僅有一位**掌握最高私鑰的 Super Admin。

### 3.2 雙軌金鑰架構 (Dual Key Architecture)

Super Admin 在創建時，系統會同時處理兩組非對稱金鑰，分別負責「前端驗證」與「後端簽署」：

1.  **前端硬體金鑰 (FIDO2 / WebAuthn)**
    *   **來源**：使用者的實體安全金鑰 (如 YubiKey、Touch ID 或 Windows Hello) 所生成的 P-256 ECC 金鑰對。
    *   **儲存**：其 Credential ID (`SUPER_ADMIN_CRED_ID`) 與公鑰座標 (`SUPER_ADMIN_PUB_X`, `SUPER_ADMIN_PUB_Y`) 會被寫入 `.env.setup`。
    *   **用途**：用於解鎖系統管理員介面，以及後續生成「環境簽章」防篡改校驗。
2.  **後端簽署私鑰 (DeWT Private Key)**
    *   **來源**：由 Node.js 後端 `crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" })` 動態生成的第二把 ECC P-256 金鑰對。
    *   **儲存**：私鑰以 PEM 格式寫入 `.env` (`DEWT_PRIVATE_KEY_PEM`)。
    *   **用途**：作為發行系統去中心化網路憑證 (Decentralized Web Token, DeWT) 的 Root Key。

### 3.3 鏈上權限錨定 (On-chain Role Provisioning)
除了在資料庫中標記 `Role.SUPER_ADMIN` 之外，後端管線還會自動為此管理員執行以下區塊鏈操作：
1.  **SCW 工廠調用**：使用 FIDO2 公鑰座標向 `Fido2AccountFactory` 生成或取得對應的 Account Abstraction (AA) 智能合約錢包地址。
2.  **最高級別 KYC**：呼叫 `setAccountKYCLevel(address, 10)`，賦予該地址最高等級的合規通行證。
3.  **合約管理員賦權**：呼叫 `grantDefaultAdminRoles(address)`，將各核心合約（如 Credit Point、Membership System）的 `DEFAULT_ADMIN_ROLE (0x00)` 指派給該地址，完成鏈下與鏈上權限的統一。
