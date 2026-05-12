# 架構權衡與數值精度指南 (Architectural Trade-off & Numerical Precision)

> **Date**: May 2026
> **Scope**: `src/lib/report/*`, `Prisma Schema`, API Serialization, Frontend Utilities
> **Info**: (20260512 - Tzuhan) [UPDATED - V2 Enterprise IPO-Grade]

本指南記錄了 iSunFA 在處理龐大企業財務、Web3 加密貨幣與 ESG 數據時，針對數值精度、資料庫型別與效能所做的核心架構決策 (Architecture Decision Record)。

## 🚨 核心決策 V2：零誤差企業級數值架構

在 iSunFA 面向上市 (IPO-Ready) 與全面支援 Web3 跨國企業財報的發展路線下，**任何將 `BigInt` 強制轉型為 JavaScript 原生 `Number` 的行為，皆被視為「核彈級地雷 (Anti-Pattern)」，嚴格禁止！**

雖然原生 `Number` 的安全上限達 9 千兆，足以應付台積電的法幣營收，但只要牽涉到加密貨幣 (如 Wei, 18 位小數點) 或是跨國匯率的連乘運算，尾數的無聲溢位會直接摧毀審計軌跡 (Audit Trail)，導致四大會計師 (Big 4) 退件。

為此，iSunFA 確立了以下「四層式企業級高精度架構」作為唯一開發標準：

### 1. 資料庫層：全面解除封印 (PostgreSQL + Prisma)
*   **財務金額 (Fiat & Crypto)**：所有 `amount` 欄位（如 `VoucherLine.amount`, `Order.amount`）強制使用 `BigInt` (64-bit)，上限高達 922 億億。這徹底淘汰了以往因 32-bit `Int` (21 億上限) 所造成的「傳票分片 (Sharding)」荒謬實作，實現發票與系統傳票的 1:1 絕對對應。
*   **ESG 碳排數據 (Emissions)**：任何包含小數的排放量與排放係數（如 `esgAmount`, `factor`），維持使用 `Prisma.Decimal` 以避免二進制浮點數誤差。

### 2. 報表核心引擎層 (The Brain: `src/lib/report/*`)
*   **拒絕過度使用 Decimal**：我們保留了舊版架構中「不濫用 Prisma.Decimal 於全域」的效能優勢。
*   **採用原生 BigInt 運算**：在 Node.js 中，`BigInt` 是原生基本型別 (Primitive Type)，不是物件。在伺服器端報表加總時，使用 `100n + 200n` 的速度極快，記憶體 GC 開銷極小，且保證絕對的 0 誤差。

### 3. API 傳輸與序列化防線 (Global Serialization Shield)
為了解決原生 `JSON.stringify` 遇到 `BigInt` 會崩潰的問題，**嚴禁在 DTO/Repository 層手動加上 `Number(amount)`**！
*   **唯一合法做法**：我們在 Next.js 的全域入口實作了 `BigInt` 序列化的攔截機制 (Monkey Patching)：
    ```typescript
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
    ```
*   這確保了資料庫撈出的 `BigInt` 會以**字串**的形式（例如 `"9007199254740999"`）透過 API 傳送給前端，實現 0 資料流失。

### 4. 前端計算的防腐層 (Anti-Corruption Layer)
前端收到的 API Payload 中，所有極端數值皆為字串。前端元件**絕對不可**直接使用 `+`、`-` 或 `Math.abs()` 對這些字串進行原生運算。
*   **防腐層封裝**：必須全面引入 `bignumber.js` 或 `decimal.js`。所有牽涉畫面的渲染、千分位格式化、比率運算，皆需透過統一的 Utility 函式（如 `formatMoney` 或 `useMoney` Hook）進行封裝與處理，將 `decimal.js` 的依賴鎖在防腐層內。

---

## 💣 歷史地雷與反模式警告 (Anti-Patterns)

如果您在程式碼中看到以下寫法，請立即重構並刪除：

*   ❌ **前端直接運算字串/數字**：`const total = acc + item.amount;`
*   ❌ **後端手動降級精度**：`return { amount: Number(voucher.amount) };`
*   ❌ **使用 JS Number 進行法幣小數運算**：`0.1 + 0.2 === 0.3` (在 JS 中為 false，會產生 `.00000000000000004` 的幽靈尾數)

---

## 📌 文件維護指南 (When to Update)

本 ADR 記錄了系統面向上市 (IPO) 與 Web3 合規的最終決策。除非 JavaScript 官方推出原生無損的 JSON BigInt 序列化標準，或是全系統轉向 GraphQL/gRPC 且原生支援 64-bit 數值傳輸，否則本架構不可隨意推翻。
