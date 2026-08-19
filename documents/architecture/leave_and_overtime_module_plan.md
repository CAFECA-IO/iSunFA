# 🗓️ 假勤模組開發計畫書 (Leave & Overtime Module Plan)

> **Date**: 2026-08-17
> **Author**: Julian
> **Version**: 1.0
> **Status**: Draft
> **前置文件**: [出勤模組開發計畫書](time_attendance_module_plan.md)、[ADR 018 HR PII 資料分級](decisions/018_hr_pii_data_classification.md)、[ADR 019 拆分 ProcessTask](decisions/019_hr_process_task_split.md)、[ADR 020 資遣費試算](decisions/020_severance_pay_estimation.md)、[ADR 015 離鏈團隊錢包帳本](decisions/015_offchain_team_wallet_ledger.md)

---

## 0. 本文件的主張

人事模組第三期。承接出勤模組留下的三個接點：`WorkDayType.LEAVE`（排班日的性質已預留請假）、`LeaveRequest / LeaveDay / LeaveRecall`（Demo 期間為了演示銷假徵詢而先做的三張表）、以及 `Employee.managerId`（既有註解已寫明「假勤流程直屬主管簽核的核心」）。

本模組主張五件事，其餘決策都是從這五件事推出來的：

1. **假別是規則，不是列舉。** 一個租戶要「自訂給假規則」，如果那意味著改 `enum LeaveType` 再發一版，那就不是設定，是發版。
2. **額度是異動的結果，不是一個數字。** 「他還剩幾天特休」永遠可以由授予與扣減重算出來；存一個可以與異動記錄矛盾的餘額欄位，它唯一能做的事就是說謊 —— 判準同 ADR 015 對團隊錢包的處置。
3. **簽核路徑必須在送出當下固化。** 組織會異動。若核准時才查「你的主管是誰」，一次調動就改寫了所有歷史單據的簽核路徑，而那正是勞動檢查要看的東西。
4. **加班的價值有兩種面額，而匯率是法定的。** 加班費按 §24 分段加成，補休按 §32-1 以 1:1 時數換算 —— 兩者不是同一個數字的兩種顯示方式。補休屆期未休要「依當日工資計算標準發給」，所以每一批補休都必須記得自己來自哪一個加成級距，否則折現時算不出來。
5. **系統只算它真的知道的部分。** 本模組輸出分鐘數與法定加成級距，**不算金額**。基準時薪與加班費金額屬薪資模組，理由同 ADR 020 §2 與出勤模組 §5.3。

---

## 1. 範圍與非範圍

### 1.1 範圍

| 需求 | 落點 |
|---|---|
| 假別規則設定（內建勞基法假別、自訂給假規則、最小請假單位） | §4 D1–D5、§5、§6 |
| 線上請假與簽核（餘額查詢、多級簽核） | §4 D6–D8、§7 |
| 加班管理（事前／事後申請、加班費或補休二選一） | §4 D9–D13、§8 |
| 假勤行事曆（部門排休視覺化、併休上限） | §4 D14、§9 |

### 1.2 非範圍（明確劃出去，避免邊界漂移）

- **金額計算**：加班費、特休未休折算工資、病假半薪。本模組產生「待折現事件」，金額由薪資模組計算（D13）。
- **出勤事實的判定**：遲到、早退、曠職仍由 `evaluateAttendanceDay` 負責。本模組只透過投影 `EmployeeShiftDay.dayType` 影響它，不反向讀取。
- **育嬰留職停薪、留職停薪期間的勞健保處理**：屬人事異動與投保管理，非「假勤額度」。本模組僅預留 `LeavePolicy.suspendsEmployment` 旗標以免日後改表。
- **職業災害的認定**：公傷病假的「治療休養期間」由職災認定決定，本模組只記載，不判定。

---

## 2. 與既有模組的關係

```
                    ┌──────────────────────────┐
   本模組  ───投影──▶│  EmployeeShiftDay        │──▶ evaluateAttendanceDay（純函數）
   (假單核准/銷假)    │  dayType = LEAVE / WORK  │      出勤模組，不知道假單存在
                    └──────────────────────────┘
                                 ▲
                                 │ 讀（唯讀）
                    ┌────────────┴─────────────┐
   本模組  ◀──讀───│  AttendancePunch          │  加班的「事實」來源
   (加班時數認列)    │  ShiftPattern             │  日約當分鐘的來源
                    └───────────────────────────┘

   本模組 ──產生──▶  LeaveCashOutEvent  ──▶ 薪資模組（尚未實作）
                     加班費 / 特休未休 / 補休屆期
```

**單向依賴鐵律**：假勤寫排班 → 排班餵判定。判定引擎**不得** import 假勤的任何型別。既有 `src/constants/leave.ts` 開頭的註解已經立下這條規矩，本模組沿用。

---

## 3. 法源與查證狀態

CLAUDE.md 的「零捏造」對法規同樣適用：**沒查到出處的數字不寫進文件，更不寫進 constants。**

### 3.1 已查證（查證日期 2026-08-17）

| 項目 | 內容 | 出處 |
|---|---|---|
| 勞基法版本 | 民國 113 年 7 月 31 日修正 | 勞動部勞動法令查詢系統 |
| §38 I 特休日數 | 6 月以上未滿 1 年 **3 日**；1 年以上未滿 2 年 **7 日**；2 年以上未滿 3 年 **10 日**；3 年以上未滿 5 年 **14 日**；5 年以上未滿 10 年 **15 日**；10 年以上每年加 **1 日**，加至 **30 日**為止 | 勞動部「特別休假日數、排定原則及遞延」 |
| §38 II | 期日**由勞工排定**；雇主基於企業經營上急迫需求或勞工個人因素，得與勞工協商調整 | 同上 |
| §38 IV | 年度終結未休 → 發給工資；經勞雇雙方協商同意得**遞延一年**；次年度終結或契約終止仍未休 → 發給工資 | 同上 |
| §24 平日延長 | 前 2 小時**加給 1/3 以上**；再延長 2 小時**加給 2/3 以上**；§32 IV 天災事變情形**加倍發給** | 勞動部勞動法令查詢系統 |
| §24 休息日 | 工作 2 小時以內**另再加給 4/3 以上**；工作 2 小時後**另再加給 5/3 以上** | 同上 |
| §32 上限 | 正常工時加計延長工時**一日不得超過 12 小時**；延長工時**一個月不得超過 46 小時**，經工會或勞資會議同意得達 **54 小時**，且**每三個月不得超過 138 小時** | 同上 |
| §32-1 補休 | 依**勞工工作之時數**計算補休時數（1:1）；期限由勞雇雙方協商；期限屆滿或契約終止未補休之時數，**依延長工作時間或休息日工作當日之工資計算標準發給工資** | 同上 |
| §36 | 每 7 日應有 2 日之休息，1 日為例假、1 日為休息日 | 同上 |
| §39 | 例假、休息日、休假、特別休假，工資由雇主照給；經同意於假日工作者，工資**加倍發給** | 同上 |
| 婚假 | **8 日**，工資照給（勞工請假規則 §2） | 勞動部「勞動基準法暨性別平等工作法相關假別請假及工資權益」 |
| 喪假 | 父母等 **8 日**、祖父母等 **6 日**、曾祖父母等 **3 日**，工資照給（勞工請假規則 §3） | 同上 |
| 普通傷病假 | 未住院 **1 年內不超過 30 日**；住院 **2 年內不超過 1 年**；工資**折半發給**（勞工請假規則 §4） | 同上 |
| 公傷病假 | 治療休養期間，工資照給（勞工請假規則 §6） | 同上 |
| 事假 | **1 年內不超過 14 日**，不給工資（勞工請假規則 §7） | 同上 |
| 生理假 | 性平法 §14，**每月 1 日**，薪資減半 | 同上 |
| 產假 | **8 星期**；受僱 6 個月以上工資照給，未滿 6 個月**減半發給** | 同上 |
| 流產假 | 妊娠 3 個月以上 **4 星期**；2 個月以上未滿 3 個月 **1 星期**；未滿 2 個月 **5 日** | 同上 |
| 產檢假 | **7 日**，薪資照給（性平法 §15） | 同上 |
| 陪產檢及陪產假 | **7 日**，薪資照給；陪產應於配偶分娩當日及前後合計 **15 日**內請假 | 同上 |
| 安胎休養 | **2 年內不超過 1 年**，30 日內半薪，超過無薪 | 同上 |
| 家庭照顧假 | **7 日**，**併入事假計算**，不給薪；雇主不得視為缺勤而影響全勤獎金（性平法 §20） | 同上 |
| 育嬰留職停薪 | 最長 **2 年**；任職滿 6 個月後、子女滿 3 歲前 | 同上 |
| 哺乳時間 | 子女未滿 2 歲，每日 **60 分鐘**；延長工作達 1 小時以上另加 **30 分鐘**；**視為工作時間** | 同上 |
| **勞工請假規則修正** | **自民國 115 年 1 月 1 日施行**：① 1 年內請普通傷病假未超過 **10 日**者，雇主不得因此為不利處分 ② 勞工釋明後**舉證責任轉由雇主負擔** ③ 考核不得僅以病假日數為考量 ④ **全勤獎金應按請病假日數依比例計算**扣發 | 勞動部《勞工請假規則》部分條文修正相關問答 |

> **115-01-01（西元 2027-01-01）的修正在本模組的開發期程之內。** 第 ④ 點直接要求系統能輸出「病假日數」供薪資模組按比例扣減全勤獎金，第 ① 點要求系統能標示出「1 年內病假是否逾 10 日」。這兩件事寫進 §6.6 與 §10 的 API，不是未來工作。

### 3.2 ⚠️ 待核對（法務複核前不得寫入 constants）

| 項目 | 為何待核對 |
|---|---|
| 勞基法施行細則 §24（曆年制／週年制的授權依據） | 條號未回原文核對。D4 的整個制度選項建立在這條之上 |
| 生理假「全年未逾 3 日不併入病假計算」 | 官方彙整表只給「每月 1 日、半薪」，未載明併計規則。此規則直接決定額度引擎要不要跨假別扣減 |
| 喪假各親等完整對照 | 官方彙整表列名為「父母等 / 祖父母等 / 曾祖父母等」，親屬範圍未展開 |
| 普通傷病假未住院與住院「2 年內合計不得超過 1 年」 | 官方彙整表分列兩欄，未載明合計上限 |
| 勞工請假規則各條條號（§2 婚假、§3 喪假、§4 病假、§6 公傷病假、§7 事假、§8 公假） | 條號取自官方彙整表的標註，未逐條回原文核對 |
| 特休比例給假「不得低於週年制」的函釋字號 | D4 的雙軌護欄需要一個明確的依據，目前只有實務通說 |
| 職災勞工公傷病假與《勞工職業災害保險及保護法》的關係 | 影響 `LeavePolicy` 是否需要區分兩種公傷病假 |
| 加班費「加給」與「發給」的用語 | §24 平日用「加給 1/3」（即發給 4/3），休息日用「另再加給 4/3」（即發給 7/3）。D11 的常數以**加給倍率**為準，但需法務確認本文件的換算陳述無誤 |
| **各假別的「最小請假單位」** | §3.1 已查證的是各假別的**日數上限**（婚假 8 日、喪假 8/6/3 日、事假 14 日…），**單位完全不在其中**。而 `DEFAULT_LEAVE_POLICY_SEED` 把婚假、喪假、生理假、產檢假、陪產假、家庭照顧假設成 `HALF_WORKDAY` —— 那是一個**沒有法源、先前也沒有被登記成待核對**的假設（2026-08-18 補列）。本系統的使用者是工地人員，每個人的班別與上下班時刻都不同，「上半天」對他們不是直覺的量；請假表單因此改為一律填起訖時刻，扣減仍由 `unitBasis` 決定。若查證後確認某些假別法無最小單位限制，應改為 `FIXED_MINUTES` |
| **§32 IV 天災、事變或突發事件的延長工時與其通報義務** | 條文、通報時限、受理機關（工會／當地主管機關）、法定書表格式與必填欄位，以及「事後補給適當休息」的具體要求，**全部未回原文核對**。`isEmergency` 目前已據此放行日別限制並給予加倍級距，但系統沒有任何地方記錄那份通報 —— 見 §8.3 |

> 所有 ⚠️ 項目在程式碼中一律標 `// ToDo: (20260817 - Julian) 法源待法務複核`，並集中於 `src/constants/leave_policy.ts`，不散落。

---

## 4. 核心決策

### D1 — 假別拆成「行為分類（enum）」與「參數（資料表）」，不是二選一

**問題**：既有 `enum LeaveType` 有 7 個值，`prisma/schema.prisma` 中該 enum 上方的 ToDo 已經點名「正式版需要一張假別設定表（是否給薪、年度額度、可否銷假、需否附證明），而不是寫死的 enum」；`src/constants/leave.ts` 的 `EMPLOYEE_SCHEDULED_LEAVE_TYPES` 也留了同向的 ToDo（「假別設定表做出來後，『可否單方銷假』應改為該表的一個欄位」）。但 CLAUDE.md §3 又規定「任何用於 if/switch 判斷或狀態比對的字串必須抽成 enum」。把假別整個變成資料表，等於讓規則引擎去 `switch (policy.code)` 比對租戶自訂的字串 —— 那正是 §3 要禁止的魔法字串。

**決策**：依「這一部分是誰在改」切開。

- **程式碼要判斷的 → enum**：給假方式（年資級距／固定／逐次）、週期基準（到職日／曆年）、單位基準（固定分鐘／半個工作日／整個工作日）、捨入方向。這些的每一個值都對應一段不同的程式邏輯，新增一個值就是新增一段程式碼 —— 它本來就必須跟著發版。
- **租戶要調的 → `LeavePolicy` 資料表欄位**：年度日數、年資級距表、最小請假單位的數值、是否給薪與給薪比例、是否需附證明、超過幾日才需附證明、雇主有無准駁權、可否銷假、簽核門檻。

**判準**：問「新增這個值，需不需要寫新的程式碼？」需要 → enum；不需要 → 欄位。

**保留 `code` 欄位**：`LeavePolicy.code`（`ANNUAL` / `SICK` / …）是帳本內唯一鍵，供 seed、i18n key 與跨帳本比對用，**但嚴禁被用於 if/switch**。規則引擎只讀 `accrualMethod` 等 enum 欄位。以 lint 規則與 `leave_policy_no_code_branching.test.ts` 釘住。

### D2 — 額度採 append-only 帳本，餘額為派生快取

**決策**：`LeaveGrant`（授予批次，不可變）+ `LeaveLedgerEntry`（append-only 異動）為唯一真相；`LeaveBalance` 是派生快取，遵守出勤模組 D10 對 `AttendancePresence` 立下的**三規矩**：

1. 只在寫入異動的**同一個 `$transaction`** 內更新；
2. 可由 `rebuildLeaveBalance(employeeId, policyId)` 完整重建；
3. 每日 Worker 勾稽 `Σ(deltaMinutes) === LeaveBalance.remainingMinutes`，不符則告警並以帳本為準。

**為什麼不是只存一個餘額**：勞動檢查問的從來不是「他還剩幾天」，而是「這幾天是怎麼變成這樣的」。餘額欄位答得出第一題，答不出第二題。此外 §38 IV 的遞延與 §32-1 的補休期限，都要求知道「這一批額度是什麼時候給的、什麼時候到期」—— 那是批次的性質，不是餘額的性質。

**先例**：ADR 015 對團隊錢包的處置完全同型（`TeamWalletLedger` append-only + `balanceAfter` + 每日守恆勾稽 + `idempotencyKey @unique`）。本模組沿用同一套手法，包含 `idempotencyKey`。

### D3 — 帳本的單位是「分鐘」；「日」只出現在授予與折現兩個端點

**問題**：法規以「日」表達（特休 3 日、事假 14 日），但需求要求最小請假單位可以是**半小時**。若帳本存「日」，半小時在 6 小時班別上是 1/12 日 = 0.0833…，無限小數，加總必然漂移，守恆勾稽就不再是零誤差 —— 那條防線一旦允許誤差就形同虛設。

**決策**：

- `LeaveLedgerEntry.deltaMinutes` 為 **`Int`**（有號）。這是唯一真相，整數運算，守恆恆成立。
- **授予時**：`LeaveGrant` 同時記下 `grantedDays`（`Prisma.Decimal`，法定面額，如 `7`）與 `dayEquivalentMinutes`（授予當下的日約當分鐘，如 `480`），`deltaMinutes = grantedDays × dayEquivalentMinutes` 取整。兩個欄位都不可變，事後任何人都能驗算這 3360 分鐘是怎麼從 7 日來的。
- **請假扣減時**：逐日換算。`LeaveDay.minutes` 由該日的請假時段算出，`LeaveDay.dayEquivalentMinutes` 取自**該日排班的班別** `ShiftPattern.requiredWorkMinutes`。換算依據因此是逐日固化的，而不是一個會隨人事異動飄移的全域參數。
- **折現時**：`折現日數 = 剩餘分鐘 ÷ 折現當下的日約當分鐘`（`Prisma.Decimal`），寫入 `LeaveCashOutEvent`，交給薪資模組。

**誠實揭露**：班別變更會讓「剩餘分鐘換回日數」的結果與當初授予的日數不一致（授予時 8 小時班的 3 日 = 1440 分鐘，改到 6 小時班後 = 4 日）。這在法律上本來就是有爭議的情形。系統該做的不是假裝它不存在，而是把兩端的換算依據都記下來，讓爭議發生時有帳可查。`LeaveCashOutEvent` 因此同時帶 `grantDayEquivalentMinutes` 與 `cashOutDayEquivalentMinutes` 兩個值。

**與出勤模組的一致性**：出勤模組 §D8 決定「時刻用 `Int` 分鐘，不用 `Prisma.Decimal`，因為分鐘是整數計數不是金融量」。本模組完全相同 —— `Decimal` 只用在 `grantedDays` 與折現日數這兩個**會直接乘上工資變成錢**的量，符合 CLAUDE.md §2「高精度數值」的適用範圍。

