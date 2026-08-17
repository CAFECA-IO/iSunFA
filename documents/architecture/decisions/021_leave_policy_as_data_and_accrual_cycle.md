# 架構決策紀錄 (ADR) 021: Leave Types as Configurable Data, Not an Enum (假別規則資料化與給假週期制度)

> **Date**: 2026-08-17
> **Author**: Julian
> **Status**: 📝 Proposed
> **核心目標**: 讓租戶自訂假別與給假規則不必改程式碼，同時不讓規則引擎退化成比對租戶自訂字串的魔法字串地獄。
> **關聯**: [假勤模組開發計畫書 §4 D1、D4、D5](../leave_and_overtime_module_plan.md)、[ADR 019](019_hr_process_task_split.md)、[出勤模組 §D1](../time_attendance_module_plan.md)

---

## 🛑 1. 當前架構挑戰 (Context)

Demo 期間的假別是一個寫死的 Prisma enum：

```prisma
enum LeaveType {
  ANNUAL PERSONAL SICK OFFICIAL MARRIAGE BEREAVEMENT OTHER
}
```

`prisma/schema.prisma` 中該 enum 上方的註解已經自我否定了這個設計：

> ToDo: (20260813 - Julian) 正式版需要一張假別設定表（是否給薪、年度額度、可否銷假、需否附證明），而不是寫死的 enum。Demo 階段用 enum 是因為一張只有七列且不會被編輯的表，比 enum 貴而不多任何一分保證。

那個判斷在 Demo 的前提下是對的 —— 七列、不會被編輯。正式版的前提相反：需求明文要求「可自訂給假規則」。而在 enum 的世界裡，一個租戶要新增「志工假」或把特休改成曆年制，路徑是**改 schema、跑 migration、發一版**。那不是設定，那是發版。

### 1.1 但「整個變成資料表」會撞上另一條鐵律

CLAUDE.md §3 第 4 條：

> 對於任何需要「條件判斷 (if/switch)」或「狀態比對」的字串，**絕對禁止直接 Hardcode 在程式碼中進行比對**。必須統一抽離至 `src/constants/` 定義成 `enum` 或唯讀 `const`。

若假別全部變成資料表的一列，規則引擎就必須寫出

```typescript
// Info: (20260817 - Julian) 反面教材：這正是本 ADR 要避免的東西，不得出現在程式碼中
if (policy.code === "ANNUAL") { /* 走年資級距 */ }
else if (policy.code === "SICK") { /* 走半薪 */ }
```

而 `policy.code` 是**租戶可以自己填的字串**。租戶新增一個 code 為 `ANNUAL_2` 的假別，它會靜默地掉進最後一個 else，走進一段從來沒有為它寫過的邏輯。這比 enum 更糟：enum 至少讓編譯器知道有幾種可能。

---

## 🎯 2. 決策：依「誰在改」切開，而不是二選一

判準只有一句話：**新增這個值，需不需要寫新的程式碼？**

- **需要 → enum**。它本來就必須跟著發版，做成資料表只是製造一個能讓程式走進未定義行為的入口。
- **不需要 → `LeavePolicy` 的欄位**。

| 面向 | 落點 | 理由 |
|---|---|---|
| 給假方式（年資級距／固定／逐次／不給額度） | `enum LeaveAccrualMethod` | 每個值是一段不同的計算程式 |
| 週期基準（到職日／曆年） | `enum LeaveCycleBasis` | 兩套不同的週期推算與比例算法 |
| 單位基準（固定分鐘／半個工作日／整個工作日） | `enum LeaveUnitBasis` | 見 §4，三者的換算來源不同 |
| 捨入方向 | `enum LeaveRoundingMode` | `ceil` 與 `round` 是兩段程式 |
| 年度日數、年資級距表 | 欄位 / 子表 | 純數字，修法改的是值不是邏輯 |
| 最小單位的數值 | 欄位 | 同上 |
| 給薪比例、是否需證明、證明門檻 | 欄位 | 同上 |
| 雇主有無准駁權、可否銷假 | 欄位（`Boolean`） | 布林旗標不需要分支型別 |
| 假別名稱、法源記載 | 欄位 | 展示用，從不參與判斷 |

### 2.1 `code` 存在，但禁止被判斷

`LeavePolicy.code` 保留為帳本內唯一鍵，供三件事：seed 建立內建假別、i18n key 對照、跨帳本統計比對。**它不得出現在任何 if/switch 的條件裡。**

這條規矩靠一個測試釘住，而不是靠自律：

```typescript
// Info: (20260817 - Julian) leave_policy_no_code_branching.test.ts
// Info: (20260817 - Julian) 靜態掃描 src/lib/leave_*.ts 與 src/services/leave*.ts，
// Info: (20260817 - Julian) 出現 `policy.code ===` / `policy.code !==` / `switch (policy.code)` 即失敗。
// Info: (20260817 - Julian) 這是規則引擎與設定資料之間唯一的一道牆，沒有它，D1 只是一個好意。
```

