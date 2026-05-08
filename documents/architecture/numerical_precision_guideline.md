# 架構權衡與數值精度指南 (Architectural Trade-off & Numerical Precision)

> **Date**: May 2026
> **Scope**: `src/lib/report/*`, `Prisma Schema`, API Serialization
> **Info**: (20260505 - Tzuhan)

本指南記錄了 iSunFA 在處理龐大企業財務與 ESG 數據時，針對數值精度、資料庫型別與效能所做的核心架構決策 (Architecture Decision Record)。

## ⚠️ 核心決策：拒絕全域 `Prisma.Decimal` 的過度工程

我們**「不應該」**把 `src/lib/report/*` 的財務運算或整個專案都換成 `Prisma.Decimal`。

把所有東西都換成 `Prisma.Decimal` 看似「極度安全」，但其實是架構設計上的過度工程 (Over-engineering)。我們從底層原理、效能、以及資料庫設計三個維度來拆解：

### 1. 精度陷阱的本質：整數 vs. 小數

- **財務數據 (Financials)：** 在台灣會計實務上，帳務傳票的金額通常都是**整數**（最小單位為 1 元 NTD）。JavaScript 原生的 `number` 底層是 IEEE 754 雙精度浮點數，它的「安全整數 (Safe Integer)」上限高達 **9 千兆 (`9,007,199,254,740,991`)**。
  以台積電為例，其一年營收約 2.89 兆，距離 9 千兆的極限還差了 3000 倍！**只要不牽涉小數點，JS 原生 `number` 的加減法是 100% 絕對精準的**，不會有任何誤差。用原生 `number` 去算資產負債表，絕對能一毛不差地配平。
- **ESG 碳排數據 (Emissions)：** 碳排量通常帶有小數（例如 `90969.8147` 噸）。這時候如果用原生 `number` 去加總，就會踩到經典的 `0.1 + 0.2 = 0.30000000000000004` 浮點數失真陷阱。所以在 `esg_report_generator.ts` 或是 cross validation 中，使用 `Prisma.Decimal` 是**完全正確且必要**的！

### 2. 效能與開發人體工學 (Ergonomics) 的巨大代價

引入 `Prisma.Decimal` 是一把沉重的牛刀：

- **運算成本：** 財務報表生成時需要跑大量的 `reduce` 迴圈。如果用 `Decimal`，每一次 `acc.add(curr)` 都會在記憶體裡 new 出一個新的物件，這會對 Node.js 帶來極大的垃圾回收 (Garbage Collection) 壓力。原生 `number` 則只是暫存器裡的極速運算。
- **序列化災難：** `Prisma.Decimal` 是一個物件。當你把算好的財報回傳給 Next.js 前端 (JSON) 時，它無法被原生完美序列化，前端收到的會是一堆字串或奇怪的物件結構，迫使你還要寫一層 Adapter 去轉型。

### 3. 真正該擔心的資料庫隱患：`Int` vs `BigInt`

在 `schema.prisma` 中，目前將 `VoucherLine.amount` 定義為 `Int` (PostgreSQL 的 32-bit 整數)。
這其實是最大的硬傷！32-bit 整數的上限是 **21.4 億**。這就是為什麼我們在寫 Seeder 處理台積電資料時，必須採用**「應用層傳票分片 (Application-level Sharding)」**，將 2.89 兆的營收切成 50 張傳票才能塞進去，因為單筆超過 21 億 DB 就會直接拋出 Integer Overflow 錯誤。

---

## 🧑⚖️ 架構師的最終 Guideline

1. **純財務三表引擎 (`src/lib/report/*`)**：**維持原生 `number`**。只要確保寫入的傳票金額都是整數，JS 的大整數運算不僅最快、最順手，而且 100% 精準。至於比率 (Ratios) 算出來的小數只是供前端呈現，不參與二次加總，原生浮點數綽綽有餘。
2. **ESG 碳排引擎**：**嚴格維持 `Prisma.Decimal`**。任何帶有小數點的科學計量，絕對不能相信原生 `number`。
3. **Schema 升級建議 (未來展望)**：未來如果系統真的要接 Tier-1 跨國企業，需要把資料庫裡的 `amount Int` 改成 `amount BigInt` (64-bit)。並在 Prisma 撈出來時安全轉回 JS `number`（前提是確定沒超過 9 千兆），而不是在 JS 層面全面換上笨重的 `Decimal`。

> **總結：把昂貴的工具用在刀口上（ESG 的小數精度），讓高效輕量的原生型別處理整數（財務加總），這才是 Enterprise 級別的高效能架構！**

---

## 💣 防雷警告：Prisma 的 `BigInt` 序列化災難

如果未來我們升級到 `BigInt`，必須特別注意 Prisma 與 Next.js 之間非常惡名昭彰的痛點：
當 Prisma 從資料庫撈出 `BigInt` 型別時，它會對應到 JavaScript 原生的 `BigInt` (例如 `1000n`)。

**致命陷阱：JavaScript 的原生 `JSON.stringify()` 預設不支援 `BigInt`！**
如果直接把帶有 `BigInt` 的財報物件透過 API 回傳給前端，Node.js 會直接拋出錯誤：`TypeError: Do not know how to serialize a BigInt`。

**解決方案 (針對純財務引擎)：**
既然我們已經確認財務加總不會超過 9 千兆（JS 安全整數上限），我們可以在 Prisma 撈出資料時，直接在 DTO / Mapper 層安全地把它轉回 `Number`：

```typescript
// 將 Prisma 回傳的 BigInt 安全降級為 JS Number
const amount = Number(line.amount);
```

這樣就可以無縫接軌現在寫好的 `src/lib/report/*` 報表引擎，前端也能順利收到標準的 JSON 數字！

### 最終結案 (Final Verdict)

我們採用**三階段企業級架構方針**：

1. **財報引擎 (Financials)**：維持輕量極速的原生 `Number`，並依靠「全整數運算」保證絕對精度。
2. **ESG 引擎 (Emissions)**：將昂貴且精密的 `Prisma.Decimal` 用在刀口上，專職處理帶有複雜小數的碳排係數與活動數據。
3. **資料庫層 (DB Schema)**：盡速將財務金額欄位升級為 `BigInt`，解鎖百億、千億級別的企業傳票上限，並在 API 邊界處理好 `BigInt` 轉 `Number` 的序列化問題。

---

## 📌 文件維護指南 (When to Update)

此 ADR 記錄了當前系統在數值精度與效能間的權衡，當發生以下架構變更時必須更新：

- **Schema 正式升級 `BigInt`**：當團隊決定全面升級資料庫至 `BigInt` 以對接 Tier-1 跨國企業時，必須在此文件中明確寫下解決 JSON 序列化挑戰的具體作法（例如：引入 `superjson` 或是全域的 JSON replacer）。
- **精度需求擴張**：若未來財務三表也需要計算具有複雜小數點的「加密貨幣微小單位」，必須重新評估並修改「純財務維持原生 Number」的架構決策。