### D4 — 給假週期：到職日制與曆年制，且曆年制必須通過「不低於週年制」的護欄

**決策**：`LeaveCycleBasis` 兩個值：

- `HIRE_ANNIVERSARY`（到職日制／週年制）：週期起點為到職日，每滿一週年換一個級距。
- `CALENDAR_YEAR`（曆年制）：週期起點為 1/1。首年與跨級距年度須按比例給假。

⚠️ 授權依據為勞基法施行細則 §24，**條號待核對**（§3.2）。

**護欄（Fail Fast）**：曆年制是雇主為了行政方便而選的制度，不得因此讓勞工拿到比週年制少的假。`assertCycleNotDisadvantageous()` 在**授予當下**同時試算兩制，若曆年制的累計授予日數低於週年制同期，即 `throw` 並拒絕授予。

這條護欄的性質與財務的 `A = L + E`、ESG 的質量守恆相同：它是一條不可違反的下界，違反就代表輸入或設定有錯，而不是一個需要人工判斷的警示。依 CLAUDE.md §6，在 Service 開頭凍結，絕不讓髒資料進 DB。

**比例給假的捨入**：比例計算會產生無限小數（例如 `7 × 214/365`）。`LeavePolicy.proratedRoundingScale`（小數位數，預設 `1`）與 `LeavePolicy.proratedRoundingMode` 決定捨入，且**捨入方向固定為對勞工有利（無條件進位）**，不開放設成截去 —— 因為往下捨的那一版永遠會被上一條護欄擋掉，開放一個必然觸發 `throw` 的設定值沒有意義。

### D5 — 最小請假單位：`LeaveUnitBasis` 三個值，因為「半天」不是一個分鐘數

**問題**：需求寫「最小請假單位（半小時或半天）」。直覺會做成 `minimumUnitMinutes: 30 | 240`。但**半天不是 240 分鐘** —— 它是「該日應工作分鐘的一半」，而 `ShiftPattern.requiredWorkMinutes` 因班別而異（工地日班與行政班不同，且 §84-1 工作者又不同）。把半天寫成 240，等於宣稱所有人的一天都是 8 小時。

**決策**：

```typescript
// Info: (20260817 - Julian) 最小請假單位的基準。「半天」是相對量不是絕對量，
// Info: (20260817 - Julian) 故不能與「三十分鐘」共用同一個分鐘數欄位。
export enum LeaveUnitBasis {
  FIXED_MINUTES = "FIXED_MINUTES",   // Info: (20260817 - Julian) 以 minimumUnitMinutes 為準（半小時 = 30、一小時 = 60）
  HALF_WORKDAY = "HALF_WORKDAY",     // Info: (20260817 - Julian) 該日班別 requiredWorkMinutes 的一半
  FULL_WORKDAY = "FULL_WORKDAY",     // Info: (20260817 - Julian) 該日班別 requiredWorkMinutes
}
```

`LeavePolicy.minimumUnitMinutes` 僅在 `FIXED_MINUTES` 時有意義。這確實是一個「只對某一種值有意義的欄位」，與出勤模組 D1 反對 `shiftType` 的立場看似衝突 —— 差別在於：`shiftType` 可以**與其他六個欄位互相矛盾**（宣稱固定班卻設了不同的窗與核心），而 `minimumUnitMinutes` 在非 `FIXED_MINUTES` 時只是被忽略，不會產生兩個互相矛盾的事實。依 ADR 019 的判準（拆完之後非法狀態的總量有沒有變少），拆表在這裡不會變少，故維持單表，由 `assertLeavePolicyUnit` 擋在 repository：`FIXED_MINUTES` 時 `minimumUnitMinutes` 必須為正且能整除 60。

**捨入**：`LeaveRoundingMode` 預設 `UP`（不足一單位以一單位計）。**這是對勞工不利的預設**，必須載明於工作規則，文件在此明白寫出而不是藏在程式碼裡。租戶可改為 `NEAREST`。

### D6 — 簽核鏈在送出當下固化成快照

**決策**：`LeaveApprovalRule`（帳本層級的規則）與 `LeaveApprovalStep`（單據上的快照）是兩張表。送出假單時，`resolveApprovalChain()` 依規則展開成一串 `LeaveApprovalStep`，把**當下**的簽核者 `employeeId`、工號、姓名、職稱一併寫入。之後主管調動、離職、部門重組，都不會改寫這張單的簽核路徑。

既有 `LeaveRequest.decidedBy` 的註解已經點名這個缺口（「正式版要留下不可變的核准者快照（姓名與工號），這裡是 demo 的取捨」）。本決策就是那個正式版。

**多級規則**：需求給的例子是「3 天內直屬主管；3 天以上簽至部門經理或 HR」。規則的條件維度為 `(policyId?, minDays, maxDays?)`，命中後展開節點序列。節點型別：

```typescript
export enum LeaveApprovalNodeKind {
  DIRECT_MANAGER = "DIRECT_MANAGER",         // Info: (20260817 - Julian) Employee.managerId
  DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER", // Info: (20260817 - Julian) Department.managerId，沿部門樹向上找第一個有主管的節點
  HR = "HR",                                 // Info: (20260817 - Julian) 具 HR 角色者，全體皆可簽（任一人簽核即通過）
  SPECIFIC_EMPLOYEE = "SPECIFIC_EMPLOYEE",   // Info: (20260817 - Julian) 指名特定員工（小型組織與代理情境）
}
```

**去重**：展開後若直屬主管恰好就是部門經理，同一個人不簽兩次 —— 展開時去除相鄰重複，並在快照上記 `mergedFromKinds`，讓「為什麼只有兩關」有據可查。

**「同一張單同時有兩個待簽節點」不可表示**：`LeaveApprovalStep.pendingKey String? @unique`，值為 `"<leaveRequestId>"`，**僅在該節點為當前待簽時填入**，其餘為 null。手法完全沿用既有 `LeaveDay.activeKey` 與 `LeaveRecall.pendingLeaveDayId` —— Postgres 的 unique index 不約束 NULL，因此已簽與未輪到的節點可以有很多筆，待簽的只能有一筆。

**職責分離（SoD）**：沿用出勤模組 D9 的三條 —— 不得自我核准（`FO_SELF_APPROVAL_FORBIDDEN`）、非鏈上節點不得代簽（`FO_NOT_AUTHORIZED_REVIEWER`）、已決之單不得再改（`VA_LEAVE_ALREADY_REVIEWED`）。**新增第四條**：`DIRECT_MANAGER` 節點解析出來的人若就是申請人本人（自己是自己的主管，資料錯誤或最高層級），該節點自動上升至部門經理，並在快照記 `escalatedReason` —— 不 `throw`，因為老闆也要能請假。

### D7 — 找不到簽核者是設定問題，不是核准

**決策**：`resolveApprovalChain()` 若展開出空鏈（例如員工沒有主管、部門沒有經理、帳本沒有 HR），**拒絕送出**並回 `CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED`（409），而不是「沒人要簽 → 自動核准」。

自動核准是最糟的失敗模式：它讓一個設定缺口靜默地變成一張生效的假單，而且事後看起來完全正常。依 CLAUDE.md §6「提早報錯」，在送出當下就凍結。

### D8 — 餘額檢查在送出與核准各做一次，且以核准當下為準

**決策**：送出時檢查餘額是為了給員工即時回饋（`VA_LEAVE_INSUFFICIENT_BALANCE`），**但不預扣**。真正的扣減發生在**最後一個簽核節點通過**的那個 `$transaction` 內，與 `EmployeeShiftDay` 的投影、`LeaveLedgerEntry` 的寫入、`LeaveBalance` 的更新同一筆交易。

**為什麼不預扣**：預扣就必須處理「駁回要退回」「撤回要退回」「簽核中主管離職卡住要退回」三條補償路徑，每一條都是一個可能漏掉的分支。不預扣則只有一條路徑會動到額度。

**代價（誠實揭露）**：兩張單同時送出、都通過送出時的餘額檢查、先後核准 → 第二張在核准時才失敗。這是可接受的：失敗發生在核准者面前而不是員工面前，而核准者本來就是要做判斷的人。核准端以帶條件的 `updateMany`（`remainingMinutes >= 扣減量`）+ `count === 0` 判輸，避免讀後寫的競態 —— 手法沿用 Demo 期間 W20 踩雷紀錄的結論。

### D9 — 加班時數是「核准」與「事實」的交集，取小者

**決策**：`OvertimeRequest` 記載的是**意圖與核准**；實際加班分鐘來自 `AttendancePunch`。認列公式：

```
認列分鐘 = min(核准分鐘, 實際停留於加班區間的打卡分鐘)
```

申請 3 小時但只待了 1 小時，認列 1 小時。待了 3 小時但只核准 1 小時，認列 1 小時（超出部分不認列，但產生 `OvertimeExceptionType.UNAPPROVED_OVERTIME` 供主管處理 —— 未核准的加班不該被靜默丟棄，那是勞資爭議的溫床）。

這是 CLAUDE.md「零捏造」在時數上的直接應用：系統不發明沒有發生的加班，也不隱瞞發生了的加班。

**沒有打卡紀錄的情形**（外勤、系統故障、`WorkDayType` 為假日而當事人未打卡）：`OvertimeRequest.evidenceBasis` 記為 `MANUAL_DECLARATION`，並強制走完整簽核鏈（不套用任何簡化門檻）。它仍然被認列，但**在報表上與有打卡佐證的加班分開統計** —— 勞動檢查會問這個比例。

### D10 — 事前與事後是同一張表的一個欄位，不是兩張表

**決策**：`OvertimeRequest.filingType: ADVANCE | POST_HOC`，單表。

對照 ADR 019 拆分 `ProcessTask` 的判準：那裡拆表是因為單表可以寫入**三種互相矛盾的非法狀態**（雙掛、雙空、type 與外鍵矛盾）。這裡沒有這種結構 —— 兩者的欄位完全相同，差別只在 `createdAt` 與 `workDate` 的先後，而那是可以由不變式檢查的（`assertOvertimeFilingType`：`ADVANCE` 要求 `createdAt` 早於該日班別窗起；`POST_HOC` 反之）。拆表在這裡不會讓非法狀態變少，只會讓「我的加班單」要查兩張表 —— 那正是 ADR 019 自己列出的代價，且在這裡換不到任何保證。

### D11 — 加成級距由純函數切段，倍率以整數分子分母表示

**決策**：`src/lib/overtime_rules.ts` 匯出純函數

```typescript
// Info: (20260817 - Julian) 依當日性質與已累計加班分鐘，把一段加班切成數個加成級距。
// Info: (20260817 - Julian) 純函數：無 DB、無 I/O、無 Date.now()。比照 attendance_rules.ts。
export const OVERTIME_ENGINE_VERSION = 1;
export function deriveOvertimeSegments(
  input: IOvertimeSegmentInput,
): IOvertimeSegment[];
```

級距 enum 與**加給**倍率（⚠️ 用語待法務確認，§3.2）：

| `OvertimePremiumTier` | 適用 | 加給倍率 | 法源 |
|---|---|---|---|
| `WEEKDAY_FIRST_2H` | 上班日延長前 2 小時 | 1/3 | §24 I ① |
| `WEEKDAY_BEYOND_2H` | 上班日再延長 | 2/3 | §24 I ② |
| `REST_DAY_FIRST_2H` | 休息日前 2 小時 | 4/3 | §24 II ① |
| `REST_DAY_BEYOND_2H` | 休息日 2 小時後 | 5/3 | §24 II ② |
| `HOLIDAY_DOUBLE` | 休假日／例假日經同意出勤 | 工資加倍發給 | §39 |
| `EMERGENCY_DOUBLE` | §32 IV 天災事變等 | 加倍發給 | §24 I ③ |

倍率一律以 `{ numerator: number; denominator: number }` 整數對表示，集中於 `src/constants/overtime.ts`，**嚴禁寫成 `1.333`**。理由與 CLAUDE.md §2「高精度數值」同源：這些倍率最終會乘上工資變成錢，浮點在這裡沒有立足之地。本模組不做這個乘法，但它必須把一個**可以無誤差相乘的東西**交給薪資模組。

**「今日已加班幾分鐘」的來源**：切段需要知道當日先前已認列多少分鐘（決定這一段從第幾小時起算）。由 Service 查詢當日已認列的 `OvertimeSegment` 加總後**作為參數傳入**純函數，函數本身不查 DB。

### D12 — 加班費或補休：一次選擇，且補休以批次入帳

**決策**：

- `OvertimeRequest.compensationMode: PAYMENT | COMPENSATORY_LEAVE`，由**員工**在申請時選擇（§32-1「勞工得選擇」）。
- 選 `PAYMENT` → 核准後產生 `LeaveCashOutEvent(reason = OVERTIME_PAYMENT)`，帶分段清單與各段分鐘、級距。
- 選 `COMPENSATORY_LEAVE` → 核准後**每一個分段各產生一筆 `LeaveGrant`**（`source = OVERTIME_CONVERSION`，`overtimeSegmentId` 指回該段），`deltaMinutes` **等於該段的實際加班分鐘（1:1）**，不乘倍率。

**為什麼一段一筆 grant**：§32-1 規定補休屆期未休要「依延長工作時間或休息日工作當日之工資計算標準發給工資」。若把 3 小時加班（1 小時 1/3 級距 + 2 小時 2/3 級距）合併成一筆 3 小時的補休，屆期折現時就算不出金額了 —— 級距資訊在合併的那一刻被銷毀。分批入帳，每一批帶著自己的級距，折現時逐批計算。

**變更選擇**：`PAYMENT → COMPENSATORY_LEAVE` 與反向都允許，但僅限**尚未進入薪資結算**且**補休尚未被使用**時，且必須留下 `LeaveLedgerEntry(entryType = ADJUST)` 的反向分錄，不刪列。

**扣減順序**：FIFO by `expiresOn`（先到期的先扣）。這對勞工有利（避免先到期的批次過期作廢），且是唯一能讓「還剩幾天不會過期」這個問題有確定答案的順序。同到期日者以 `createdAt` 為序。

### D13 — 折現一律以事件交棒，本模組不算錢

**決策**：新增 `LeaveCashOutEvent`，是本模組與薪資模組之間唯一的介面。

| `LeaveCashOutReason` | 觸發時機 | 法源 |
|---|---|---|
| `OVERTIME_PAYMENT` | 加班單核准且選擇加班費 | §24 |
| `ANNUAL_YEAR_END` | 特休年度終結未休且未協商遞延 | §38 IV |
| `ANNUAL_CARRY_FORWARD_END` | 遞延年度終結仍未休 | §38 IV |
| `COMPENSATORY_EXPIRED` | 補休期限屆滿未休 | §32-1 |
| `TERMINATION_SETTLEMENT` | 契約終止時之結算 | §38 IV、§32-1 |

事件內容：員工、分鐘數、級距（若有）、兩端的日約當分鐘、法源標記、來源 `LeaveGrant` 清單。**沒有金額欄位。**

薪資模組上線前，這張表就是一份「待計算清單」；HR 可匯出 CSV 交給既有的薪資作業。這與 ADR 020 對資遣費的處置同構：系統只算它真的知道的部分，其餘留下明確的接口而不是猜。

### D14 — 併休上限：對特休只警示，對雇主有准駁權的假別才可硬擋

**決策**：`LeaveConcurrencyRule`（部門 × 期間 × 上限）產生的結果分兩種，由 `LeavePolicy.employerMayReject` 決定：

- `employerMayReject = false`（特休）：**只警示，不擋送出**。§38 II 明定期日由勞工排定，雇主只能「協商調整」。系統若在送出端硬擋，等於用技術手段行使一個法律上沒有的否決權。超限資訊呈現在**簽核者**的畫面上，並記入 `LeaveConcurrencyWarning`（誰在什麼時候看到了什麼警示），協商不成時走既有的 `LeaveRecall` 銷假徵詢流程。
- `employerMayReject = true`（事假等）：`LeaveConcurrencyAction.BLOCK` 可設為硬擋，回 `CF_LEAVE_CONCURRENCY_EXCEEDED`（409）。

**這條決策是本模組最容易做錯的地方。** 「避免同一時間過多員工請假影響營運」是一個真實且合理的營運需求，但把它實作成對特休的硬性阻擋，就是一個會被勞檢開罰的功能。系統要做的是讓協商發生得更早、記錄得更完整，而不是讓協商不必發生。

---

## 5. 資料模型

### 5.1 新增 Enum（`src/constants/leave_policy.ts` / `src/constants/overtime.ts`，並鏡像至 Prisma）

依既有 `hr_enum_mirror.test.ts` 的慣例，有 schema 對應物者登記於 `MIRRORED`，純 UI 衍生者登記於 `UI_ONLY`。

