# 🔗 iSunFA 零信任財報稽核架構 (Zero-Trust Audit & Immutability Architecture)

> **Date**: 2026-05-10
> **Author**: Tzuhan
> **Context**: 針對各國政府與監管機構 (如金管會、SEC) 對於「AI 自動化產出財報」的防弊疑慮，從區塊鏈與密碼學底層技術出發，盤點目前系統的不可篡改實作範圍，並定義挑戰國家級底線的終極防禦架構。

## 🏛️ 核心技術宣示 (The Web3 Manifesto)

作為區塊鏈原生的技術團隊，我們深知傳統 Web2 資料庫 (如 PostgreSQL) 在最高級別的合規審查中，依然存在「DBA (資料庫管理員) 惡意竄改」的單點故障風險 (Single Point of Failure)。

既然我們的終極目標是讓**「政府採用 iSunFA 作為底層稽核引擎」**，我們就不能僅靠「應用程式的權限控管 (RBAC)」，而必須導入**「密碼學級別的不可篡改性 (Cryptographic Immutability)」**。

---

## 🔍 現行系統的不可篡改實作範圍 (Current Immutability Coverage)

目前 iSunFA 系統在架構中已經埋入了許多區塊鏈與密碼學的基石，主要集中在「身分」與「檔案」層面：

### 1. 檔案與憑證層級 (File Hash Integrity)

- **實作位置**：`Prisma.File` 模型中的 `hash` 欄位。
- **防護範圍**：所有由客戶上傳的原始發票、單據與 PDF 報告，在上傳瞬間都會計算並記錄 SHA-256 Hash。
- **審計意義**：確保原始證據 (Source Document) 絕對無法被靜默替換。就算伺服器遭到入侵更換了圖片檔，Hash 值的比對也能瞬間揭露竄改行為。

### 2. 身分與責任歸屬 (ONCHAINID & AA Wallet)

- **實作位置**：`Prisma.User` 中的 `identityAddress` (ONCHAINID RWA 實體身分合約) 與 `address` (Web3 錢包地址)；以及 `user_op_builder.ts` 中的 ERC-4337 抽象帳戶 (AA) 實作。
- **防護範圍**：系統的操作者不僅僅是一個信箱帳號，而是綁定區塊鏈智能合約的 Web3 身分。結合 `AuditLog` (稽核軌跡)，我們能追溯所有變更到具體的鏈上錢包。
- **審計意義**：達到「不可否認性 (Non-repudiation)」。任何人包含 CPA 簽核，都具有區塊鏈級別的簽章效力。

### 3. 軌跡追蹤 (Web2 Audit Log)

- **實作位置**：`Prisma.AuditLog` 模型。
- **防護範圍**：攔截 `Journal` (日記帳)、`Voucher` (傳票)、`EsgRecord` (碳排紀錄) 的 `CREATE`, `UPDATE`, `DELETE` 動作。
- **局限性 (The Gap)**：目前的 `AuditLog` 仍是傳統的關聯式資料庫表。擁有 DB Root 權限的內部人員仍有能力「同時竄改傳票金額並刪除對應的 Audit Log」。

---

## 🚀 挑戰國家級底線：下一代全鏈上稽核演進藍圖 (The Zero-Trust Roadmap)

為了達到「政府級別的信任」，我們必須將「不可篡改性」從邊緣 (檔案、身分) 核心延伸到**「財報數據 (Voucher/Ledger) 本身」**。以下是接下來需要排入開發的 Web3 底層技術升級計畫：

### Phase A: 稽核軌跡的密碼學雜湊鏈 (Hash-Chained Audit Logs)

- **痛點**：目前的 `AuditLog` 可以被單筆抽換或刪除。
- **架構實作**：重構 `AuditLog`，導入類似 Git 或 Blockchain 的 **Hash Chain** 機制。每一筆新的 `AuditLog` 必須包含上一筆 `AuditLog` 的 Hash 值 (`previousHash`)。
- **商業價值**：在不寫入區塊鏈的前提下，光是在 PostgreSQL 內部就能達成「防竄改」：一旦中間任何一筆資料被修改或刪除，後續所有的 Hash Chain 將全數斷裂，系統會立刻觸發「資料庫遭污染 (Data Corruption)」的最高級別警報。

### Phase B: 財報帳本的 Merkle Tree 狀態根 (Ledger Merkle Root)