### 2.2 §38 的級距表是資料

勞基法 §38 I 的 3/7/10/14/15/+1 至 30 日進 `LeaveAccrualTier` 子表，不進程式碼。理由：**它會修法**。2016 年那次修法改的就是這張表。修法時該改的是六列資料，不是一個 switch 的六個 case。

「10 年以上每年加給 1 日，加至 30 日為止」用 `incrementDaysPerYear` 與 `maxDays` 兩個欄位表達，不需要為它列 20 列 —— 它是一條規則不是 20 個特例。

---

## 🎯 3. 決策：給假週期兩制並存，且曆年制必須通過「不低於週年制」的護欄

需求要求「到職日給假或曆年制給假」二選一。⚠️ 授權依據為勞基法施行細則 §24，**條號待核對**（見計畫書 §3.2）。

```typescript
export enum LeaveCycleBasis {
  HIRE_ANNIVERSARY = "HIRE_ANNIVERSARY", // Info: (20260817 - Julian) 週年制：週期起點為到職日
  CALENDAR_YEAR = "CALENDAR_YEAR",       // Info: (20260817 - Julian) 曆年制：週期起點為 1/1，首年與跨級距年須比例給假
}
```

### 3.1 為什麼需要一條護欄

曆年制是**雇主為了行政方便**而選的制度 —— 全公司同一天結算，比每個人各自的到職日好管。但這個方便不能由勞工買單：換算後的累計給假日數若低於週年制同期應有，就是一次不利益變更。

實務上這件事很容易發生：曆年制的首年按比例給假，而比例的分母、起算點、捨入方向各家算法不同，隨手一個「不足一日者捨去」就會少給。

因此 `compareCycleBasisEntitlement()`（純函數）**在授予當下同時試算兩制**，service 端的 `assertCycleNotDisadvantageous` 依其結果 `throw`。

**比較的方式不是「累計總數相比」。** 第一版是那樣寫的，實作後發現定義不成立：週年制在週年日一次給整年份、曆年制在 1/1 一次給整年份，任意時點總有一方領先 —— 同一份設定在 2/28 判違法、3/1 判合法。改以**每一個完整年資年度為窗**，兩制的每一筆授予都按「該筆週期與本窗的重疊天數 ÷ 該筆週期總天數」歸屬進來，兩邊用同一把尺，時點差異被消掉。

**這條護欄一寫出來就擋下了 §3.2 那條比例公式** —— 一個 3/1 到職的人，週年制在 9/1 拿到法定的 3 日，曆年制按剩餘天數占比只給 1.1 日。它擋下的不是一組壞資料，是一條寫錯的規則（計畫書 §17 缺口 9）。曆年制的實務作法是「把未來的年資額度**提前**給」，不是「把當期的法定額度按比例砍掉」，公式須改為下界形式。⚠️ 待法務確認函釋依據。

```typescript
// Info: (20260817 - Julian) 這條護欄的性質與財務的 A = L + E、ESG 的質量守恆相同：
// Info: (20260817 - Julian) 它是一條不可違反的下界，違反代表設定或輸入有錯，
// Info: (20260817 - Julian) 不是一個需要人工判斷的警示。依 CLAUDE.md §6 在 Service 開頭凍結。
```

### 3.2 捨入方向不開放設定

比例計算必然產生無限小數（`7 × 214/365`）。捨入**固定為無條件進位**，`LeavePolicy` 只開放 `proratedRoundingScale`（小數位數，預設 1）。

不開放往下捨的理由不是價值判斷，是邏輯：往下捨的每一個結果都會被 §3.1 的護欄擋掉並 `throw`。提供一個必然觸發例外的設定值，只會讓租戶以為那是一個可用的選項。

---

## 🎯 4. 決策：`LeaveUnitBasis` 三個值，因為「半天」不是一個分鐘數

需求寫「最小請假單位（半小時或半天）」。直覺的模型是一個欄位：

```typescript
// Info: (20260817 - Julian) 反面教材：這個模型是錯的，理由見下一段
minimumUnitMinutes: 30 | 240
```

**半天不是 240 分鐘。** 它是「該日應工作分鐘的一半」，而 `ShiftPattern.requiredWorkMinutes` 因班別而異 —— 出勤模組的 Demo 資料裡，工地日班與本部行政班的應工作分鐘就不同。把半天寫成 240，等於宣稱所有人的一天都是 8 小時，而那正是出勤模組 §D1 花了整節去反對的那種「存一個會說謊的欄位」。