| Enum | 值 | 對應 |
|---|---|---|
| `LeaveAccrualMethod` | `NONE` / `SENIORITY_TIER` / `FIXED_PER_CYCLE` / `PER_EVENT` | MIRRORED |
| `LeaveCycleBasis` | `HIRE_ANNIVERSARY` / `CALENDAR_YEAR` / `CALENDAR_MONTH` | MIRRORED |
| `LeaveUnitBasis` | `FIXED_MINUTES` / `HALF_WORKDAY` / `FULL_WORKDAY` | MIRRORED |
| `LeaveRoundingMode` | `UP` / `NEAREST` | MIRRORED |
| `LeaveQuotaMode` | `QUOTA` / `UNLIMITED` | MIRRORED |
| `LeaveProofRequirement` | `NONE` / `OPTIONAL` / `REQUIRED_OVER_THRESHOLD` | MIRRORED |
| `LeaveGrantSource` | `SENIORITY_ACCRUAL` / `CARRY_FORWARD` / `OVERTIME_CONVERSION` / `MANUAL_ADJUSTMENT` | MIRRORED |
| `LeaveLedgerEntryType` | `GRANT` / `CONSUME` / `RESTORE` / `EXPIRE` / `CASH_OUT` / `ADJUST` | MIRRORED |
| `LeaveApprovalNodeKind` | `DIRECT_MANAGER` / `DEPARTMENT_MANAGER` / `HR` / `SPECIFIC_EMPLOYEE` | MIRRORED |
| `LeaveApprovalStepStatus` | `PENDING` / `APPROVED` / `REJECTED` / `SKIPPED` | MIRRORED |
| `LeaveDaySegment` | `FULL` / `MORNING` / `AFTERNOON` / `CUSTOM` | MIRRORED |
| `LeaveCashOutReason` | 見 D13 表 | MIRRORED |
| `LeaveConcurrencyAction` | `WARN` / `BLOCK` | MIRRORED |
| `OvertimeFilingType` | `ADVANCE` / `POST_HOC` | MIRRORED |
| `OvertimeCompensationMode` | `PAYMENT` / `COMPENSATORY_LEAVE` | MIRRORED |
| `OvertimeEvidenceBasis` | `PUNCH_RECORD` / `MANUAL_DECLARATION` | MIRRORED |
| `OvertimePremiumTier` | 見 D11 表 | MIRRORED |
| `OvertimeRequestStatus` | `PENDING` / `APPROVED` / `REJECTED` / `WITHDRAWN` | MIRRORED |
| `LeaveBalanceHealth` | `OK` / `STALE` / `MISMATCH` | UI_ONLY（勾稽結果，不落地） |
| `OvertimeExceptionType` | `UNAPPROVED_OVERTIME` / `MISSING_PUNCH_EVIDENCE` | UI_ONLY（由打卡與加班單比對推導） |

> **`CALENDAR_MONTH` 是寫 seed 時才發現的**：生理假是「每月得請一日」（性平法 §14），而年度週期表達不了它 —— 用年度額度 12 日會讓一個人在一月請完全年份，那不是這條規定的意思。這種缺口只有在把法規逐條落成資料時才會浮出來，這也是本計畫堅持先寫 seed 規格再寫引擎的理由。

`WorkDayType` 需新增 `SUSPENDED`（因雨／颱風／災害停工）—— 出勤模組既有 ToDo，本模組的加班級距判定依賴 `WorkDayType` 的正確性（停工日到工的加成與國定假日不同），因此在本模組的里程碑 1 一併補上。

### 5.2 完整 Prisma 定義（18 個 enum、14 張 model，可直接貼用）

> **這是本模組 schema 的唯一來源。** 刻意不另開 `.prisma` 草案檔：
> `prisma.config.ts` 的 `schema` 指向單一 `prisma/schema.prisma`，
> 但編輯器的 Prisma 語言伺服器會把該目錄下**每一個** `.prisma` 檔當成獨立 schema 驗證 ——
> 一個只含新增 model 的草案檔，必然報出一整排
> 「missing an opposite relation field on the model `AccountBook`」，
> 因為 `AccountBook` 不在那個檔案裡。草案的正確落點是設計文件，不是 schema 目錄。
>
> **驗證狀態**：下列內容併入 `prisma/schema.prisma`、並套用 §5.3 的既有 model 增補之後，
> 已以 `@prisma/prisma-schema-wasm` 的 `validate()` 實測通過（2026-08-17）。