- **痛點**：財報是由成千上萬筆 `Voucher` 聚合而成，驗證成本極高。
- **架構實作**：
  1. 每當一個月結或年結算週期完成，系統會將該 `AccountBook` 底下所有的 `Voucher` 與 `EsgRecord` 作為葉節點 (Leaf Nodes)。
  2. 計算出一組代表該年度財報的 **Merkle Root (梅克爾根)**。
- **商業價值**：政府稽核員不需要下載數百萬筆發票，只需要拿到這個 Merkle Root，結合任意抽查的幾筆傳票 (Merkle Proof)，即可在毫秒內用數學證明：這份財報的總額與底層每一張發票絕對吻合，沒有任何一塊錢被捏造。

### Phase C: 狀態根上鏈與智能合約公證 (On-chain Anchoring via Smart Contracts)

- **痛點**：即使有了 Merkle Root，只要伺服器還在 iSunFA 掌控中，外界仍會懷疑我們能「整套重算」。
- **架構實作**：
  1. 開發一個 `iSunFA_Audit_Registry` 智能合約 (部署於以太坊 Layer 2 或 Polygon)。
  2. **簽章與上鏈時機點解耦**：系統的寫入動作（如購買/訂閱解析額度）已與 `Order` 綁定，用戶在付款時即完成簽名與基礎軌跡上鏈。當用戶進行「下載年度財報 / 匯出 ESG 報告」等重大宣告行為時，系統應要求用戶再次透過 AA 錢包簽章 (Report Download Anchoring)，並將財報的 Merkle Root 與下載快照一併上鏈，完美契合「使用者主動揭露」的法遵軌跡。
- **商業價值**：**降維打擊**。這將使 iSunFA 從「一套好用的軟體」昇華為「不可挑戰的公證所」。當企業的財報狀態根被刻在區塊鏈上，政府稅局與四大會計師可以直接調用區塊鏈合約驗證財報真偽，從根本上消滅了「做假帳」的可能性。

---

## 🌊 Web3 稽核深水區：會計實務與區塊鏈的碰撞 (The Deep Waters)

在將會計實務搬上區塊鏈的過程中，我們發現了幾個傳統 Web3 工程師極易忽略的「致命盲點」。我們必須在智能合約與資料庫設計中預防這些問題：

### 1. 拒絕「垃圾的不可篡改性」與排放係數快照 (Emission Factor Snapshots)

- **盲點**：區塊鏈只能保證資料沒被竄改，無法保證一開始寫入的資料是正確的。如果 AI 產生了充滿幻覺的碳排數據並寫上鏈，那只是把錯誤永久刻在區塊鏈上。此外，碳排放係數每年都會更新。
- **架構實作**：在計算 Merkle Root 時，`EsgRecord` 的葉節點 (Leaf Node) **絕對不能**只包含活動數據 (如用電度數) 與外部關聯 ID。我們必須將「當下系統使用的碳排放係數數值」一起 Hash 進該葉節點中。這確保了即便明年政府更新了係數表，區塊鏈上的帳本依然能夠透過去年的歷史係數進行完美驗證。

### 2. 狀態根版本控制與追溯重編 (Versioned State Roots for Restatements)

- **盲點**：區塊鏈的核心是「不可逆」，但會計實務中允許「前期損益調整 (Retrospective Restatements)」(例如發現前期錯誤，或變更折舊年限)。一旦企業合法地追溯重編財報，底層的 Voucher 就會變動，導致原本在鏈上的 Merkle Root 驗證失敗，觸發不必要的資料污染警報。
- **架構實作**：我們設計的 `iSunFA_Audit_Registry` 智能合約必須支援 **「狀態根版本控制 (Versioned State Roots)」** 機制。這類似於 Git 的 Commit Tree，允許同一個年度的財報擁有多個版本的 Merkle Root (例如：`2024_v1`, `2024_v2_restated`)。每次的追溯調整都必須附帶會計師的 Multi-sig 與合法的調整分錄證明，讓新舊帳本的 Merkle Root 能夠在區塊鏈上合法地繼承與更迭，完美融合 Web3 的不可篡改性與會計的彈性。

---

## 總結 (Conclusion)

我們目前的系統已經具備了「不可篡改」的雛形 (File Hash & Web3 Identity)。只要我們在接下來的迭代中，將 **Hash Chain** 與 **Merkle Root Anchoring** 實作進核心會計引擎，iSunFA 將成為全球第一套具備**「密碼學級別絕對信任 (Cryptographic Absolute Trust)」**的 ESG 與財務雙軌審計基礎設施。
