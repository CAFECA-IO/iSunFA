# 架構權衡與數值精度指南 (Architectural Trade-off & Numerical Precision)

> **Date**: May 2026
> **Scope**: `src/lib/report/*`, `Prisma Schema`, API Serialization, Frontend Utilities,
> `src/lib/leave_entitlement_rules.ts`（時間量與法定面額的有理數核心，見 §5）
> **Info**: (20260512 - Tzuhan) [UPDATED - V2 Enterprise IPO-Grade]

本指南記錄了 iSunFA 在處理龐大企業財務、Web3 加密貨幣與 ESG 數據時，針對數值精度、資料庫型別與效能所做的核心架構決策 (Architecture Decision Record)。

## 🚨 核心決策 V2：零誤差企業級數值架構

在 iSunFA 面向上市 (IPO-Ready) 與全面支援 Web3 跨國企業財報的發展路線下，**任何將 `BigInt` 強制轉型為 JavaScript 原生 `Number` 的行為，皆被視為「核彈級地雷 (Anti-Pattern)」，嚴格禁止！**

雖然原生 `Number` 的安全上限達 9 千兆，足以應付台積電的法幣營收，但只要牽涉到加密貨幣 (如 Wei, 18 位小數點) 或是跨國匯率的連乘運算，尾數的無聲溢位會直接摧毀審計軌跡 (Audit Trail)，導致四大會計師 (Big 4) 退件。

為此，iSunFA 確立了以下「四層式企業級高精度架構」作為唯一開發標準：

### 1. 資料庫層：全面解除封印 (PostgreSQL + Prisma)
*   **財務金額 (Fiat & Crypto)**：所有 `amount` 欄位（如 `VoucherLine.amount`, `Order.amount`）強制使用 `BigInt` (64-bit)，上限高達 922 億億。這徹底淘汰了以往因 32-bit `Int` (21 億上限) 所造成的「傳票分片 (Sharding)」荒謬實作，實現發票與系統傳票的 1:1 絕對對應。
*   **ESG 碳排數據 (Emissions)**：任何包含小數的排放量與排放係數（如 `esgAmount`, `factor`），維持使用 `Prisma.Decimal` 以避免二進制浮點數誤差。

### 2. 領域驅動的雙軌防護標準 (DDD Precision Boundaries)
為了在「CPA 審計合規」與「Web3 基礎設施」間取得完美平衡，系統實作了嚴格的雙軌邊界：

*   **【報表與財會領域】確立 `MoneyUtil` (Decimal.js) 為防腐標準**：
    無論是前端 UI 渲染、還是後端 `src/lib/report/*` 的財報加總與比率計算（如 `safeRatio`），**全面統一使用 `MoneyUtil` 進行運算**。在企業級 SaaS 中，產生單一財報時 `Decimal.js` 的記憶體開銷微乎其微。為了防護開發者不小心發生型別轉換錯誤或浮點數（稅率、匯率）截斷溢位，捨棄純粹的 BigInt 狂熱，統一透過 `MoneyUtil.add()` 處理是最高明、最保險的「防腐層防線」。
*   **【Web3 區塊鏈領域】強制保留原生 `BigInt` 運算**：
    在 Service 層（如 `issue.service.ts`, `token.service.ts`）處理鏈上代幣餘額、ERC-4337 手續費或打包 UserOp 時，**嚴禁套用 `MoneyUtil`**。因為 EVM 智能合約與 `viem` 套件底層強制要求原生 JavaScript `BigInt` (uint256)。在這道邊界內，維持 `(amount * rate) / 10n**18n` 的原生大整數運算是唯一合法且安全的標準。

### 3. API 傳輸與序列化防線 (Global Serialization Shield)
為了解決原生 `JSON.stringify` 遇到 `BigInt` 會崩潰的問題，**嚴禁在 DTO/Repository 層手動加上 `Number(amount)`**！
*   **唯一合法做法**：我們在 Next.js 的全域入口實作了 `BigInt` 序列化的攔截機制 (Monkey Patching)：
    ```typescript
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
    ```
*   這確保了資料庫撈出的 `BigInt` 會以**字串**的形式（例如 `"9007199254740999"`）透過 API 傳送給前端，實現 0 資料流失。