```prisma
/**
 * Info: (20260817 - Julian) ========== 假勤模組 (Leave & Overtime) ==========
 *
 * 貼入位置：`prisma/schema.prisma` 最末（既有簽到系統區塊之後）。
 * 貼入後另需在 `AccountBook` 與 `Employee` 補反向關聯，見本檔末尾的「反向關聯增補」。
 *
 * ## 五個貫穿本區塊的決策
 *
 * 1. **假別是規則不是列舉** —— `LeavePolicy` 取代 Demo 期間寫死的 `enum LeaveType`。
 *    「行為分類用 enum、參數用欄位」的切法見 ADR 021：`accrualMethod` / `cycleBasis` /
 *    `unitBasis` 的每個值都對應一段不同的程式，新增值必然伴隨新程式碼；而 `annualDays`
 *    / `minimumUnitMinutes` 是租戶自己會調的數字。`code` **嚴禁被 if/switch 比對**。
 * 2. **額度是異動的結果不是一個數字** —— `LeaveGrant`（批次，不可變）+
 *    `LeaveLedgerEntry`（append-only）為唯一真相，`LeaveBalance` 是可重建的派生快取。
 *    手法比照 ADR 015 的 `TeamWalletLedger`。
 * 3. **帳本的單位是分鐘** —— `Int`，整數運算，守恆恆成立。「日」只出現在授予
 *    (`grantedDays` × `dayEquivalentMinutes`) 與折現兩個端點，各自固化換算依據。
 *    半小時在 6 小時班別上是 1/12 日，用 Decimal 存日必然捨入、必然累積，
 *    而一條允許誤差的守恆式就不再是守恆式（ADR 022 §3）。
 * 4. **簽核路徑在送出當下固化** —— `LeaveApprovalStep` 存的是快照（含當時的工號與姓名）。
 *    組織異動不改寫歷史單據的簽核路徑（ADR 023）。
 * 5. **本模組不算金額** —— 只輸出分鐘與法定加成級距，折現一律經 `LeaveCashOutEvent`
 *    交棒薪資模組。同 ADR 020 對資遣費的處置（ADR 024 §7）。
 *
 * 完整脈絡見 `documents/architecture/leave_and_overtime_module_plan.md`
 * 與 ADR 021–024。
 */

// Info: (20260817 - Julian) 給假方式。每個值對應一段不同的計算程式，故為 enum 而非設定值（ADR 021 §2）
enum LeaveAccrualMethod {
  NONE            // Info: (20260817 - Julian) 不給額度（公傷病假、產假：有多少給多少，由事件決定）
  SENIORITY_TIER  // Info: (20260817 - Julian) 依年資級距表給假（特休，勞基法 §38 I）
  FIXED_PER_CYCLE // Info: (20260817 - Julian) 每週期固定日數（事假 14 日、家庭照顧假 7 日）
  PER_EVENT       // Info: (20260817 - Julian) 逐次事件給假（婚假、喪假：每發生一次給一次）
}

/**
 * Info: (20260817 - Julian) 給假週期基準。
 *
 * ToDo: (20260817 - Julian) 授權依據為勞動基準法施行細則 §24，條號待法務複核。
 *
 * 曆年制是**雇主為了行政方便**而選的制度，這個方便不能由勞工買單 ——
 * `assertCycleNotDisadvantageous` 在授予當下同時試算兩制，
 * 曆年制累計低於週年制即 throw（ADR 021 §3）。
 */
enum LeaveCycleBasis {
  HIRE_ANNIVERSARY // Info: (20260817 - Julian) 週年制：週期起點為到職日
  CALENDAR_YEAR    // Info: (20260817 - Julian) 曆年制：週期起點為 1/1，首年與跨級距年須比例給假
  // Info: (20260817 - Julian) 曆月制：週期起點為每月 1 日。生理假是「每月得請一日」（性平法 §14），
  // Info: (20260817 - Julian) 用年度額度 12 日會讓一個人在一月請完全年份，那不是這條規定的意思
  CALENDAR_MONTH
}

/**
 * Info: (20260817 - Julian) 最小請假單位的基準。**「半天」不是 240 分鐘。**
 *
 * 它是「該日應工作分鐘的一半」，而 `ShiftPattern.requiredWorkMinutes` 因班別而異
 * （工地日班與本部行政班就不同）。寫成 240 等於宣稱所有人的一天都是 8 小時 ——
 * 那正是 `ShiftPattern` 拒絕 `shiftType` 的同一種謊（ADR 021 §4）。
 */
enum LeaveUnitBasis {
  FIXED_MINUTES // Info: (20260817 - Julian) 以 minimumUnitMinutes 為準（半小時 = 30、一小時 = 60）
  HALF_WORKDAY  // Info: (20260817 - Julian) floor(該日班別 requiredWorkMinutes / 2)，餘數由下半天吸收
  FULL_WORKDAY  // Info: (20260817 - Julian) 該日班別 requiredWorkMinutes
}

/**
 * Info: (20260817 - Julian) 請假時數的捨入方向。
 *
 * 預設 UP（不足一單位以一單位計）是**對勞工不利**的預設，必須載明於工作規則。
 * 刻意沒有 DOWN：往下捨的結果會被 assertCycleNotDisadvantageous 擋掉並 throw，
 * 提供一個必然觸發例外的設定值，只會讓租戶以為那是可用的選項。
 */
enum LeaveRoundingMode {
  UP      // Info: (20260817 - Julian) 無條件進位至最小單位
  NEAREST // Info: (20260817 - Julian) 四捨五入至最小單位
}

// Info: (20260817 - Julian) 是否受額度限制。UNLIMITED 者不建 LeaveGrant，請假不扣帳本（公傷病假、產假）
enum LeaveQuotaMode {
  QUOTA
  UNLIMITED
}

// Info: (20260817 - Julian) 證明文件要求。REQUIRED_OVER_THRESHOLD 時看 LeavePolicy.proofThresholdDays
enum LeaveProofRequirement {
  NONE
  OPTIONAL
  REQUIRED_OVER_THRESHOLD
}

/**
 * Info: (20260817 - Julian) 額度的來源。
 *
 * OVERTIME_CONVERSION ⟺ `LeaveGrant.overtimeSegmentId != null`（雙向），
 * 由 `assertGrantSource` 擋在 repository。不拆成獨立的補休表：
 * 拆表不會讓非法狀態變少，卻要寫兩套 allocateConsumption、兩套勾稽、兩套重建
 * —— 判準同 ADR 019 與 `EmployeeShiftDay`（ADR 022 §5.2）。
 */
enum LeaveGrantSource {
  SENIORITY_ACCRUAL   // Info: (20260817 - Julian) 依年資或週期自動授予
  CARRY_FORWARD       // Info: (20260817 - Julian) 上年度遞延（特休，勞基法 §38 IV）
  OVERTIME_CONVERSION // Info: (20260817 - Julian) 加班換補休（勞基法 §32-1，1:1 不乘倍率）
  MANUAL_ADJUSTMENT   // Info: (20260817 - Julian) 人工調整，reason 必填
}

/**
 * Info: (20260817 - Julian) 帳本異動類型。
 *
 * **撤銷是寫反向的 RESTORE / ADJUST，不是刪列。** 刪掉的話「他曾經被扣過、後來退回」
 * 這個事實就消失了，而那正是勞動檢查會查的東西 —— 理由同 `LeaveDay` 銷假時
 * 把 activeKey 設回 null 而不刪列。
 */
enum LeaveLedgerEntryType {
  GRANT    // Info: (20260817 - Julian) 授予（正）
  CONSUME  // Info: (20260817 - Julian) 請假扣減（負）
  RESTORE  // Info: (20260817 - Julian) 駁回／撤回／銷假退回（正）
  EXPIRE   // Info: (20260817 - Julian) 到期作廢（負）
  CASH_OUT // Info: (20260817 - Julian) 折現（負）。cashOutOnExpiry 為真時必須先產事件再 EXPIRE
  ADJUST   // Info: (20260817 - Julian) 人工調整或補償分錄（有號）
}

/**
 * Info: (20260817 - Julian) 簽核節點型別。
 *
 * 每個值對應一段不同的解析程式（DEPARTMENT_MANAGER 走部門樹、HR 查角色、
 * SPECIFIC_EMPLOYEE 讀外鍵），故為 enum；而門檻天數是資料（ADR 023 §2.1）。
 */
enum LeaveApprovalNodeKind {
  DIRECT_MANAGER     // Info: (20260817 - Julian) Employee.managerId
  DEPARTMENT_MANAGER // Info: (20260817 - Julian) 沿 Department 樹向上找第一個有 managerId 的節點
  HR                 // Info: (20260817 - Julian) 具 HR 角色者，任一人簽核即通過
  SPECIFIC_EMPLOYEE  // Info: (20260817 - Julian) 指名特定員工（小型組織與代理情境）
}

// Info: (20260817 - Julian) 單一簽核節點的狀態。SKIPPED 用於相鄰去重後被併掉的節點
enum LeaveApprovalStepStatus {
  PENDING
  APPROVED
  REJECTED
  SKIPPED
}

/**
 * Info: (20260817 - Julian) 一天請假的時段型態。
 *
 * MORNING / AFTERNOON 的分界由該日班別的 coreStartMinute 與 requiredWorkMinutes 推出，
 * 不是固定的 12:00 —— 夜班的「上半天」在日曆上是前一天晚上。
 */
enum LeaveDaySegment {
  FULL
  MORNING
  AFTERNOON
  CUSTOM // Info: (20260817 - Julian) 以 startMinute / endMinute 指定，供「請兩小時」這類需求
}

// Info: (20260817 - Julian) 折現事件的成因。每一種都對應一條法源，見 ADR 024 §7
enum LeaveCashOutReason {
  OVERTIME_PAYMENT         // Info: (20260817 - Julian) 加班選擇領加班費（§24）
  ANNUAL_YEAR_END          // Info: (20260817 - Julian) 特休年度終結未休且未協商遞延（§38 IV）
  ANNUAL_CARRY_FORWARD_END // Info: (20260817 - Julian) 遞延年度終結仍未休（§38 IV）
  COMPENSATORY_EXPIRED     // Info: (20260817 - Julian) 補休期限屆滿未休（§32-1）
  TERMINATION_SETTLEMENT   // Info: (20260817 - Julian) 契約終止結算（§38 IV、§32-1）
}

/**
 * Info: (20260817 - Julian) 併休超限的處置。
 *
 * **對特休只能是 WARN。** 勞基法 §38 II 明定期日由勞工排定，雇主只能「協商調整」；
 * 在送出端硬擋等於用技術手段行使一個法律上沒有的否決權（計畫書 §D14）。
 * BLOCK 僅適用於 `LeavePolicy.employerMayReject = true` 的假別。
 */
enum LeaveConcurrencyAction {
  WARN
  BLOCK
}

/**
 * Info: (20260817 - Julian) 加班申請的時序型態。
 *
 * 不拆成兩張表：兩者欄位完全相同，差別只在 createdAt 與 workDate 的先後，
 * 而那是可由 `assertOvertimeFilingType` 檢查的。拆表不會讓非法狀態變少，
 * 只會讓「我的加班單」要查兩張表再合併排序（ADR 024 §3）。
 */
enum OvertimeFilingType {
  ADVANCE  // Info: (20260817 - Julian) 事前申請：createdAt 須早於該日班別的 windowStartMinute
  POST_HOC // Info: (20260817 - Julian) 事後補單
}

// Info: (20260817 - Julian) 加班的歸戶方式。勞基法 §32-1 要求由**勞工**選擇
enum OvertimeCompensationMode {
  PAYMENT             // Info: (20260817 - Julian) 領加班費，產生 LeaveCashOutEvent
  COMPENSATORY_LEAVE  // Info: (20260817 - Julian) 換補休，每個分段各產生一筆 LeaveGrant（1:1）
}

/**
 * Info: (20260817 - Julian) 加班時數的佐證來源。
 *
 * MANUAL_DECLARATION 仍然認列，但強制走完整簽核鏈，且在統計端點與有打卡佐證者
 * **分開統計** —— 勞動檢查會問「有多少加班沒有出勤紀錄佐證」，
 * 而一個答不出這題的系統等於默認全部都是（ADR 024 §2.2）。
 */
enum OvertimeEvidenceBasis {
  PUNCH_RECORD
  MANUAL_DECLARATION
}

/**
 * Info: (20260817 - Julian) 法定加成級距。
 *
 * ToDo: (20260817 - Julian) §24 平日用「加給三分之一」（發給 4/3），休息日用
 * 「**另再**加給一又三分之一」（發給 7/3）。倍率常數以**加給倍率**為準，
 * 但此換算陳述待法務複核 —— 差一個「另再」就差一倍工資。
 */
enum OvertimePremiumTier {
  WEEKDAY_FIRST_2H   // Info: (20260817 - Julian) 上班日延長前 2 小時，加給 1/3（§24 I ①）
  WEEKDAY_BEYOND_2H  // Info: (20260817 - Julian) 上班日再延長，加給 2/3（§24 I ②）
  REST_DAY_FIRST_2H  // Info: (20260817 - Julian) 休息日前 2 小時，另再加給 4/3（§24 II ①）
  REST_DAY_BEYOND_2H // Info: (20260817 - Julian) 休息日 2 小時後，另再加給 5/3（§24 II ②）
  HOLIDAY_DOUBLE     // Info: (20260817 - Julian) 休假日經同意出勤，工資加倍發給（§39）
  EMERGENCY_DOUBLE   // Info: (20260817 - Julian) 天災事變等，加倍發給（§24 I ③、§32 IV）
}

// Info: (20260817 - Julian) 加班單狀態。與 LeaveRequestStatus 同構，但兩者的簽核鏈不共用
enum OvertimeRequestStatus {
  PENDING
  APPROVED
  REJECTED
  WITHDRAWN
}

/**
 * Info: (20260817 - Julian) 假別設定。取代 Demo 期間寫死的 `enum LeaveType`。
 *
 * `code` 是帳本內唯一鍵，供 seed、i18n 與跨帳本統計比對使用。
 * **嚴禁被 if/switch 比對** —— 一旦規則引擎開始讀 code，租戶自訂的假別就會
 * 靜默掉進一段從來沒有為它寫過的分支。以 `leave_policy_no_code_branching.test.ts`
 * 釘住，而不是靠自律（ADR 021 §2.1）。
 */
model LeavePolicy {
  id   String @id @default(uuid())
  code String // Info: (20260817 - Julian) 假別代號 (例: ANNUAL)，唯一性以帳本為範圍
  name String // Info: (20260817 - Julian) 假別名稱 (例: 特別休假)

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260817 - Julian) --- 給假規則 ---
  accrualMethod LeaveAccrualMethod @map("accrual_method")
  cycleBasis    LeaveCycleBasis    @map("cycle_basis")
  quotaMode     LeaveQuotaMode     @default(QUOTA) @map("quota_mode")
  // Info: (20260817 - Julian) FIXED_PER_CYCLE / PER_EVENT 時的日數；SENIORITY_TIER 時為 null（改看 tiers）
  annualDays    Decimal?           @map("annual_days")

  // Info: (20260817 - Julian) --- 請假單位（「半天」是相對量，不能寫成 240，見 LeaveUnitBasis）---
  unitBasis          LeaveUnitBasis    @map("unit_basis")
  // Info: (20260817 - Julian) **僅 FIXED_MINUTES 有意義，其餘必須為 null。**
  // Info: (20260817 - Julian) 不是「忽略」而是「必須為 null」——留著一個不被讀的值，
  // Info: (20260817 - Julian) 它仍然是一個看起來像設定的謊。由 assertLeavePolicyUnit 擋在 repository
  minimumUnitMinutes Int?              @map("minimum_unit_minutes")
  roundingMode       LeaveRoundingMode @default(UP) @map("rounding_mode")
  // Info: (20260817 - Julian) 比例給假的小數位數。方向固定為無條件進位，不開放設定（ADR 021 §3.2）
  proratedRoundingScale Int            @default(1) @map("prorated_rounding_scale")

  // Info: (20260817 - Julian) --- 遞延與失效 ---
  // Info: (20260817 - Julian) 特休依 §38 IV 得協商遞延一年 => 12；0 表不可遞延
  carryForwardMonths Int     @default(0) @map("carry_forward_months")
  // Info: (20260817 - Julian) 屆期未休是否折現（特休與補休為 true，事假為 false）
  cashOutOnExpiry    Boolean @default(false) @map("cash_out_on_expiry")

  // Info: (20260817 - Julian) --- 工資與證明 ---
  // Info: (20260817 - Julian) 給薪比例（工資照給 = 1、折半發給 = 0.5、不給工資 = 0）。
  // Info: (20260817 - Julian) 本模組不算金額，此欄位供薪資模組與畫面提示使用
  // Info: (20260817 - Julian) Nullable 且無預設值：產假的工資取決於年資（§50 II），
  // Info: (20260817 - Julian) 不是能寫在假別上的常數。預設 1 會把「要看年資」記成「工資照給」
  paidRatio          Decimal?              @map("paid_ratio")
  proofRequirement   LeaveProofRequirement @default(NONE) @map("proof_requirement")
  proofThresholdDays Decimal?              @map("proof_threshold_days")

  // Info: (20260817 - Julian) --- 權責 ---
  // Info: (20260817 - Julian) 雇主有無准駁權。特休為 false（§38 II 期日由勞工排定），
  // Info: (20260817 - Julian) 併休上限對它只能 WARN 不能 BLOCK
  employerMayReject Boolean @default(true) @map("employer_may_reject")
  // Info: (20260817 - Julian) 是否適用銷假徵詢（§38 III）。取代寫死的 EMPLOYEE_SCHEDULED_LEAVE_TYPES
  recallable        Boolean @default(false)

  /**
   * Info: (20260817 - Julian) 併入其他假別計算（家庭照顧假併入事假，性平法 §20）。
   *
   * ToDo: (20260817 - Julian) 生理假逾一定日數併入病假的規則待法務複核；
   * 在核對完成前該假別此欄位留空，UI 顯示「本假別的併計規則尚未設定」，不猜一個數字填進去。
   */
  mergesIntoPolicyId String?       @map("merges_into_policy_id")
  mergesIntoPolicy   LeavePolicy?  @relation("LeavePolicyMerge", fields: [mergesIntoPolicyId], references: [id], onDelete: SetNull)
  mergedFromPolicies LeavePolicy[] @relation("LeavePolicyMerge")

  // Info: (20260817 - Julian) 法源記載。字串而非 enum：條號會修法，且它從不參與判斷
  legalBasis String? @map("legal_basis")
  // Info: (20260817 - Julian) 內建假別由 seed 產生，租戶不可刪除（可停用）
  isSystemDefined Boolean @default(false) @map("is_system_defined")
  isActive        Boolean @default(true) @map("is_active")

  tiers            LeaveAccrualTier[]
  grants           LeaveGrant[]
  requests         LeaveRequest[]
  balances         LeaveBalance[]
  approvalRules    LeaveApprovalRule[]
  concurrencyRules LeaveConcurrencyRule[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([accountBookId, code])
  @@index([accountBookId])
  @@map("leave_policy")
}

/**
 * Info: (20260817 - Julian) 年資級距給假表。
 *
 * 勞基法 §38 I 的 3/7/10/14/15/+1 至 30 日是**資料不是程式碼** —— 它會修法，
 * 而 2016 年那次修法改的就是這張表。修法時該改的是六列資料，不是一個 switch 的六個 case。
 *
 * 「十年以上每年加給一日，加至三十日為止」由 `incrementDaysPerYear` 與 `maxDays`
 * 表達，不需要為它列 20 列 —— 它是一條規則不是 20 個特例。
 *
 * ToDo: (20260817 - Julian) 「每一年加給一日」自滿 10 年當年或次年起算，實務見解不一，
 * 差一日。seed 暫以滿 10 年當年 16 日落地，待法務複核。
 */
model LeaveAccrualTier {
  id String @id @default(uuid())

  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Cascade)

  // Info: (20260817 - Julian) 年資下界（含），以月為單位。「六個月以上一年未滿」=> 6
  minSeniorityMonths   Int      @map("min_seniority_months")
  days                 Decimal
  // Info: (20260817 - Julian) 超過本級距後每滿一年再加的日數（§38 I ⑥）
  incrementDaysPerYear Decimal? @map("increment_days_per_year")
  // Info: (20260817 - Julian) 加給的上限（§38 I ⑥ 的「加至三十日為止」）
  maxDays              Decimal? @map("max_days")

  @@unique([leavePolicyId, minSeniorityMonths])
  @@map("leave_accrual_tier")
}

/**
 * Info: (20260817 - Julian) 授予批次。**不可變。**
 *
 * ## 為什麼是批次而不是一個餘額
 *
 * §38 IV 的遞延與 §32-1 的補休期限都問「這一批什麼時候給的、什麼時候到期」，
 * 而餘額欄位答不出來。扣減採 FIFO by expiresOn（先到期先扣）：對勞工有利，
 * 且是唯一能讓「還剩幾天不會過期」有確定答案的順序。
 *
 * ## grantedDays 與 dayEquivalentMinutes 為什麼兩個都要存
 *
 * 帳本的單位是分鐘（整數、守恆恆成立），法規的面額是日。兩個欄位一起，
 * 任何人事後都能驗算「這 3360 分鐘是 7 日 × 每日 480 分鐘來的」。
 * 少存任何一個，這筆授予就變成一個無從查核的數字。
 *
 * ## overtimeSegmentId
 *
 * 僅 source = OVERTIME_CONVERSION 時有值，指回產生它的加班分段 ——
 * 補休屆期折現要「依當日工資計算標準發給」(§32-1)，級距資訊必須跟著這一批走。
 * 由 `assertGrantSource` 擋雙向不變式，並檢查 1:1（grantedMinutes === segment.minutes）。
 */
model LeaveGrant {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  employeeId String   @map("employee_id")
  employee   Employee @relation("LeaveGrantEmployee", fields: [employeeId], references: [id], onDelete: Cascade)

  // Info: (20260817 - Julian) Restrict：假別被刪不可讓歷史額度靜默失去它的規則來源
  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Restrict)

  source LeaveGrantSource

  // Info: (20260817 - Julian) 法定面額與換算依據（見上方說明），三者皆不可變
  grantedDays          Decimal @map("granted_days")
  dayEquivalentMinutes Int     @map("day_equivalent_minutes")
  // Info: (20260817 - Julian) grantedDays × dayEquivalentMinutes（進位）。帳本的真相
  grantedMinutes       Int     @map("granted_minutes")

  // Info: (20260817 - Julian) 週期起訖與到期日，皆為 "YYYY-MM-DD"，與 EmployeeShiftDay.workDate 同型別同語意
  cycleStartDate String @map("cycle_start_date")
  cycleEndDate   String @map("cycle_end_date")
  expiresOn      String @map("expires_on")

  // Info: (20260817 - Julian) 僅 OVERTIME_CONVERSION 有值。Restrict：加班單不可在已換成補休後被刪
  overtimeSegmentId String?          @unique @map("overtime_segment_id")
  overtimeSegment   OvertimeSegment? @relation(fields: [overtimeSegmentId], references: [id], onDelete: Restrict)

  // Info: (20260817 - Julian) 人工調整必須說明理由：一筆沒有理由的額度調整，事後沒有人能判斷它合不合理
  reason String?

  entries LeaveLedgerEntry[]

  createdAt DateTime @default(now()) @map("created_at")

  @@index([accountBookId, employeeId, leavePolicyId])
  @@index([expiresOn])
  @@map("leave_grant")
}

/**
 * Info: (20260817 - Julian) 額度異動帳本。**Append-only，永不 update、永不 delete。**
 *
 * 手法比照 ADR 015 的 `TeamWalletLedger`：有號 delta、扣後餘額、冪等鍵。
 *
 * `leaveGrantId` 必填而非可空：一筆不知道從哪一批扣的異動，等於沒有記錄 ——
 * FIFO 扣減會跨批次產生多筆，各自指向自己的那一批。
 */
model LeaveLedgerEntry {
  id String @id @default(uuid())

  leaveGrantId String     @map("leave_grant_id")
  leaveGrant   LeaveGrant @relation(fields: [leaveGrantId], references: [id], onDelete: Restrict)

  entryType LeaveLedgerEntryType @map("entry_type")
  // Info: (20260817 - Julian) 有號：GRANT / RESTORE 為正，CONSUME / EXPIRE / CASH_OUT 為負，ADJUST 兩者皆可
  deltaMinutes Int @map("delta_minutes")
  // Info: (20260817 - Julian) 該批扣後餘額。冗餘但刻意：勾稽時不必重跑全表即可定位斷點（同 TeamWalletLedger.balanceAfter）
  grantBalanceAfterMinutes Int @map("grant_balance_after_minutes")

  // Info: (20260817 - Julian) 來源單據。CONSUME / RESTORE 指向 LeaveDay，CASH_OUT 指向事件
  leaveDayId String?   @map("leave_day_id")
  leaveDay   LeaveDay? @relation(fields: [leaveDayId], references: [id], onDelete: SetNull)

  cashOutEventId String?             @map("cash_out_event_id")
  cashOutEvent   LeaveCashOutEvent?  @relation(fields: [cashOutEventId], references: [id], onDelete: SetNull)

  // Info: (20260817 - Julian) 冪等鍵。重試、補償、Worker 重跑皆靠它擋重複入帳
  // Info: (20260817 - Julian) 授予格式：grant:<employeeId>:<policyId>:<cycleStartDate>（同 ADR 010 的決定性雜湊手法）
  idempotencyKey String @unique @map("idempotency_key")

  // Info: (20260817 - Julian) 操作者。系統排程產生者為 null，並以 reason 標明來源
  actorEmployeeId String?   @map("actor_employee_id")
  actor           Employee? @relation("LeaveLedgerActor", fields: [actorEmployeeId], references: [id], onDelete: SetNull)
  reason          String?

  createdAt DateTime @default(now()) @map("created_at")

  @@index([leaveGrantId])
  @@index([leaveDayId])
  @@map("leave_ledger_entry")
}

/**
 * Info: (20260817 - Julian) 額度餘額。**派生快取，不是第二個真相。**
 *
 * 三規矩（比照出勤模組對 AttendancePresence 的處置）：
 * ① 只在寫入異動的同一個 $transaction 內更新
 * ② 可由 rebuildLeaveBalance 完整重建
 * ③ 每日 Worker 勾稽 Σ(deltaMinutes) === remainingMinutes，不符以帳本為準並告警
 *
 * `reconciledAt` 可為 null，語意是「從未勾稽過」—— 與「勾稽過且相符」是兩件事。
 * 同 AttendancePresence.STALE 的精神：不知道不等於沒問題。
 */
model LeaveBalance {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  employeeId String   @map("employee_id")
  employee   Employee @relation("LeaveBalanceEmployee", fields: [employeeId], references: [id], onDelete: Cascade)

  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Cascade)

  remainingMinutes Int @map("remaining_minutes")
  // Info: (20260817 - Julian) 30 日內即將到期的分鐘數。供畫面提示，同樣是派生值
  expiringSoonMinutes Int @default(0) @map("expiring_soon_minutes")

  reconciledAt DateTime? @map("reconciled_at")

  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([employeeId, leavePolicyId])
  @@index([accountBookId])
  @@map("leave_balance")
}

/**
 * Info: (20260817 - Julian) 簽核規則（帳本層級）。門檻天數是**資料**，節點型別是 enum。
 *
 * 需求的「3 天內直屬主管、3 天以上簽至部門經理或 HR」在 3.0 天處重疊 ——
 * 本專案定為右開區間 `[0, 3)` 與 `[3, ∞)`，即**恰好 3 天走長假規則**。
 * 這種邊界不能留給實作者猜。`assertRuleRangesDisjoint` 保證同帳本內
 * 區間不重疊**且完整覆蓋 [0, ∞)** —— 只檢查不重疊而漏掉覆蓋，
 * 會讓某個天數展開出空鏈，然後錯誤訊息指向員工的主管設定，而真正的原因在這張表。
 */
model LeaveApprovalRule {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260817 - Julian) null 表適用所有假別；有值則僅適用該假別（優先於通則）
  leavePolicyId String?      @map("leave_policy_id")
  leavePolicy   LeavePolicy? @relation(fields: [leavePolicyId], references: [id], onDelete: Cascade)

  // Info: (20260817 - Julian) 天數區間，左閉右開。maxDays 為 null 表無上界
  minDays Decimal  @map("min_days")
  maxDays Decimal? @map("max_days")

  /**
   * Info: (20260817 - Julian) **刻意沒有 `priority` 欄位。**
   *
   * 第一版有。實作 `assertRuleRangesDisjoint` 時發現它永遠不會被讀到：
   * 不變式要求區間不重疊**且**完整覆蓋 `[0, ∞)`，於是任何一個天數
   * 恰好命中一條規則 —— 沒有「同一區間有多條」這種情形可供排序。
   *
   * 一個永遠不影響結果的欄位，遲早會有人相信它有效
   * （判準同 `ShiftPattern` 拒絕 `shiftType`）。
   */

  steps LeaveApprovalRuleStep[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([accountBookId])
  @@map("leave_approval_rule")
}

// Info: (20260817 - Julian) 規則的節點序列。SPECIFIC_EMPLOYEE ⟺ specificEmployeeId != null，由 repository 不變式擋
model LeaveApprovalRuleStep {
  id String @id @default(uuid())

  ruleId String            @map("rule_id")
  rule   LeaveApprovalRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  order    Int
  nodeKind LeaveApprovalNodeKind @map("node_kind")

  // Info: (20260817 - Julian) Restrict：被指名的人離職時應由 HR 先改規則，不可讓節點靜默變成 null
  specificEmployeeId String?   @map("specific_employee_id")
  specificEmployee   Employee? @relation("LeaveApprovalRuleSpecific", fields: [specificEmployeeId], references: [id], onDelete: Restrict)

  @@unique([ruleId, order])
  @@map("leave_approval_rule_step")
}

/**
 * Info: (20260817 - Julian) 單據上的簽核鏈**快照**。
 *
 * ## 為什麼要存工號與姓名
 *
 * 組織會異動。若核准時才查「你的主管是誰」，一次調動就改寫了所有歷史單據的
 * 簽核路徑，而那正是勞動檢查要看的東西。冗餘的是**當下值**不是同一個事實的第二份：
 * `Employee.name` 是「他現在叫什麼」，本表是「他當時叫什麼」，兩者本來就可以不同。
 *
 * ## pendingKey
 *
 * 值為 `leaveRequestId`，**僅在本節點為當前待簽時填入**，其餘為 null。
 * Postgres 的 unique index 不約束 NULL，因此已簽與尚未輪到的節點可以有很多筆，
 * 待簽的只能有一筆 —— 手法同 `LeaveDay.activeKey` 與 `LeaveRecall.pendingLeaveDayId`。
 *
 * 刻意不在 LeaveRequest 上放 currentStepOrder：那會是第二個真相，
 * 且可以與本表的 status 互相矛盾（ADR 019 §1 表格評為「最惡劣」的第 3 種）。
 */
model LeaveApprovalStep {
  id String @id @default(uuid())

  leaveRequestId String       @map("leave_request_id")
  leaveRequest   LeaveRequest @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)

  order    Int
  nodeKind LeaveApprovalNodeKind @map("node_kind")

  // Info: (20260817 - Julian) SetNull：核准者離職不該讓單據消失。**但姓名工號的快照不受影響** ——
  // Info: (20260817 - Julian) 這正是 Demo 版 decidedByEmployeeId 註解點名的那個缺口的補法
  approverEmployeeId String?   @map("approver_employee_id")
  approver           Employee? @relation("LeaveApprovalStepApprover", fields: [approverEmployeeId], references: [id], onDelete: SetNull)

  // Info: (20260817 - Julian) 展開當下的快照，不可變
  approverEmployeeNo String  @map("approver_employee_no")
  approverName       String  @map("approver_name")
  approverJobTitle   String? @map("approver_job_title")

  status LeaveApprovalStepStatus @default(PENDING)

  pendingKey String? @unique @map("pending_key")

  // Info: (20260817 - Julian) 相鄰去重時被併掉的節點型別（例如直屬主管恰好就是部門經理）。
  // Info: (20260817 - Julian) 讓「為什麼這張單只有兩關」查得到，而不是看起來像少簽了一關
  mergedFromKinds LeaveApprovalNodeKind[] @map("merged_from_kinds")
  // Info: (20260817 - Julian) 節點解析出申請人本人時自動上升的理由（老闆也要能請假，不 throw）
  escalatedReason String?                 @map("escalated_reason")

  decidedAt DateTime? @map("decided_at")
  comment   String?

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([leaveRequestId, order])
  @@index([approverEmployeeId, status])
  @@map("leave_approval_step")
}

/**
 * Info: (20260817 - Julian) 併休上限規則。
 *
 * maxConcurrentEmployees 與 maxConcurrentRatio **恰有一個為 null**，
 * 由 repository 不變式擋：兩個都填就是兩個互相矛盾的上限，而系統沒有依據判斷該信哪一個。
 */
model LeaveConcurrencyRule {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260817 - Julian) null 表全公司；有值則限該部門（不含子部門，避免上限在樹上疊加）
  departmentId String?     @map("department_id")
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  // Info: (20260817 - Julian) null 表所有假別合計
  leavePolicyId String?      @map("leave_policy_id")
  leavePolicy   LeavePolicy? @relation(fields: [leavePolicyId], references: [id], onDelete: Cascade)

  maxConcurrentEmployees Int?     @map("max_concurrent_employees")
  maxConcurrentRatio     Decimal? @map("max_concurrent_ratio")

  // Info: (20260817 - Julian) BLOCK 僅適用於 LeavePolicy.employerMayReject = true 的假別（§38 II）
  action LeaveConcurrencyAction @default(WARN)

  warnings LeaveConcurrencyWarning[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([accountBookId])
  @@map("leave_concurrency_rule")
}

/**
 * Info: (20260817 - Julian) 併休超限的警示紀錄。**Append-only。**
 *
 * 對特休不能硬擋（§38 II 期日由勞工排定），但協商必須留痕 ——
 * 「誰在什麼時候看到了什麼警示」是後續協商的起點，也是爭議時唯一的憑據。
 */
model LeaveConcurrencyWarning {
  id String @id @default(uuid())

  leaveRequestId String       @map("leave_request_id")
  leaveRequest   LeaveRequest @relation(fields: [leaveRequestId], references: [id], onDelete: Cascade)

  ruleId String               @map("rule_id")
  rule   LeaveConcurrencyRule @relation(fields: [ruleId], references: [id], onDelete: Restrict)

  workDate      String @map("work_date")
  observedCount Int    @map("observed_count")
  limitValue    Int    @map("limit_value")

  // Info: (20260817 - Julian) 警示是給誰看的。申請人與簽核者各自看到時都寫一筆
  shownToEmployeeId String   @map("shown_to_employee_id")
  shownTo           Employee @relation("LeaveConcurrencyWarningViewer", fields: [shownToEmployeeId], references: [id], onDelete: Cascade)
  shownAt           DateTime @default(now()) @map("shown_at")

  @@index([leaveRequestId])
  @@map("leave_concurrency_warning")
}

/**
 * Info: (20260817 - Julian) 待折現事件。本模組與薪資模組之間**唯一**的介面。
 *
 * **沒有金額欄位。** 本模組只保證「幾分鐘、什麼級距、法源哪一條」，
 * 基準時薪與金額屬薪資模組 —— 同 ADR 020 對資遣費的處置：
 * 系統只算它真的知道的部分，其餘留下明確的接口而不是猜。
 *
 * 兩端的日約當分鐘都存：班別變更會讓「剩餘分鐘換回日數」與當初授予的日數不一致，
 * 那在法律上本來就是有爭議的情形。系統該做的不是選一邊假裝沒事，
 * 而是把兩端的換算依據都記下來，讓爭議發生時有帳可查（ADR 022 §3.3）。
 */
model LeaveCashOutEvent {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  employeeId String   @map("employee_id")
  employee   Employee @relation("LeaveCashOutEmployee", fields: [employeeId], references: [id], onDelete: Cascade)

  reason LeaveCashOutReason

  minutes Int
  // Info: (20260817 - Julian) 僅加班相關的折現有值。補休屆期折現要「依當日工資計算標準發給」(§32-1)
  premiumTier OvertimePremiumTier? @map("premium_tier")

  // Info: (20260817 - Julian) 兩端的換算依據（見上方說明）
  grantDayEquivalentMinutes   Int @map("grant_day_equivalent_minutes")
  cashOutDayEquivalentMinutes Int @map("cash_out_day_equivalent_minutes")

  // Info: (20260817 - Julian) 來源批次。跨批次折現會有多個
  sourceGrantIds String[] @map("source_grant_ids")

  // Info: (20260817 - Julian) 法源記載，例 "勞動基準法 §38 IV"。字串：它從不參與判斷
  legalBasis String @map("legal_basis")

  // Info: (20260817 - Julian) 薪資模組結算後回填。null 表尚未結算
  settledAt DateTime? @map("settled_at")

  ledgerEntries LeaveLedgerEntry[]

  createdAt DateTime @default(now()) @map("created_at")

  @@index([accountBookId, employeeId])
  @@index([settledAt])
  @@map("leave_cash_out_event")
}

/**
 * Info: (20260817 - Julian) 加班單。記載的是**意圖與核准**，實際分鐘的來源是 AttendancePunch。
 *
 * recognizedMinutes = min(approvedMinutes, 實際停留於加班區間的打卡分鐘)。
 * 申請 3 小時只待 1 小時就認列 1 小時 —— 系統不發明沒有發生過的加班；
 * 待了 3 小時只核准 1 小時，超出部分不認列但進 `L29 overtime/unapproved`
 * 供主管處理 —— 也不隱瞞發生了的加班（ADR 024 §2）。
 */
model OvertimeRequest {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 隸屬的帳本 (租戶 Root Node)
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  employeeId String   @map("employee_id")
  employee   Employee @relation("OvertimeRequestEmployee", fields: [employeeId], references: [id], onDelete: Cascade)

  // Info: (20260817 - Julian) "YYYY-MM-DD"，與 AttendancePunch.workDate 同型別同語意
  workDate String @map("work_date")

  filingType       OvertimeFilingType       @map("filing_type")
  compensationMode OvertimeCompensationMode @map("compensation_mode")
  evidenceBasis    OvertimeEvidenceBasis    @default(PUNCH_RECORD) @map("evidence_basis")

  // Info: (20260817 - Julian) 當日 00:00 起算的分鐘數（>= 1440 表次日），與 ShiftPattern 同型別同語意
  requestedStartMinute Int @map("requested_start_minute")
  requestedEndMinute   Int @map("requested_end_minute")

  // Info: (20260817 - Julian) 核准分鐘。核准前為 null —— 0 與「還沒核准」是兩件事
  approvedMinutes Int? @map("approved_minutes")
  // Info: (20260817 - Julian) 認列分鐘 = min(核准, 事實)。Σ segment.minutes 必須等於它
  recognizedMinutes Int? @map("recognized_minutes")

  // Info: (20260817 - Julian) 加班事由。非空：一張沒有理由的加班單，事後沒有人能判斷它合不合理
  reason String
  status OvertimeRequestStatus @default(PENDING)

  // Info: (20260817 - Julian) §32 IV 天災事變等情形，經報備者適用加倍發給
  isEmergency Boolean @default(false) @map("is_emergency")

  segments OvertimeSegment[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([accountBookId, employeeId])
  @@index([accountBookId, workDate])
  @@map("overtime_request")
}

/**
 * Info: (20260817 - Julian) 加班的加成分段。
 *
 * 一次 3 小時平日加班切成 [WEEKDAY_FIRST_2H, 120] 與 [WEEKDAY_BEYOND_2H, 60] 兩筆，
 * **不是一筆 180 分鐘**。合併的那一刻級距資訊就被銷毀，而 §32-1 的補休屆期折現
 * 要求「依當日工資計算標準發給」—— 屆時就算不出金額了。
 *
 * `engineVersion` 隨每筆落地，語意同 AttendanceDailyResult.engineVersion：
 * 規則改版後，舊資料仍能說明它當初是依哪一版算出來的。
 */
model OvertimeSegment {
  id String @id @default(uuid())

  overtimeRequestId String          @map("overtime_request_id")
  overtimeRequest   OvertimeRequest @relation(fields: [overtimeRequestId], references: [id], onDelete: Cascade)

  order Int
  tier  OvertimePremiumTier
  minutes Int

  engineVersion Int @map("engine_version")

  // Info: (20260817 - Julian) 反向關聯：選擇換補休時，本段會產生一筆 LeaveGrant（1:1，不乘倍率）
  grant LeaveGrant?

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([overtimeRequestId, order])
  @@map("overtime_segment")
}

/**
 * Info: (20260817 - Julian) 加班政策（帳本層級）。
 *
 * 放寬到 54 小時／三個月 138 小時的前提是「經工會同意，如事業單位無工會者，
 * 經勞資會議同意」(§32 III)。因此 extendedLimitAgreed 為真時
 * agreementRecordUrl 與 agreedAt **必填**，由 repository 不變式擋 ——
 * 一個沒有記載的「已同意」等於沒有同意，而系統會據此多放 8 小時。
 */
model OvertimePolicy {
  id String @id @default(uuid())

  // Info: (20260817 - Julian) 一個帳本一份政策
  accountBookId String      @unique @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  extendedLimitAgreed Boolean   @default(false) @map("extended_limit_agreed")
  agreementRecordUrl  String?   @map("agreement_record_url")
  agreedAt            DateTime? @map("agreed_at")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("overtime_policy")
}
```