```typescript
export enum LeaveUnitBasis {
  FIXED_MINUTES = "FIXED_MINUTES", // Info: (20260817 - Julian) 以 minimumUnitMinutes 為準（半小時 = 30）
  HALF_WORKDAY = "HALF_WORKDAY",   // Info: (20260817 - Julian) floor(該日班別 requiredWorkMinutes / 2)
  FULL_WORKDAY = "FULL_WORKDAY",   // Info: (20260817 - Julian) 該日班別 requiredWorkMinutes
}
```

### 4.1 `minimumUnitMinutes` 是一個「只對某一種值有意義」的欄位 —— 為什麼這次可以

出勤模組 §D1 拒絕 `shiftType`、ADR 019 拆分 `ProcessTask`，兩者的判準都是 **ADR 019 §1 那張表：拆完之後非法狀態的總量有沒有變少。**

`shiftType` 之所以必須死，是因為它**可以與其他六個欄位互相矛盾** —— 宣稱固定班卻設了不同的窗與核心，兩個都合法但互斥的事實同時存在，系統沒有依據判斷該信哪一個（ADR 019 §1 表格的第 3 種，評為「最惡劣」）。

`minimumUnitMinutes` 沒有這個結構。在 `HALF_WORKDAY` 之下它不是「另一個說法」，它只是**沒有被讀**。它無法與 `unitBasis` 矛盾，因為它不宣稱任何與 `unitBasis` 同類的事實。拆成 `FixedUnitPolicy` / `WorkdayUnitPolicy` 兩張表不會消除任何非法狀態，只會讓假別清單要查兩張表再合併 —— 那正是 ADR 019 自己列出的代價，且這裡換不到任何保證。

**維持單表**，由 `assertLeavePolicyUnit` 擋在 repository（唯一 DB 閘口，理由同 `hr_pii_invariant.ts` 與 `assertSchedulableDay`）：

- `unitBasis === FIXED_MINUTES` → `minimumUnitMinutes` 必須為正整數且能整除 60；
- 其餘 → `minimumUnitMinutes` 必須為 null（不是「忽略」，是**必須為 null**，否則它仍然是一個看起來像設定的謊）。

### 4.2 奇數分鐘的班別

`HALF_WORKDAY` 遇上 `requiredWorkMinutes = 465` 會得到 232.5。取 `floor` 為 232，並讓**下半天吸收餘數**（233）。

理由：上午段的邊界由 `coreStartMinute` 決定，是一個確定的時刻；把餘數放在確定的一端，會讓「上午」的定義隨班別浮動。以 `leave_unit_boundary.test.ts` 釘住這個不對稱，讓它是一個決定而不是一個 bug。

---

## ⚖️ 5. 取捨與代價

| 代價 | 說明 | 為何接受 |
|---|---|---|
| seed 成為正確性的一部分 | 內建假別不再由編譯器保證存在，而是由 seed 保證 | 以 `isSystemDefined` 標記 + 禁止刪除 + `leave_seed_integrity.test.ts` 驗證每個帳本都有完整的內建假別 |
| 多一次 join | 假單查詢要 join `LeavePolicy` | 與 `LeaveDay` 不另存 `employeeId` 的取捨同型：在這個資料量下，不值得為省一次 join 換一個新的矛盾來源 |
| i18n 回退 | 自訂假別沒有 i18n key | `LEAVE_TYPE_I18N_KEY` 改為 `code → key` 的對照，查無則顯示 `LeavePolicy.name`（租戶自己填的，本來就是他要的語言） |
| 兩制試算的成本 | 每次授予都算兩遍 | 授予是每人每年數次的低頻操作，且 `deriveGrantSchedule` 是純函數 |

---

## 🚧 6. 後果與待辦

1. **`enum LeaveType` 降為 seed 資料**（✅ 2026-08-17 完成）：Prisma enum 與 `src/constants/leave.ts` 的 `LeaveType` 已移除；7 個值擴充為 `LEAVE_POLICY_CODE` 的 13 個初始列。
   **沒有相容期** —— 原訂的計畫書 §14.3 分階段處置未採用：enum 一從 schema 移除，所有引用點就同時編譯失敗，留著它等於同時存在兩套假別來源。實際引用點只有 8 處，清單與連帶決定見計畫書 §19.5。
2. **`EMPLOYEE_SCHEDULED_LEAVE_TYPES` 刪除**（✅ 2026-08-17 完成）：改讀 `LeavePolicy.recallable`。該常數自己的 ToDo 已預告此事。
3. **⚠️ 待法務複核**（計畫書 §3.2）：施行細則 §24 的條號、特休比例給假「不得低於週年制」的函釋字號、§38 I ⑥「每一年加給一日」自滿 10 年當年或次年起算（差一日）。
4. **`leave_policy_no_code_branching.test.ts` 必須在里程碑 1 就存在**，不能等到有人違反。牆要在人進來之前蓋好。