### 4. 企業級資料庫邊界防護 (Enterprise Database Boundary Guard)
前端收到的 API Payload 中，所有極端數值皆為字串。當資料流回後端準備寫入資料庫時，我們在 Prisma 層實作了嚴格的防禦機制：
*   **動態 DMMF 攔截器**：系統啟動時會動態解析 Prisma Schema，將所有定義為 `BigInt` 或 `Decimal` 的欄位（如 `amount`, `emissions`）加入防護名單。任何寫入行為只要被偵測到傳入了原生的 JavaScript `number`，將會直接拋出 `[Database Boundary Guard]` 錯誤，徹底阻絕無聲的精度遺失災難。

### 5. 時間量與法定面額：精確有理數核心 (Exact Rational Core)

> **Info**: (20260820 - Julian) 本節補的是一份**缺了的記載**。假勤模組
> （`src/lib/leave_entitlement_rules.ts`）自 2026-08-19 起使用第五種數值型別，
> 被引擎、Repository 不變式、Service 與 Seed 四層跨用，而
> `grep -rn "IExactDays\|totalDaysOf\|grantedMinutesOf" documents/` **零命中**。
> 一份自稱「唯一開發標準」的指南對它一字未提，讀的人會以為那是有人偷跑。

#### 適用域：**只有時間量與法定面額，且只在「比較」與「換算」上**

| 用途 | 型別 |
|---|---|
| 「這張假單總共幾日」與簽核門檻的比較 | `IExactDays`（`{ numerator: bigint; denominator: bigint }`） |
| 「N 日 × 每日 M 分鐘 = 幾分鐘」 | `grantedMinutesOf()`，全程 `bigint` |
| 落地到 `Decimal` 欄位 | `exactDaysToDecimalString()` → **字串** |
| 畫面顯示 | `exactDaysToNumber()` → `number`，**不可拿去比對規則** |

> 最後一條**由型別系統擋著**，不是靠自律：唯一的比較入口
> `compareDaysTo(days: IExactDays, threshold: number)` 收的是 `IExactDays`，
> 把 `exactDaysToNumber()` 的結果傳進去在 `tsc` 就會紅。
> 這件事寫出來，是為了讓讀到這裡的人不必去找一支不存在的測試。

#### 為什麼不是 `MoneyUtil` / `Decimal`

不是「Decimal 不夠準」，而是**它的準確與否取決於一個沒有人會回頭看的設定**。

`MoneyUtil` 從未呼叫 `Decimal.set()`，因此 decimal.js 跑的是預設值
（precision 20、`ROUND_HALF_UP`）。以那個設定實測 ADR 022 §3.1 的四組反例
（數學上都恰好是 3 日，掉到 3 以下就少簽一關）：

| 班別 × 天數 × 每日分鐘 | `Decimal`（precision 20） | `< 3` ? | 原生 `double` | `< 3` ? |
|---|---|---|---|---|
| 420 × 7 × 180 | `2.9999999999999999999` | ✅ 是 | `2.9999999999999996` | ✅ 是 |
| 420 × 21 × 60 | `2.9999999999999999994` | ✅ 是 | `2.999999999999999` | ✅ 是 |
| 450 × 10 × 135 | `3` | ❌ 否 | `2.9999999999999996` | ✅ 是 |
| 480 × 10 × 144 | `3` | ❌ 否 | `2.9999999999999996` | ✅ 是 |

**四組裡有兩組，`Decimal` 與 `double` 錯得一模一樣。** 差別在分母：
`135/450` 與 `144/480` 都是 `0.3`，十進位表示得完；`180/420` 是 `3/7`，
十進位表示不完 —— 而 `Decimal` 是十進位，遇到 7 分之一同樣要捨入。

把 precision 調到 40 這四組會過。但那正是不用它的理由：
**簽核關卡的正確性會變成 `src/lib/utils/money.ts` 裡一個全域設定的函數**，
而改那個設定的人不會知道自己動到了假單要簽幾關。
有理數核心沒有那個旋鈕 —— 分數不捨入，`compareDaysTo` 交叉相乘後比的是整數。

> 反過來也要說清楚，否則這段會變成一句過度推銷：
> **B6（`Math.ceil(1.1 × 420)` 多給一分鐘）用 `Decimal` 是修得掉的**
> —— `1.1` 在十進位是有限小數，`new Decimal("1.1").times(420)` 得到整整 462。
> 有理數核心在 B6 上的價值是「與 B5 用同一套算術」，不是「Decimal 做不到」。

#### 與 `Decimal` 的邊界：**落地一律轉字串**

`LeaveRequest.totalDays`、`LeaveGrant.grantedDays` 仍然是 `Prisma.Decimal` 欄位
（它們會乘上工資變成錢，適用 §2 的雙軌標準）。有理數核心**不取代**它們，
只負責「算到落地之前」那一段：