### 5.3 既有 Model 的增補

**這些不是新表，是既有定義上的追加。** 貼入時合併到原本的 model，不要重複宣告 ——
`AccountBook` / `Employee` / `Department` 少了反向關聯，`prisma validate` 會對
每一個新關聯各報一次 `missing an opposite relation field`。

**AccountBook（在既有的簽到系統關聯區塊之後追加）**

```prisma
  // Info: (20260817 - Julian) 帳本對應的假勤 (Leave & Overtime) 資料
  leavePolicies           LeavePolicy[]
  leaveGrants             LeaveGrant[]
  leaveBalances           LeaveBalance[]
  leaveApprovalRules      LeaveApprovalRule[]
  leaveConcurrencyRules   LeaveConcurrencyRule[]
  leaveCashOutEvents      LeaveCashOutEvent[]
  overtimeRequests        OvertimeRequest[]
  overtimePolicy          OvertimePolicy?
```

**Employee（在既有的假勤關聯區塊之後追加）**

```prisma
  // Info: (20260817 - Julian) 假勤：額度、簽核、加班、折現
  leaveGrants              LeaveGrant[]              @relation("LeaveGrantEmployee")
  leaveBalances            LeaveBalance[]            @relation("LeaveBalanceEmployee")
  leaveLedgerActions       LeaveLedgerEntry[]        @relation("LeaveLedgerActor")
  leaveApprovalSteps       LeaveApprovalStep[]       @relation("LeaveApprovalStepApprover")
  leaveApprovalRuleSteps   LeaveApprovalRuleStep[]   @relation("LeaveApprovalRuleSpecific")
  leaveConcurrencyWarnings LeaveConcurrencyWarning[] @relation("LeaveConcurrencyWarningViewer")
  leaveCashOutEvents       LeaveCashOutEvent[]       @relation("LeaveCashOutEmployee")
  overtimeRequests         OvertimeRequest[]         @relation("OvertimeRequestEmployee")
```

**Department（追加）**

```prisma
  leaveConcurrencyRules LeaveConcurrencyRule[]
```

**LeaveRequest（重新設計，見計畫書 §14）**

```text
  - 移除 `leaveType LeaveType`，改為：
      leavePolicyId String      @map("leave_policy_id")
      leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Restrict)
  - 移除 `decidedByEmployeeId` / `decidedAt`（職責由 LeaveApprovalStep 承接，ADR 023 §8.1）
  - `reason` 改為 `reasonCipher`（ADR 018 Tier 2：事由會載明病名、家屬狀況、司法事由）
    並補 piiAlgorithm / piiKeyVersion，id 改由應用層 randomUUID() 產生（AAD 綁定需要）
  - 新增：
      totalMinutes      Int     @map("total_minutes")
      totalDays         Decimal @map("total_days")
      proofDocumentId   String? @map("proof_document_id")
      concurrencyWarned Boolean @default(false) @map("concurrency_warned")
      approvalSteps       LeaveApprovalStep[]
      concurrencyWarnings LeaveConcurrencyWarning[]
```

**LeaveDay（重新設計）**

```text
  - 新增：
      segment              LeaveDaySegment @default(FULL)
      startMinute          Int?            @map("start_minute")
      endMinute            Int?            @map("end_minute")
      minutes              Int             @map("minutes")
      dayEquivalentMinutes Int             @map("day_equivalent_minutes")
      ledgerEntries        LeaveLedgerEntry[]
  - `activeKey` 的 partial unique 手法**原樣保留**
```

**WorkDayType（既有 enum，補上出勤模組已登記的 ToDo）**

```prisma
  SUSPENDED // Info: (20260817 - Julian) 因雨／颱風／災害停工。加班級距判定依賴它與 HOLIDAY 分開
  ToDo: (20260817 - Julian) 停工日到工的加成標準待法務複核（計畫書 §8.1 #8）
```

**enum LeaveType（移除）**

```text
  7 個值降為 `LeavePolicy.code` 的 seed 初始列。相容期處置見計畫書 §14.3。
```

## 6. 額度引擎

### 6.1 純函數邊界

比照 `src/lib/attendance_rules.ts`，新增 `src/lib/leave_entitlement_rules.ts`：

```typescript
// Info: (20260817 - Julian) 額度引擎。純函數：無 DB、無 I/O、無 Date.now()。
// Info: (20260817 - Julian) 「現在」一律由呼叫端以參數傳入，否則同一份資料在不同時刻會得到不同結果，
// Info: (20260817 - Julian) 而額度是要拿去對帳的東西。
export const LEAVE_ENTITLEMENT_ENGINE_VERSION = 1;

// Info: (20260817 - Julian) 依年資與設定算出「到某個時點為止應該被授予哪些批次」
export function deriveGrantSchedule(input: IGrantScheduleInput): IPlannedGrant[];

// Info: (20260817 - Julian) 依 FIFO by expiresOn 決定一次扣減要動用哪些批次、各扣多少
export function allocateConsumption(input: IConsumptionInput): IAllocation[];

// Info: (20260817 - Julian) 把一段請假時間換算成分鐘（含最小單位捨入）
export function resolveLeaveMinutes(input: IUnitResolutionInput): number;
```

`deriveGrantSchedule` 是**冪等的**：給同一個員工、同一份設定、同一個時點，永遠算出同一組批次。Worker 每日重跑時以 `idempotencyKey = "grant:<employeeId>:<policyId>:<cycleStartDate>"` 擋重複入帳 —— 手法同 ADR 010 對攤銷引擎的處置（無狀態、可重算、以決定性雜湊冪等）。

### 6.2 §38 特休級距表（seed 資料，非程式碼）

| `minSeniorityMonths` | `days` | `incrementDaysPerYear` | `maxDays` |
|---|---|---|---|
| 6 | 3 | — | — |
| 12 | 7 | — | — |
| 24 | 10 | — | — |
| 36 | 14 | — | — |
| 60 | 15 | — | — |
| 120 | 16 | 1 | 30 |

> 120 個月（10 年）該列的 `days = 16`：§38 I ⑥ 為「十年以上者，每一年加給一日」，即滿 10 年當年為 15 + 1 = 16 日，其後每年再加 1 日至 30 日為止。⚠️ **此推導需法務複核**（§3.2）：條文的「每一年加給一日」究竟自滿 10 年當年起算或次年起算，實務上有不同見解，差一日。在複核完成前，seed 以 16 落地並在該列標 `// ToDo: (20260817 - Julian) 起算年待法務複核`。

### 6.3 週期與比例（D4）

```
到職日制：cycleStart = 到職日 + N 年
曆年制：  cycleStart = 該年 1/1
          首年比例  = (12/31 − 到職滿六個月之日 + 1) / 該年日數
          跨級距年 = 前段級距日數 × 前段占比 + 後段級距日數 × 後段占比
```

**護欄**：`compareCycleBasisEntitlement()`（純函數，`src/lib/leave_entitlement_rules.ts`）以**年資年度 × 重疊比例歸屬**比較兩制，service 端的 `assertCycleNotDisadvantageous` 依其結果 `throw AppError(VA_LEAVE_CYCLE_DISADVANTAGEOUS)`。

> **不是比累計總數。** 第一版寫成「到 `asOf` 為止兩制累計相比」，實作後發現那個定義沒有意義：週年制在週年日一次給整年份、曆年制在 1/1 一次給整年份，任意時點總有一方領先 —— 同一份設定在 2/28 判違法、3/1 判合法，那不是護欄是擲骰子。改以每一個完整年資年度為窗、兩制的每一筆授予都按「週期與窗的重疊天數 ÷ 週期總天數」歸屬，同一把尺量完，剩下的才是真正的多寡差異。
>
> **這條護欄一寫出來就擋下了上面那條比例公式**（§17 缺口 9）—— 它擋的不是一組壞資料，是一條寫錯的規則。

### 6.4 單位換算與捨入（D5）

```
unitMinutes =
  FIXED_MINUTES → policy.minimumUnitMinutes
  HALF_WORKDAY  → floor(shift.requiredWorkMinutes / 2)
  FULL_WORKDAY  → shift.requiredWorkMinutes

rawMinutes  = segment 對應的分鐘（FULL → requiredWorkMinutes；CUSTOM → end − start − 交集休息）
leaveMinutes = roundingMode === UP
             ? ceil(rawMinutes / unitMinutes) × unitMinutes
             : round(rawMinutes / unitMinutes) × unitMinutes
```

`HALF_WORKDAY` 遇上奇數分鐘的班別（例如 requiredWorkMinutes = 465）會產生 232 / 233 的不對稱。取 `floor` 並讓**下半天**吸收餘數，理由：上午段的邊界由 `coreStartMinute` 決定，是確定的；餘數放在確定的一端會讓上午的定義隨班別浮動。以 `leave_unit_boundary.test.ts` 釘住。

### 6.5 跨假別併計（⚠️ 待核對）

已知需要跨假別扣減的兩組：

- **家庭照顧假併入事假**（已查證）：請家庭照顧假時，同時扣減事假額度。
- **生理假逾一定日數併入病假**（⚠️ 待核對，§3.2）。

實作以 `LeavePolicy.mergesIntoPolicyId String?` 表達，`allocateConsumption` 在扣減主假別後對被併入的假別再產一筆 `CONSUME`。**在生理假的規則核對完成前，該欄位對生理假留空並在 UI 顯示「本假別的併計規則尚未設定」** —— 不猜一個數字填進去。

### 6.6 因應 115-01-01 修正的輸出

- `GET .../leave/statistics`：回傳每位員工「近 12 個月普通傷病假日數」與 `exceedsTenDays: boolean`，供人事考核端提示「未逾 10 日者不得為不利處分」。
- `LeaveCashOutEvent` 之外另增 `GET .../leave/attendance_bonus_deduction`：回傳按病假日數計的**比例基數**（日數與應出勤日數），供薪資模組按比例扣減全勤獎金。**同樣不回金額。**

---

## 7. 簽核流程

### 7.1 狀態機

```
       送出
DRAFT ──────▶ PENDING ──(每個節點依序)──▶ APPROVED ──▶ 扣額度 + 投影 EmployeeShiftDay
                 │                                            │
                 ├── 任一節點 REJECTED ──▶ REJECTED           └── 銷假徵詢（LeaveRecall，既有流程）
                 └── 申請人撤回 ──▶ WITHDRAWN
```

**沒有 `PARTIALLY_APPROVED`。** 理由與既有 `LeaveRequestStatus` 註解對 `RECALLED` 的處置相同：中間節點簽了不代表這張單處於一個新的狀態，那只是簽核鏈走到第幾格 —— 而那個事實已經在 `LeaveApprovalStep` 上。把它同時寫成單據狀態，就是把同一個事實存兩份。

### 7.2 需求範例的規則設定

| 規則 | `minDays` | `maxDays` | 節點序列 |
|---|---|---|---|
| 短假 | 0 | 3 | `DIRECT_MANAGER` |
| 長假 | 3 | — | `DIRECT_MANAGER` → `DEPARTMENT_MANAGER` → `HR` |

`minDays` 含下界、`maxDays` 不含上界（右開），`assertRuleRangesDisjoint` 保證區間不重疊且覆蓋 `[0, ∞)`。**「3 天內」與「3 天以上」的邊界歸屬**：需求原文的兩句在 3.0 天處重疊。本計畫定為 `[0, 3)` 與 `[3, ∞)`，即恰好 3 天走長假規則 —— 這是一個必須被明講的取捨，不能留給實作者猜。租戶可改。

### 7.3 通知

簽核與被通知不是同一件事。`LeaveApprovalStep` 進入 `PENDING` 時發通知，但**通知失敗不得阻斷簽核** —— 通知進既有的重試機制，達上限落 DLQ（CLAUDE.md §6）。

---

## 8. 加班引擎

### 8.1 切段規則表（`deriveOvertimeSegments`）

判定順序由上而下，第一個命中即決定該段級距。

| # | 當日 `WorkDayType` | 條件 | 級距 |
|---|---|---|---|
| 1 | 任意 | `isEmergency`（§32 IV 天災事變經報備） | `EMERGENCY_DOUBLE` |
| 2 | `HOLIDAY` | 經同意出勤 | `HOLIDAY_DOUBLE` |
| 3 | `REGULAR_OFF` | 經同意出勤 | `HOLIDAY_DOUBLE` ⚠️ 例假出勤的法定要件較嚴，見下 |
| 4 | `REST_DAY` | 當日累計 ≤ 120 分鐘 | `REST_DAY_FIRST_2H` |
| 5 | `REST_DAY` | 當日累計 > 120 分鐘 | `REST_DAY_BEYOND_2H` |
| 6 | `WORK` | 當日延長累計 ≤ 120 分鐘 | `WEEKDAY_FIRST_2H` |
| 7 | `WORK` | 當日延長累計 > 120 分鐘 | `WEEKDAY_BEYOND_2H` |
| 8 | `SUSPENDED` | — | ⚠️ 待核對（停工日到工的加成標準） |

一次加班跨越 #4/#5 或 #6/#7 邊界時，**切成兩段**，各自成為一筆 `OvertimeSegment`（D12 的補休分批入帳因此成立）。

> **#3 的誠實揭露**：例假日（`REGULAR_OFF`）依 §40 原則上不得使人工作，僅限天災、事變或突發事件，且須於 24 小時內通報主管機關並事後補假。本表把它對到 `HOLIDAY_DOUBLE` 只處理了「工資加倍」這一面，**沒有處理通報與補假義務**。⚠️ §40 未查證，里程碑 4 前必須補齊，否則系統會讓一個違法的排班看起來像一筆正常的加班。在補齊之前，`REGULAR_OFF` 的加班申請一律**擋下**並提示須由 HR 依 §40 程序處理。

### 8.2 上限護欄（Fail Fast）

`assertOvertimeLimits()` 在核准前檢查，任一不過即 `throw`：

| 限制 | 值 | 設定來源 |
|---|---|---|
| 單日正常 + 延長 | ≤ 12 小時 | 法定，不可設定 |
| 單月延長累計 | ≤ 46 小時；`extendedLimitAgreed` 為真時 ≤ 54 小時 | `OvertimePolicy.extendedLimitAgreed`（工會或勞資會議同意的記載） |
| 每三個月延長累計 | ≤ 138 小時（僅 `extendedLimitAgreed` 為真時適用） | 法定 |

`extendedLimitAgreed` 必須同時填 `agreementRecordUrl` 與 `agreedAt` —— 一個沒有記載的「已同意」等於沒有同意，而系統會據此多放 8 小時。

**三個月的區間定義**：⚠️ 待核對（滾動三個月或曆季）。在核對完成前，引擎以**滾動三個月**（較嚴）實作，並在 `OVERTIME_ENGINE_VERSION` 的註解標明此為保守選擇。

### 8.3 超時的處置與「加班報告書」（⚠️ 尚未實作，法源未核對）

**需求（2026-08-18 提出）**：加班超過上限時改為紅字提示、不阻擋，並提供填寫報告書的選項。

**現況**：`evaluateOvertimeLimits()` 硬擋，且**不看 `isEmergency`** —— 天災事變一樣受 12/46/54/138 小時的限制。而 `overtime_rules.ts` 的判定表註解寫著「`isEmergency`（§32 IV 天災事變**經報備**）→ EMERGENCY_DOUBLE」：**程式已經假設報備發生過，但系統裡沒有任何地方記錄它。** 那個旗標目前是一句沒有證據的宣稱。

**在動工之前必須先決定它是哪一種東西**，因為兩者的資料模型不同：

| | A：§32 IV 的合法性依據 | B：超限的例外核准紀錄 |
|---|---|---|
| 超時為何被允許 | 原因屬天災／事變／突發事件，法有明文 | **不被允許。它就是違法** |
| 報告書是什麼 | 法定通報的內容（受理機關、時限、格式皆為法定） | 公司內部的說明，不改變合法性 |
| 上限 | 對這一類放行 | 仍然超出，只是不擋 |
| 落地成什麼 | 掛在 `isEmergency` 上的通報紀錄 | 一筆**違規**紀錄，須出現在統計與勞檢報表 |
| 做錯的代價 | 把 B 當 A：系統對勞動檢查宣稱一件合法性，而它不成立 | 把 A 當 B：合法的天災加班被記成違規，統計失真且無法更正 |

**不阻擋這件事本身是對的**：事實已經發生，擋下來只會讓那段工時變成沒有紀錄的加班，而事實仍然留在 `AttendancePunch` 裡（同 ADR 024 §2.1 對未核准加班的論證）。但「不擋」與「合法」是兩件事，系統必須分得開。

**開工前要查證的清單**（在此之前不得寫入 constants，同 §3.2 的規矩）：

1. §32 IV 原文：延長工時的法定事由、通報時限、受理對象（工會／無工會者為當地主管機關）。
2. 該通報的法定書表格式與必填欄位。**欄位靠回憶重建是不可接受的** —— 一份欄位錯的報備書比沒有更糟，它會讓人以為已經報備了。
3. §32 IV 後段「事後補給勞工以適當之休息」的具體要求，以及它與 §32-1 補休的關係。
4. 若採 B，公司工作規則中對「例外核准」的既有規定。

**目前已做的**：加班簽核頁在被上限擋下時，紅字旁顯示一顆 **disabled** 的「填寫加班報告書」按鈕，標明尚未開放。刻意不改變阻擋行為 —— 那正是上表尚未決定的部分。

---

## 9. 假勤行事曆

### 9.1 它是投影，不是新的真相

行事曆的每一格都可以由 `EmployeeShiftDay` + `LeaveDay` + `OvertimeRequest` 算出來。**不新增任何儲存**，`GET .../leave/calendar` 為唯讀查詢，回傳扁平 DTO（比照 `IAttendanceRosterRow` 的理由：直接回 Prisma 實體等於讓 API 形狀跟著資料表漂移）。

### 9.2 可見範圍

| 觀看者 | 可見內容 |
|---|---|
| 本人 | 自己的全部：假別、事由、簽核進度 |
| 同部門同事 | 姓名 + **「已排休」**，**不顯示假別、不顯示事由** |
| 直屬主管 / 部門經理 | 直屬部屬的假別；事由僅在該單需其簽核時可見 |
| HR | 全部 |

**為什麼同事看不到假別**：病假、生理假、產假、安胎、家庭照顧假會直接揭露健康與生育狀況。行事曆的用途是「這週人手夠不夠」，而回答這個問題只需要知道「他不在」。多顯示的每一個欄位都是一次沒有必要的個資揭露 —— 依 ADR 018 的分級精神，最小揭露優先。

### 9.3 併休上限的呈現

超限的日期在行事曆上以獨立圖示標示，**但特休的送出按鈕不變灰**（D14）。滑入顯示「該日已有 N 人排休，超過部門上限 M 人；送出後主管可能與您協商調整」—— 用語必須是協商，不是拒絕。

---

## 10. API 清單

前綴 `/api/v1/user/account_book/[account_book_id]/hr/leave/`（加班為 `.../hr/overtime/`）。編號 L 系列，與出勤模組的 A1–A21 不衝突。

| # | 方法 | 路徑 | 用途 |
|---|---|---|---|
| L1 | GET | `policy` | 假別設定清單 |
| L2 | POST | `policy` | 新增自訂假別 |
| L3 | PUT | `policy/[policy_id]` | 修改假別設定 |
| L4 | DELETE | `policy/[policy_id]` | 停用假別（`isSystemDefined` 者拒絕刪除） |
| L5 | GET | `policy/[policy_id]/tier` | 年資級距表 |
| L6 | PUT | `policy/[policy_id]/tier` | 覆寫年資級距表（全量取代，非差異更新） |
| L7 | GET | `balance` | 我的（或指定員工的）各假別餘額 |
| L8 | GET | `balance/[employee_id]/ledger` | 額度異動明細（帳本） |
| L9 | POST | `balance/[employee_id]/adjust` | 人工調整額度（HR，須填理由） |
| L10 | GET | `request` | 假單清單（依角色過濾） |
| L11 | POST | `request` | 送出假單 |
| L12 | GET | `request/[request_id]` | 假單明細（含簽核鏈快照） |
| L13 | DELETE | `request/[request_id]` | 撤回假單 |
| L14 | POST | `request/[request_id]/approve` | 核准當前節點 |
| L15 | POST | `request/[request_id]/reject` | 駁回 |
| L16 | GET | `request/pending` | 待我簽核的假單 |
| L17 | POST | `request/preview` | 試算：這樣請會扣多少、餘額夠不夠、要簽幾關、有無併休超限 |
| L18 | GET | `calendar` | 假勤行事曆（部門 × 期間） |
| L19 | GET | `concurrency_rule` | 併休上限規則 |
| L20 | PUT | `concurrency_rule` | 設定併休上限 |
| L21 | GET | `statistics` | 假別統計（含 §6.6 的病假 10 日提示） |
| L22 | GET | `cash_out` | 待折現事件清單 |
| L23 | GET | `cash_out/export` | 待折現事件 CSV（薪資模組上線前的交棒） |
| L24 | GET | `../overtime/request` | 加班單清單 |
| L25 | POST | `../overtime/request` | 送出加班單（事前或事後） |
| L26 | POST | `../overtime/request/[id]/approve` | 核准加班單（同時決定認列分鐘與分段） |
| L27 | POST | `../overtime/request/[id]/reject` | 駁回加班單 |
| L28 | GET | `../overtime/summary` | 加班時數統計（月／季，含上限使用率） |
| L29 | GET | `../overtime/unapproved` | 有打卡但無核准加班單的時段（D9 的 `UNAPPROVED_OVERTIME`） |
| L30 | PUT | `../overtime/policy` | 加班政策（`extendedLimitAgreed` 與其記載） |

**L17 是本模組最重要的一支端點。** 需求說「員工可透過系統查看剩餘休假額度並送出申請」—— 若送出前看不到「這樣請會發生什麼」，員工就只能靠試錯，而每一次試錯都是一張要有人去駁回的單。L17 的回應是純計算、不寫入、不預扣。

**Route 層一律為純端口**（CLAUDE.md §1、`ledger_report_service_layer_refactor.md` 的結論）：`getIdentityFromDeWT` → `Schema.safeParse` → `service.method()` → `jsonOk`。授權收斂於 `AccountBookAccessGuard.assertMember` 與 `attendanceIdentityService.resolveEmployee`，**不在 route 內散寫**。

---

## 11. 錯誤碼

新增流水號自既有最大值起算（現況 `VA000046` / `FO000011` / `NF000023` / `CF000008`）：

| 常數 | 碼 | `ApiCode` | 語意 |
|---|---|---|---|
| `VA_LEAVE_INSUFFICIENT_BALANCE` | `VA000047` | `VALIDATION_ERROR` | 額度不足 |
| `VA_LEAVE_UNIT_NOT_ALIGNED` | `VA000048` | `VALIDATION_ERROR` | 請假時間不符最小單位 |
| `VA_LEAVE_ALREADY_REVIEWED` | `VA000049` | `VALIDATION_ERROR` | 該節點已簽核 |
| `VA_LEAVE_CYCLE_DISADVANTAGEOUS` | `VA000050` | `VALIDATION_ERROR` | 曆年制給假低於週年制（D4 護欄） |
| `VA_OVERTIME_EXCEEDS_DAILY_LIMIT` | `VA000051` | `VALIDATION_ERROR` | 逾單日 12 小時 |
| `VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT` | `VA000052` | `VALIDATION_ERROR` | 逾單月 46／54 小時 |
| `VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT` | `VA000053` | `VALIDATION_ERROR` | 逾三個月 138 小時 |
| `VA_OVERTIME_FILING_TYPE_MISMATCH` | `VA000054` | `VALIDATION_ERROR` | 事前／事後與時序不符（D10） |
| `VA_LEAVE_ON_NON_WORKING_DAY` | `VA000055` | `VALIDATION_ERROR` | 在沒有上班班別的日子請假：會扣額度卻不產生任何效果 |
| `FO_SELF_APPROVAL_FORBIDDEN` | `FO000014` | `FORBIDDEN` | 不得自我核准。**新增** —— 見下方說明 |
| `FO_NOT_AUTHORIZED_REVIEWER` | `FO000015` | `FORBIDDEN` | 非當前簽核節點不得代簽。**新增** |
| `FO_LEAVE_CALENDAR_SCOPE` | `FO000012` | `FORBIDDEN` | 逾越可見範圍（§9.2） |
| `FO_OVERTIME_ON_REGULAR_OFF` | `FO000013` | `FORBIDDEN` | 例假日加班須依 §40 程序（§8.1 #3） |
| `NF_LEAVE_POLICY` | `NF000024` | `NOT_FOUND` | 假別不存在或已停用 |
| `NF_LEAVE_GRANT` | `NF000025` | `NOT_FOUND` | 額度批次不存在 |
| `NF_OVERTIME_REQUEST` | `NF000026` | `NOT_FOUND` | 加班單不存在 |
| `NF_LEAVE_REQUEST` | `NF000027` | `NOT_FOUND` | 假單不存在或不屬於本帳本 |
| `CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED` | `CF000009` | `CONFLICT` | 簽核鏈展開為空（D7） |
| `CF_LEAVE_DAY_ALREADY_ACTIVE` | `CF000010` | `CONFLICT` | 同人同日已有生效假單（`activeKey` 撞擊） |
| `CF_LEAVE_CONCURRENCY_EXCEEDED` | `CF000011` | `CONFLICT` | 併休超限且該假別可硬擋（D14） |
| `CF_LEAVE_BALANCE_RACE` | `CF000012` | `CONFLICT` | 核准當下額度被他單先扣（D8） |

> `ApiCode` 與 `HTTP_MAP` 已於 2026-08-07 收斂為 `Record<ApiCode, number>`（見 `known_issues/api_http_status_dual_mapping.md`），新增錯誤碼不需再人工同步 HTTP 狀態。**新增 `ApiCode` 成員才需要。本模組不新增。**

---

## 12. 隱私與稽核（ADR 018 的延伸）

### 12.1 新的 PII 面

`HrPiiTable` 由 5 張增至 **7 張**，新增：

| 表 | 欄位 | 分級 | 理由 |
|---|---|---|---|
| `LeaveRequest` | `reasonCipher`（取代明文 `reason`） | **Tier 2 CONFIDENTIAL** | 請假事由會載明病名、家屬狀況、司法事由 |
| `LeaveRequest` | `proofDocumentId` 指向的檔案 | **Tier 2 CONFIDENTIAL** | 診斷證明、死亡證明、結婚證書 |
| `LeaveCashOutEvent` | — | Tier 3 INTERNAL | 只有分鐘與級距，無金額無事由 |

**假別本身（`leavePolicyId`）不加密**：它是複合查詢與統計的維度，加密後行事曆與統計端點都查不了。改以**可見範圍**控管（§9.2）—— 這與 `Employee.email` 「為複合唯一鍵成員，不加密」的取捨同型：不是所有敏感欄位都適合加密，有些該用授權控管。