```ts
// ✅ 唯一合法的落地方式
totalDays: exactDaysToDecimalString(totalDays)   // "3" / "3.2857142857"

// ❌ 這一行是 review B5 的成因：它把一個已經算壞的 double 洗成字串
totalDays: String(exactDaysToNumber(totalDays))
```

原生 `number` 寫進 `Decimal` 欄位會被 §4 的 Database Boundary Guard 擋下，
**但 `String(number)` 不會** —— 防護擋的是型別，而那個字串的內容早就錯了。
這是 §4 那道閘唯一擋不住的形狀，寫在這裡讓下一個人知道。

##### 現況：`String(number)` 在本模組還有幾處，各自靠什麼擋

誠實一點 —— 寫下一條反模式卻不說它還有活的實例，這份文件就會變成
下一個人以為已經清乾淨的東西：

| 位置 | 值從哪來 | 擋它的是什麼 |
|---|---|---|
| `leave_grant.repo.ts:144`、`overtime_request.repo.ts:346`（`grantedDays`） | 引擎推導 | ✅ 同一次寫入前的 `assertGrantSource` → `assertCeilingOfProduct`，它**拒絕指數記號**，且要求 `grantedMinutes` 由該日數重算得出 |
| `leave_approval_rule.repo.ts:136-137`（`minDays` / `maxDays`） | API payload | ✅ `assertRuleRangesDisjoint` → `assertPlainDecimalThreshold`（2026-08-20 補上，拒絕指數記號與 3 位以上小數） |
| `leave_policy.repo.ts` 的 `annualDays` / `paidRatio` / `proofThresholdDays` / 級距 `days` | API payload | ⚠️ **只有 validator**。`assertLeavePolicyUnit` 驗的是欄位組合，不是十進位形狀 —— seed 與資料遷移繞得過去 |

> ToDo: (20260820 - Julian) 最後一列補一條與 `assertPlainDecimalThreshold`
> 同型的判準到 `leave_policy_invariant.ts`。它今天不會出事，是因為那些值目前
> 都由人在畫面上填；而「目前都由人填」不是一個會一直成立的前提。

#### ⛔ 禁止用它算金額

`IExactDays` 沒有幣別、沒有小數位政策、沒有捨入方向的稽核軌跡，
而 `MoneyUtil` 三樣都有。**折現金額、工資、加班費一律走 `MoneyUtil`。**

假勤模組因此刻意停在「事件」為止：`LeaveCashOutEvent` 記分鐘、記加成級距、
記兩端的日約當分鐘，**沒有金額欄位**（ADR 022 §8.4）。金額由薪資模組以
`MoneyUtil` 算 —— 兩個核心的邊界就在那張表上。

> 完整的決策論證見 `ADR 022 §3.1`；實作與每一條判準的理由見
> `src/lib/leave_entitlement_rules.ts` 的檔頭與各函式註解。

---

## 💣 歷史地雷與反模式警告 (Anti-Patterns)

如果您在程式碼中看到以下寫法，請立即重構並刪除：

*   ❌ **前端直接運算字串/數字**：`const total = acc + item.amount;`
*   ❌ **後端手動降級精度**：`return { amount: Number(voucher.amount) };`
*   ❌ **使用 JS Number 進行法幣小數運算**：`0.1 + 0.2 === 0.3` (在 JS 中為 false，會產生 `.00000000000000004` 的幽靈尾數)
*   ❌ **用 `String(number)` 把算壞的值洗進 `Decimal` 欄位**：`totalDays: String(2.9999999999999996)`。
    §4 的 Boundary Guard 擋的是**型別**（原生 `number`），字串一律放行 ——
    而那個字串的內容早就錯了。時間量請走 §5 的 `exactDaysToDecimalString()`。
*   ❌ **拿顯示用的近似值去比對規則**：`exactDaysToNumber()` 回的是 `double`，
    它存在的唯一理由是印在畫面上。拿它去比簽核門檻，就是 review B5 那個缺陷本身。

---

## 📌 文件維護指南 (When to Update)

本 ADR 記錄了系統面向上市 (IPO) 與 Web3 合規的最終決策。除非 JavaScript 官方推出原生無損的 JSON BigInt 序列化標準，或是全系統轉向 GraphQL/gRPC 且原生支援 64-bit 數值傳輸，否則本架構不可隨意推翻。