AAD 綁定沿用 ADR 018 的格式：`LeaveRequest:{id}:reasonCipher:{keyVersion}`，因此 `LeaveRequest.id` **必須由應用層 `randomUUID()` 產生**，不可依賴 `@default(uuid())`。

### 12.2 稽核

`AuditLog` 新增 `LEAVE_REQUEST_REASON` 資源與 `READ` action，**僅在讀取完整事由明文時**觸發（比照 ADR 018 只對 Tier 1 完整值記錄的門檻，此處放寬到 Tier 2，因為事由的敏感度接近 Tier 1 而讀取頻率遠低）。

### 12.3 生理假的額外保護

性平法明定不得因請生理假而為不利對待。系統層面：

- 生理假在**所有統計端點預設排除**，需明示 `includeMenstrualLeave=true` 且該次查詢寫 `AuditLog`。
- 生理假不計入 §6.6 的「病假 10 日」提示基數（⚠️ 併計規則待核對，見 §6.5）。
- 簽核鏈預設為單節點且 `proofRequirement = NONE`。

---

## 13. 精度與時區

| 量 | 型別 | 理由 |
|---|---|---|
| 額度分鐘、請假分鐘、加班分鐘 | `Int` | 整數計數，非金融量。同出勤模組 §D8 |
| 授予日數 `grantedDays`、折現日數、`paidRatio` | `Prisma.Decimal` | 會直接乘上工資變成錢，適用 CLAUDE.md §2 |
| 加成倍率 | `{ numerator: Int, denominator: Int }` 常數 | 嚴禁 `1.333`（D11） |
| 日期 | `String "YYYY-MM-DD"` | 與 `AttendancePunch.workDate`、`EmployeeShiftDay.workDate` 同型別同語意 |
| 時刻 | `Int` 分鐘（0–2879） | 同 `ShiftPattern`，跨夜可表達 |

**時區**：沿用出勤模組的政策時區（Demo 期間為 `DEMO_TIME_ZONE` 常數，正式版為 `AttendancePolicy.timeZone`）。額度週期的「年度終結」是政策時區的 12/31 23:59:59，不是 UTC —— 差一個時區就差一天的特休，而那一天是要折現成錢的。

---

## 14. 遷移計畫：Demo 三表視為過渡

### 14.1 現況盤點

| 表 | 現況 | 處置 |
|---|---|---|
| `LeaveRequest` | Demo 版，`leaveType` 為 enum 欄位 | **重建**：`leaveType` → `leavePolicyId`，新增總量、證明、簽核鏈關聯 |
| `LeaveDay` | Demo 版，只有 `workDate` 與 `activeKey` | **重建**：新增 `segment` / `minutes` / `dayEquivalentMinutes` |
| `LeaveRecall` | Demo 版，三段式設計正確 | **保留**，僅隨 FK 調整 |
| `enum LeaveType`（Prisma 與 `src/constants/leave.ts`） | 7 個值 | **降為 seed 資料**：7 個值成為 `LeavePolicy.code` 的初始列 |
| `LEAVE_TYPE_I18N_KEY` | `Record<LeaveType, string>` | 改為 `LeavePolicy.code → i18n key`，自訂假別回退顯示 `name` |
| `EMPLOYEE_SCHEDULED_LEAVE_TYPES` | 寫死 `[ANNUAL]` | **刪除**，改讀 `LeavePolicy.recallable`（該常數的 ToDo 已預告此事） |

### 14.2 為什麼是「不遷移，重種」

現存假勤資料只在 Demo 帳本 `demo-book-public-works`（見 `attendance_demo_mock_data.md`），正式帳本尚無任何假單。寫一支 migration 去搬 12 個 Demo 員工的假單，換到的保證為零，卻要背一份日後沒人敢刪的遷移程式碼。

處置比照 E2E 資料的既有慣例（`e2e-book-` 前綴由 `export_phase2_db.ts` 過濾）：**Demo 帳本的假勤資料由 `seed_attendance_demo.ts` 重種**，不寫資料遷移。若日後有正式資料才需遷移，屆時的起點是本節而不是空白。

### 14.3 破壞性變更的相容期

`GET .../hr/attendance/leave`（A11 今日請假名單）在 Demo 期間已上線，其回應含 `leaveType: LeaveType`。改為 `leavePolicy: { code, name }` 是破壞性變更。處置：

- 里程碑 2 內回應**同時**帶 `leaveType`（由 `code` 反查，自訂假別回 `OTHER`）與 `leavePolicy`；
- 里程碑 5 移除 `leaveType`，並在移除的 commit 標 `// Deprecated: (20260817 - Julian) [start] LeaveType 相容欄位` … `// Deprecated: [end]`。

---

## 15. 里程碑

| # | 內容 | 交付判準 |
|---|---|---|
| **1** | 資料模型與設定 | `LeavePolicy` / `LeaveAccrualTier` 落地；seed 產出勞基法內建假別（僅 §3.1 已查證者）並通過 T23；`leave_policy_no_code_branching.test.ts`（T19）先於任何規則引擎程式碼存在；`WorkDayType.SUSPENDED` 補上；L1–L6 可用 |
| **2** | 額度引擎與帳本 | `leave_entitlement_rules.ts` 純函數 + 單元測試；`assertLeavePolicyUnit` / `assertGrantSource` 擋在 repository（T24、T25）；`LeaveGrant` / `LeaveLedgerEntry` / `LeaveBalance` 落地；每日勾稽 Worker；L7–L9 可用 |
| **3** | 請假與簽核 | 簽核鏈快照、SoD、`activeKey` 投影；`assertRuleRangesDisjoint`（T27）；`LeaveRequestService` 與 unit-of-work repository（T8、T28）；L10–L17 可用；A11 進入相容期 |
| **4** | 加班 | `overtime_rules.ts` 純函數 + 上限護欄；`assertOvertimeFilingType`（T26）；補休分批入帳；L24–L30 可用 |
| **5** | 行事曆與併休 | L18–L20；可見範圍分級；移除 `leaveType` 相容欄位 |
| **6** | 折現與交棒 | `LeaveCashOutEvent`；年度終結 Worker；§6.6 的 115-01-01 輸出；L21–L23 |
| **7** | 法務複核與收斂 | §3.2 所有 ⚠️ 逐項結案；`ToDo:` 清空（CLAUDE.md §4：Release 前必須全數清空） |

**里程碑 7 不是可選的。** 本文件目前有 8 個 ⚠️ 待核對項，其中 3 個（施行細則 §24、生理假併計、§40 例假出勤）直接決定程式行為。在它們結案之前，本模組不得標記為 Production Ready。

---

## 16. 測試矩陣

| # | 檔案 | 覆蓋 |
|---|---|---|
| T1 | `leave_entitlement_rules.test.ts` | §38 六個級距的邊界（滿 6 月前一日／當日、滿 10 年、封頂 30 日） |
| T2 | `leave_cycle_basis.test.ts` | 到職日制 vs 曆年制；首年比例；跨級距年度 |
| T3 | `leave_cycle_guard.test.ts` | D4 護欄：曆年制低於週年制必 `throw` |
| T4 | `leave_unit_boundary.test.ts` | 半小時／半天／整天；奇數 `requiredWorkMinutes`；`UP` 與 `NEAREST` |
| T5 | `leave_allocation_fifo.test.ts` | FIFO by `expiresOn`；同到期日以 `createdAt` 為序；跨批次扣減 |
| T6 | `leave_ledger_conservation.test.ts` | `Σ(deltaMinutes) === LeaveBalance.remainingMinutes`；`rebuildLeaveBalance` 冪等 |
| T7 | `leave_ledger_idempotency.test.ts` | 同 `idempotencyKey` 重跑不重複入帳 |
| T8 | `leave_approval_chain.test.ts` | 規則展開；相鄰去重；`escalatedReason`；空鏈必 `throw`（D7） |
| T9 | `leave_approval_sod.test.ts` | 四條 SoD；`pendingKey` 唯一性 |
| T10 | `leave_balance_race.test.ts` | D8：兩單併發核准，第二單以 `count === 0` 判輸 |
| T11 | `leave_projection.test.ts` | 核准投影 `dayType = LEAVE`；駁回不投影；銷假投影回 `WORK` + 班別 |
| T12 | `overtime_rules.test.ts` | §8.1 切段表逐條；跨 120 分鐘邊界切兩段 |
| T13 | `overtime_limits.test.ts` | 12h／46h／54h／138h；`extendedLimitAgreed` 未附記載時退回 46h |
| T14 | `overtime_recognition.test.ts` | D9：核准 ∩ 事實取小；無打卡走 `MANUAL_DECLARATION` |
| T15 | `overtime_to_comp_leave.test.ts` | D12：一段一筆 grant；1:1 不乘倍率；級距隨批次保留 |
| T16 | `leave_calendar_scope.test.ts` | §9.2 四種角色的可見欄位；同事看不到假別 |
| T17 | `leave_concurrency.test.ts` | D14：特休只警示不擋；`employerMayReject` 為真才硬擋 |
| T18 | `leave_pii_invariant.test.ts` | `reasonCipher` 三組合檢查；AAD 綁定；`randomUUID()` 而非 `@default(uuid())` |
| T19 | `leave_policy_no_code_branching.test.ts` | 靜態檢查：規則引擎未對 `LeavePolicy.code` 做 if/switch（D1） |
| T20 | `hr_enum_mirror.test.ts`（既有，擴充） | §5.1 新增 enum 全數登記 |
| T21 | `leave_i18n_keys.test.ts` | 五語系（en/ja/ko/zh_cn/zh_tw）key 齊備；比照 `attendance_i18n_keys.test.ts` |
| T22 | `leave_cash_out.test.ts` | 年度終結、遞延屆期、補休屆期、契約終止四條路徑；事件無金額欄位；`cashOutOnExpiry` 為真時必先產事件再 `EXPIRE`（ADR 022 §8.5） |
| T23 | `leave_seed_integrity.test.ts` | 每個帳本都有完整的內建假別；`isSystemDefined` 者不可刪除；seed 只落地 §3.1 已查證的數字（ADR 021 §5） |
| T24 | `leave_policy_invariant.test.ts` | `assertLeavePolicyUnit`：單位基準與分鐘數的雙向約束、能否整除 60、年資級距不得帶固定日數、不限額度不得標折現、自我併計 |
| T25 | `leave_grant_invariant.test.ts` | `assertGrantSource`：來源與 `overtimeSegmentId` 雙向、§32-1 的 1:1、`grantedMinutes` 可驗算、到期日不得早於週期結束 |
| T26 | `overtime_request_invariant.test.ts` | `assertOvertimeFilingType`：事前／事後與送出時點、已核准必須說得出分鐘數、認列不得超過核准 |
| T27 | `leave_approval_rule_invariant.test.ts` | `assertRuleRangesDisjoint`：自 0 起、首尾相接、末段無上界；錯誤訊息分得出「重疊」與「有洞」 |
| T28 | `leave_request_service.test.ts` | 送出→簽核→扣額度的編排：試算與送出算出同一組數字、不預扣、四條 SoD、中間節點不扣額度、最後一關前置檢查、`BALANCE_RACE` 與 `ALREADY_REVIEWED` 分流 |
| T29 | `leave_error_codes.test.ts` | 模組引用的 21 個錯誤碼皆存在、家族正確、代碼全域不重複。**在 `tsc --noEmit` 跑不動的期間補位**（schema 未套用前整包型別檢查起不來，而那正是漏掉不存在常數的窗口） |

**T6 與 T19 是本模組的兩條紅線**：前者保證帳本沒有說謊，後者保證假別真的可設定而不是假裝可設定。

---

## 17. 已知缺口

| # | 缺口 | 影響 | 處置 |
|---|---|---|---|
| 1 | §3.2 的 8 個 ⚠️ 待核對 | 3 個直接決定程式行為 | 里程碑 7；未結案前不得 Production Ready |
| 2 | 薪資模組尚未存在 | 所有折現只到事件為止；「基準時薪」無來源 | 同 ADR 020 的處置：留明確接口，不猜 |
| 3 | `Employee` 無「是否保留舊制年資」 | 與 ADR 020 同一個缺口；特休年資起算若涉及事業單位改組會失準 | 沿用 ADR 020 的待辦，不在本模組重複開 |
| 4 | 代理人機制未做 | 主管出差時簽核卡住 | 里程碑 3 後評估；暫以 `SPECIFIC_EMPLOYEE` 節點手動繞行 |
| 5 | 假別證明文件的保存期限未定 | 與 ADR 018 對打卡座標的待辦同型 | 併入 ADR 018 的保存期限議題一併處理 |
| 6 | 行事曆未含加班 | 「誰在加班」與「誰在放假」是同一個營運問題的兩面 | 里程碑 5 evaluate；不影響本期交付 |
| 7 | `deriveGrantSchedule` 對「年中到職且年中離職」未定義 | 離職當年的比例給假 | T2 的邊界案例，里程碑 2 補 |
| 8 | **四種假別的日數或工資取決於「事件屬性」，`LeavePolicy` 只有單一 `annualDays` 與單一 `paidRatio`** | 喪假（親等 8/6/3 日）、產假（工資依年資滿六個月與否）、流產假（妊娠週數 4 星期／1 星期／5 日）、普通傷病假（住院與未住院上限不同、二年內另有合計上限） | 暫以 `accrualMethod = PER_EVENT` + `annualDays = null`，實際日數由 HR 於授予時輸入並記於 `LeaveGrant.reason`。**正解是把 `LeaveAccrualTier` 從「年資月數」推廣成通用的分級維度**；在推廣之前不得硬填一個數字 —— 填 8 日的喪假會讓祖父母喪假多給兩日，那不是保守而是錯誤。里程碑 2 決定是否推廣 |
| 9 | **§6.3 的曆年制比例公式方向錯了** | 實作 `compareCycleBasisEntitlement` 後實測：一個 3/1 到職的人，週年制在 9/1 拿到法定 3 日，曆年制按「該年剩餘天數占比」只給 3 × 122/365 ≈ 1.1 日 —— 第一個年資年度就低於法定標準，而護欄會擋下**所有**曆年制設定 | 曆年制的實務作法是「把未來的年資額度**提前**給」，不是「把當期法定額度按比例砍掉」。公式須改為「不低於同期週年制法定日數」的下界形式。⚠️ 待法務確認函釋依據後修正，`leave_cycle_guard.test.ts` 已把現況釘成一條會紅的斷言，修正後改斷言而非刪測試 |
| 10 | **`LeaveProofRequirement` 沒有「一律要求證明」這個值** | 公傷病假要職災認定文件、產假要診斷證明、婚假要結婚證書、喪假要訃聞 —— 這四種**與請假日數無關**，但 enum 只有 `NONE` / `OPTIONAL` / `REQUIRED_OVER_THRESHOLD` 三個值 | 這五個假別（含普通傷病假）原本標 `REQUIRED_OVER_THRESHOLD`，而 `ILeavePolicySeed` **當時根本沒有門檻欄位** —— 五列全部帶著 `proofThresholdDays = null` 落地且不報錯。已補 `proofThresholdDays` 欄位與雙向不變式（`REQUIRED_OVER_THRESHOLD ⇔ 門檻非 null 且 > 0`），並把五個假別**暫降為 `OPTIONAL`**。<br>⚠️ 降級是為了不在法規欄位上寫一個猜的數字，**不是**主張證明可有可無。<br>不變式**刻意不接受門檻 = 0**：那讀起來是「一律要求」，放行它等於用門檻欄位偷渡一個缺失的 enum 值，缺口從此不會有人再提。正解是新增 `LeaveProofRequirement.REQUIRED`，里程碑 2 決定 |
| 11 | **`proofThresholdDays` 是公司政策，不是法定數字** | 勞工請假規則 §10 只說「雇主得要求勞工提出有關證明文件」，未訂日數門檻 | 內建 seed 一律為 null，由租戶在假別設定畫面自行填寫。**本模組不得提供「內建預設門檻」** —— 一個看起來像查證過的數字比空白更難被質疑 |

---

## 18. 待抽出的 ADR

本計畫的四項決策屬不可逆的架構取捨，抽為獨立 ADR：

| ADR | 標題 | 對應決策 |
|---|---|---|
| **021** | 假別規則資料化與給假週期制度 | D1、D4、D5 |
| **022** | 假勤額度採 append-only 帳本與批次授予 | D2、D3、D12 的扣減順序 |
| **023** | 簽核鏈快照與多級簽核的職責分離 | D6、D7、D8 |
| **024** | 加班的事實認列、加成分段與模組邊界 | D9、D10、D11、D12、D13 |

D14（併休上限只對特休警示）刻意**不抽 ADR**：它不是架構取捨，是法遵判斷，其正確性完全繫於 §38 II 的解釋。留在本計畫書 §4 與 §9.3，隨法務複核一併確認。

---

---

## 19. 套用步驟與驗證

### 19.0 套用順序

1. §5.2 的完整定義 → 貼入 `prisma/schema.prisma` 末端
2. 依 §5.3 修改 `AccountBook` / `Employee` / `Department` / `LeaveRequest` / `LeaveDay` / `WorkDayType`
3. `npx prisma format && npx prisma validate`
4. `src/constants/leave_policy.ts`、`src/constants/overtime.ts` 放入
5. 套用 §19.1–§19.3 的三個增補（`hr_enum_mirror.test.ts`、`hr_pii.ts`、`error_dictionary.ts`）
6. `npx tsc --noEmit && npx eslint src/constants`

> **驗證狀態**：步驟 1–3 完成後的合併 schema 已以 `@prisma/prisma-schema-wasm`
> 的 `validate()` 實測通過（2026-08-17）。步驟 4 的兩個常數檔已通過
> `tsc --noEmit --strict`（無 `any`、無隱含 any）。

---

### 19.1 `src/__tests__/hr_enum_mirror.test.ts`

#### 19.1.1 匯入與模組登記

```typescript
import * as LeavePolicyConstants from "@/constants/leave_policy";
import * as OvertimeConstants from "@/constants/overtime";
```

```typescript
const CONSTANT_MODULES: Record<string, Record<string, unknown>> = {
  "hr_management.ts": HrConstants,
  "attendance.ts": AttendanceConstants,
  "leave.ts": LeaveConstants,
  // Info: (20260817 - Julian) 假勤模組
  "leave_policy.ts": LeavePolicyConstants,
  "overtime.ts": OvertimeConstants,
};
```

#### 19.1.2 `MIRRORED` 增補（18 個）

```typescript
  // Info: (20260817 - Julian) 假勤：假別設定與額度帳本
  LeaveAccrualMethod: LeavePolicyConstants.LeaveAccrualMethod,
  LeaveCycleBasis: LeavePolicyConstants.LeaveCycleBasis,
  LeaveUnitBasis: LeavePolicyConstants.LeaveUnitBasis,
  LeaveRoundingMode: LeavePolicyConstants.LeaveRoundingMode,
  LeaveQuotaMode: LeavePolicyConstants.LeaveQuotaMode,
  LeaveProofRequirement: LeavePolicyConstants.LeaveProofRequirement,
  LeaveGrantSource: LeavePolicyConstants.LeaveGrantSource,
  LeaveLedgerEntryType: LeavePolicyConstants.LeaveLedgerEntryType,
  LeaveApprovalNodeKind: LeavePolicyConstants.LeaveApprovalNodeKind,
  LeaveApprovalStepStatus: LeavePolicyConstants.LeaveApprovalStepStatus,
  LeaveDaySegment: LeavePolicyConstants.LeaveDaySegment,
  LeaveCashOutReason: LeavePolicyConstants.LeaveCashOutReason,
  LeaveConcurrencyAction: LeavePolicyConstants.LeaveConcurrencyAction,

  // Info: (20260817 - Julian) 假勤：加班
  OvertimeFilingType: OvertimeConstants.OvertimeFilingType,
  OvertimeCompensationMode: OvertimeConstants.OvertimeCompensationMode,
  OvertimeEvidenceBasis: OvertimeConstants.OvertimeEvidenceBasis,
  OvertimePremiumTier: OvertimeConstants.OvertimePremiumTier,
  OvertimeRequestStatus: OvertimeConstants.OvertimeRequestStatus,
```

#### 19.1.3 `UI_ONLY` 增補（2 個）

```typescript
  /**
   * Info: (20260817 - Julian) 假勤的兩個衍生 enum：
   * `LeaveBalanceHealth` 是每日勾稽的輸出，`OvertimeExceptionType` 由打卡與加班單
   * 比對推導。兩者都不落地，若不明列會被覆蓋率檢查報成「漏了鏡像」。
   */
  "LeaveBalanceHealth",
  "OvertimeExceptionType",
```

> **同步移除**：`enum LeaveType` 依 ADR 021 降為 seed 資料後，
> `MIRRORED` 的 `LeaveType` 一併移除（`LeaveRequestStatus` / `LeaveRecallStatus` 保留）。
>
> **實際執行時機提前到套用 schema 的當下**（2026-08-17），不是原訂的里程碑 5。
> 理由是它不可分割：`enum LeaveType` 一旦從 schema 移除，所有引用它的 TS 就全部
> 編譯失敗；留著它到里程碑 5 則等於同時存在兩套假別來源，而 §19.5 的清單顯示
> 引用點只有 8 處 —— 分兩次做的成本高於一次做完。

---

### 19.2 `src/constants/hr_pii.ts`

#### 19.2.1 `HrPiiTable` 增補（5 張 → 6 張）

```typescript
export enum HrPiiTable {
  EMPLOYEE = "Employee",
  DEPENDENT = "Dependent",
  BANK_ACCOUNT = "BankAccount",
  EMERGENCY_CONTACT = "EmergencyContact",
  ATTENDANCE_PUNCH = "AttendancePunch",
  /**
   * Info: (20260817 - Julian) 假單的請假事由。病名、家屬狀況、司法事由都寫在這裡，
   * 敏感度與 `EmergencyContact.altPhoneCipher` 同級（ADR 018 Tier 2）。
   *
   * 假別本身（`leavePolicyId`）**不加密** —— 它是行事曆與統計的查詢維度，
   * 加密後兩者都查不了。改以可見範圍控管（計畫書 §9.2）：
   * 同部門同事只看得到「已排休」，看不到假別。
   * 取捨同 `Employee.email`「為複合唯一鍵成員，不加密」。
   */
  LEAVE_REQUEST = "LeaveRequest",
}
```

#### 19.2.2 `HR_PII_FIELD_TIER` 增補

```typescript
  /**
   * Info: (20260817 - Julian) LeaveRequest —— 請假事由。
   * AAD 綁定 `LeaveRequest:{id}:reasonCipher:{keyVersion}`，
   * 因此 `LeaveRequest.id` **必須由應用層 randomUUID() 產生**，
   * 不可依賴 Prisma 的 `@default(uuid())`（同 AttendancePunch 的處置）。
   */
  reasonCipher: PiiTier.CONFIDENTIAL,
```

#### 19.2.3 `hr_pii_invariant.ts` 巡覽清單

`LeaveRequest` 加入金鑰輪替與不變式檢查的巡覽清單（4 張 → 5 張 → 本次 6 張），
三組合檢查照舊：有密文無版本、有密文無演算法、無密文卻標版本。

> **注意**：`Employee` / `EmergencyContact` / `BankAccount` 的 `piiKeyVersion`
> 是 NOT NULL（ADR 018 的結論：raw SQL 的輪替腳本繞過 TS 守衛，只有 NOT NULL 攔得住）。
> `LeaveRequest.reasonCipher` 為必填（事由非空），故 `piiKeyVersion` 同樣設 NOT NULL。

---

### 19.3 `src/lib/utils/error_dictionary.ts`

流水號自既有最大值起算（實測 `VA000046` / `FO000011` / `NF000023` / `CF000008`）。
**不新增 `ApiCode` 成員**，故 `HTTP_MAP` 不需改動
（`httpStatusOf()` 已於 2026-08-07 收斂為讀 `HTTP_MAP`，見 `known_issues/api_http_status_dual_mapping.md`）。

```typescript
  // Info: (20260817 - Julian) ===== 假勤模組 =====

  // Info: (20260817 - Julian) 額度不足。送出時即回饋，但**不預扣**——扣減發生在最後一關通過的交易內（ADR 023 §6）
  VA_LEAVE_INSUFFICIENT_BALANCE: {
    code: "VA000047",
    message: "Insufficient leave balance",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 請假時間不符該假別的最小單位（半小時／半天／整天）
  VA_LEAVE_UNIT_NOT_ALIGNED: {
    code: "VA000048",
    message: "Leave duration does not align with the minimum unit",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 該簽核節點已被決定。同 VA_REQUEST_ALREADY_REVIEWED 的語意，對象換成假單
  VA_LEAVE_ALREADY_REVIEWED: {
    code: "VA000049",
    message: "This approval step has already been decided",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 曆年制給假低於週年制同期應有（ADR 021 §3.1）。
   * 這條護欄的性質與財務的 A = L + E 相同：越過它代表設定有錯，不是需要人判斷的警示。
   */
  VA_LEAVE_CYCLE_DISADVANTAGEOUS: {
    code: "VA000050",
    message:
      "Calendar-year accrual grants fewer days than the anniversary basis",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾單日 12 小時（勞動基準法 §32 II）
  VA_OVERTIME_EXCEEDS_DAILY_LIMIT: {
    code: "VA000051",
    message: "Overtime exceeds the statutory 12-hour daily total",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾單月 46 小時；帳本已記載工會或勞資會議同意者為 54 小時（§32 II、III）
  VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT: {
    code: "VA000052",
    message: "Overtime exceeds the statutory monthly limit",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾三個月 138 小時（§32 III）。區間定義暫採滾動三個月（較嚴）
  VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT: {
    code: "VA000053",
    message: "Overtime exceeds the statutory three-month limit",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 事前／事後與時序不符。「事前申請卻在下班後才送出」不是一種可選的填法，是一個謊
  VA_OVERTIME_FILING_TYPE_MISMATCH: {
    code: "VA000054",
    message: "Filing type contradicts the submission time",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾越行事曆的可見範圍（計畫書 §9.2）
  FO_LEAVE_CALENDAR_SCOPE: {
    code: "FO000012",
    message: "You may not view this scope of the leave calendar",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 例假日加班須依勞動基準法 §40 程序（天災事變或突發事件、
   * 24 小時內通報主管機關、事後補假）。系統尚未實作通報與補假，故一律擋下 ——
   * 放行會讓一個違法的排班看起來像一筆正常的加班（ADR 024 §4.5）。
   */
  FO_OVERTIME_ON_REGULAR_OFF: {
    code: "FO000013",
    message: "Overtime on a statutory rest day requires the §40 procedure",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  // Info: (20260817 - Julian) 假別不存在或已停用
  NF_LEAVE_POLICY: {
    code: "NF000024",
    message: "Leave policy not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260817 - Julian) 額度批次不存在
  NF_LEAVE_GRANT: {
    code: "NF000025",
    message: "Leave grant not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260817 - Julian) 加班單不存在
  NF_OVERTIME_REQUEST: {
    code: "NF000026",
    message: "Overtime request not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 簽核鏈展開為空（ADR 023 §3）。
   * **不自動核准** —— 那會讓一個設定缺口靜默地變成一張看起來正常的生效假單。
   * 訊息須指出缺什麼（沒有主管／部門沒有經理／帳本沒有 HR），因為解法在 HR 手上不在員工手上。
   */
  CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED: {
    code: "CF000009",
    message: "No approver could be resolved for this request",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260817 - Julian) 同人同日已有生效假單（LeaveDay.activeKey 撞擊）
  CF_LEAVE_DAY_ALREADY_ACTIVE: {
    code: "CF000010",
    message: "An active leave already exists for this employee on this date",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260817 - Julian) 併休超限且該假別可硬擋（employerMayReject = true）。特休永遠走不到這裡
  CF_LEAVE_CONCURRENCY_EXCEEDED: {
    code: "CF000011",
    message: "Too many concurrent leaves in this department",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260817 - Julian) 核准當下額度被他單先扣（ADR 023 §6.4 的 updateMany count === 0）
  CF_LEAVE_BALANCE_RACE: {
    code: "CF000012",
    message: "Leave balance was consumed by another request",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
```

**沿用既有、不新增**：`NF_EMPLOYEE`、`NF_SHIFT_PATTERN`、`VA_INVALID_INPUT_DATA`、`IS_DB_FAILED`。

> **更正（2026-08-17）**：本節第一版把 `FO_SELF_APPROVAL_FORBIDDEN` 與
> `FO_NOT_AUTHORIZED_REVIEWER` 列為「沿用既有」。**錯的。** 它們被出勤模組
> 計畫書 §D9 點名過，但補登單從未實作，因此從來沒有被建立。
> `API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN` 是 `undefined`，
> `new AppError(undefined)` 丟出來的是 `TypeError` 而非 `AppError` ——
> 呼叫端拿到 500，而真正的原因是一個不存在的常數。
> 現已新增為 `FO000014` / `FO000015`，並由 `leave_error_codes.test.ts`（T29）
> 釘住「模組引用的每一個錯誤碼都真的存在」。

---

### 19.4 套用後的驗證清單

| # | 指令 | 預期 |
|---|---|---|
| 1 | `npx prisma validate` | OK（已實測合併後可通過） |
| 2 | `npx prisma format` | 無 diff（草案已按 Prisma 格式排版） |
| 3 | `npx tsc --noEmit` | 無錯誤 |
| 4 | `npx eslint src/constants` | 無警告 |
| 5 | `npm test -- hr_enum_mirror` | 通過（新 enum 全數登記後） |
| 6 | `npx prisma db push` | schema 同步進 DB（**不是** `migrate dev`，見下） |

> **本專案沒有 `prisma/migrations/`，工作流是 `db push` 而不是 `migrate dev`。**
> 在一個有資料但沒有 migration 歷史的 DB 上跑 `migrate dev`，Prisma 會要求 baseline
> 或直接提議 reset —— 比它要解決的問題更麻煩。（本表第 6 步原本寫的是 `migrate dev`，
> 已於 2026-08-17 更正。）
>
> **步驟 6 之前先確認**：`LeaveRequest` / `LeaveDay` 的重新設計會**丟失 Demo 資料**。
> 依計畫書 §14.2「不遷移，重種」—— 現存假勤資料只在 Demo 帳本
> `demo-book-public-works`，由 `seed_attendance_demo.ts` 重種即可，不寫資料遷移。
>
> **實測（2026-08-17）**：直接 `db push` 會因七個必填欄位撞上既有列而中止。
> 那些列就是 `TODAY_LEAVE` 的兩張假單（`leave_request` 2 列、`leave_day` 2 列），
> 先刪再 push 即可，**不需要 `--force-reset`**：
>
> ```bash
> npx prisma db execute --schema prisma/schema.prisma --stdin <<'"'"'SQL'"'"'
> DELETE FROM leave_request WHERE account_book_id = '"'"'demo-book-public-works'"'"';
> SQL
> npx prisma db push
> npx tsx scripts/seed/seed_attendance_demo.ts
> ```
>
> 最後一步不可省略：`employee_shift_day` 尚有兩列被投影成 `LEAVE`，
> 假單刪除後會成為孤兒投影 —— **不違反任何約束，所以不會報錯**，
> 但現場頁會出現「有人在放假卻查不到是誰」。`clearDemoData()` 會一併洗掉。

---

### 19.5 實際套用紀錄（2026-08-17）

schema 已套用並通過 `@prisma/prisma-schema-wasm` 的 `validate()`
（42 enum / 98 model）。**§19.1–§19.3 三個增補之外，還有 8 處程式碼被連帶影響** ——
它們不在原本的套用步驟裡，因為當時只盤點了「新增什麼」而沒有盤點
「移除 `enum LeaveType` 會打到誰」。列在這裡，是為了讓下一次移除 enum 時
知道要往哪些方向找。

| # | 檔案 | 改動 | 找到它的方式 |
|---|---|---|---|
| 1 | `src/constants/leave.ts` | 移除 `LeaveType`、`LEAVE_TYPE_I18N_KEY`、`EMPLOYEE_SCHEDULED_LEAVE_TYPES` | grep |
| 2 | `src/constants/attendance.ts` | `WorkDayType += SUSPENDED`，並補上三處 `Record<WorkDayType, …>` 的窮舉 | **tsc**（三個 exhaustive record 直接紅） |
| 3 | `src/interfaces/leave.ts` | `ILeaveTodayEntry` 的 `leaveType`/`reason` → `onLeave: true`；`ILeaveRecallView.leaveType` → `leavePolicyCode` + `leavePolicyName` | 設計決定（見下） |
| 4 | `src/repositories/leave.repo.ts` | 兩個 include 加上 `leavePolicy: { select: { code, name } }` | tsc |
| 5 | `src/services/leave.service.ts` | `toTodayEntry` / `toRecallView` 兩個投影函式 | tsc |
| 6 | `src/components/…/leave_today_panel.tsx` | 不再顯示假別 | tsc |
| 7 | `src/i18n/locales/{5 語系}/hr_management.ts` | `type_*`（7 個）→ `policy_*`（13 個）；新增 `day_type_suspended` 與其縮寫、`leave_on_leave` | `attendance_i18n_keys.test.ts` |
| 8 | `scripts/seed/seed_attendance_demo.ts` | 先種 13 個 `LeavePolicy`；假單改掛 policy、事由密文入庫、逐日固化總量、簽核以 `LeaveApprovalStep` 落地；停工日改用 `SUSPENDED` | tsc |

**三件由這次連帶改動觸發、且不是機械替換的決定：**

1. **`ILeaveTodayEntry` 不再回傳假別與事由。** A11「今日請假名單」對全體員工開放，
   而病假、生理假、產假、家庭照顧假會直接揭露健康與生育狀況（ADR 018 Tier 2）。
   這支端點要回答的是「這週人手夠不夠」，那個問題只需要「他不在」。
   附帶好處是這條路徑從此不需要解密 `reasonCipher`。
   主管在銷假徵詢畫面（A12）仍看得到假別 —— 那是他要做判斷的依據。
2. **`LeavePolicy.paidRatio` 改為 nullable**（§5.2 已更新）。`DEFAULT_LEAVE_POLICY_SEED`
   的產假 `paidRatio` 是 `null`（受僱滿六個月與否給付不同），而原本的欄位是
   `NOT NULL @default(1)` —— seed 會把「要看年資」靜默寫成「工資照給」。
   這是**種子資料與 schema 對不起來**，不是格式問題：一個偏向雇主的預設值。
3. **`WorkDayType.SUSPENDED` 補進排班面板的可選項。** `OFF_DAY_TYPES` 是手寫陣列，
   型別 `Exclude<WorkDayType, WORK>` 少一個成員不會被編譯器擋下來；不補的話
   SUSPENDED 只有種子腳本進得去。（批次套用整個工地仍是待辦。）

**四個 `hr_enum_mirror.test.ts` 的收穫**：它擋下了 `WorkDayType` 鏡像漏掉
`SUSPENDED`（原本只會在演示當天看到方格圖才發現）；也逼出一個判準修正 ——
`LEAVE_POLICY_CODE` 滿足 `key === value` 而被誤判成鏡像，現以命名慣例
（SCREAMING_SNAKE 不可能是 Prisma enum 的鏡像）排除，而不是再開一張登記表。

> **尚未完成**：`npx prisma generate` 與 `npx prisma migrate dev` 需在 macOS 端執行
> （本機環境的 `binaries.prisma.sh` 被封鎖）。在 generate 之前
> `tsc --noEmit` 有 42 個錯誤，**全部**是「新 model / 新 enum 成員不存在於
> `src/generated`」這一類，generate 後應歸零。

---

> **延伸閱讀**：[出勤模組開發計畫書](time_attendance_module_plan.md)（本模組的資料流上游）、[Demo 開發計畫書 §5 踩雷紀錄](attendance_demo_plan.md)（29 條實作教訓，本計畫多處引用）、[CLAUDE.md](../../CLAUDE.md)（架構鐵律）
