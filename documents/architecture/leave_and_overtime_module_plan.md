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
| `LeaveCycleBasis` | `HIRE_ANNIVERSARY` / `CALENDAR_YEAR` | MIRRORED |
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

`WorkDayType` 需新增 `SUSPENDED`（因雨／颱風／災害停工）—— 出勤模組既有 ToDo，本模組的加班級距判定依賴 `WorkDayType` 的正確性（停工日到工的加成與國定假日不同），因此在本模組的里程碑 1 一併補上。

### 5.2 新增 Model（草案）

以下為 `prisma/schema.prisma` 的增補草案，註解依 CLAUDE.md §4 格式。**欄位以外的租戶隔離慣例一律沿用**：`accountBookId` 為 Root Node、`@@unique([accountBookId, code])`、`@@index([accountBookId])`。

```prisma
/**
 * Info: (20260817 - Julian) 假別設定。取代 Demo 期間寫死的 `enum LeaveType`。
 *
 * 「行為分類用 enum、參數用欄位」的切法見計畫書 §D1：
 * `accrualMethod` / `cycleBasis` / `unitBasis` 的每一個值都對應一段不同的程式邏輯，
 * 新增值必然伴隨新程式碼；而 `annualDays` / `minimumUnitMinutes` 是租戶自己會調的數字。
 *
 * `code` 是帳本內唯一鍵，供 seed、i18n 與跨帳本比對使用。
 * **嚴禁被 if/switch 比對** —— 一旦規則引擎開始讀 code，租戶自訂假別就會走進
 * 一段沒有為它寫過的分支。以 `leave_policy_no_code_branching.test.ts` 釘住。
 */
model LeavePolicy {
  id   String @id @default(uuid())
  code String // Info: (20260817 - Julian) 假別代號 (例: ANNUAL)，唯一性以帳本為範圍
  name String // Info: (20260817 - Julian) 假別名稱 (例: 特別休假)

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  // Info: (20260817 - Julian) --- 給假規則 ---
  accrualMethod LeaveAccrualMethod @map("accrual_method")
  cycleBasis    LeaveCycleBasis    @map("cycle_basis")
  quotaMode     LeaveQuotaMode     @map("quota_mode")
  // Info: (20260817 - Julian) FIXED_PER_CYCLE 時的年度日數；SENIORITY_TIER 時為 null（改看 tiers）
  annualDays    Decimal?           @map("annual_days") @db.Decimal(6, 2)

  // Info: (20260817 - Julian) --- 請假單位（見計畫書 §D5：「半天」是相對量，不能寫成 240） ---
  unitBasis           LeaveUnitBasis    @map("unit_basis")
  // Info: (20260817 - Julian) 僅 FIXED_MINUTES 有意義，且須為正並整除 60，由 assertLeavePolicyUnit 擋在 repository
  minimumUnitMinutes  Int?              @map("minimum_unit_minutes")
  roundingMode        LeaveRoundingMode @default(UP) @map("rounding_mode")

  // Info: (20260817 - Julian) --- 遞延與失效 ---
  // Info: (20260817 - Julian) 特休依 §38 IV 得協商遞延一年；0 表不可遞延
  carryForwardMonths  Int  @default(0) @map("carry_forward_months")
  // Info: (20260817 - Julian) 屆期未休是否折現（特休與補休為 true，事假為 false）
  cashOutOnExpiry     Boolean @default(false) @map("cash_out_on_expiry")

  // Info: (20260817 - Julian) --- 工資與證明 ---
  // Info: (20260817 - Julian) 給薪比例（工資照給 = 1、折半發給 = 0.5、不給工資 = 0）。
  // Info: (20260817 - Julian) 本模組不算金額，此欄位供薪資模組與畫面提示使用
  paidRatio           Decimal @default(1) @map("paid_ratio") @db.Decimal(3, 2)
  proofRequirement    LeaveProofRequirement @default(NONE) @map("proof_requirement")
  proofThresholdDays  Decimal? @map("proof_threshold_days") @db.Decimal(6, 2)

  // Info: (20260817 - Julian) --- 權責（見計畫書 §D14）---
  // Info: (20260817 - Julian) 雇主有無准駁權。特休為 false（§38 II 期日由勞工排定），
  // Info: (20260817 - Julian) 併休上限對它只能警示不能硬擋
  employerMayReject   Boolean @default(true) @map("employer_may_reject")
  // Info: (20260817 - Julian) 是否適用銷假徵詢（§38 III）
  recallable          Boolean @default(false)

  // Info: (20260817 - Julian) 法源記載。字串而非 enum：條號會修法，且它從不參與判斷
  legalBasis          String? @map("legal_basis")
  // Info: (20260817 - Julian) 內建假別由 seed 產生，租戶不可刪除（可停用）
  isSystemDefined     Boolean @default(false) @map("is_system_defined")
  isActive            Boolean @default(true)  @map("is_active")

  tiers    LeaveAccrualTier[]
  grants   LeaveGrant[]
  requests LeaveRequest[]
  balances LeaveBalance[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([accountBookId, code])
  @@index([accountBookId])
  @@map("leave_policy")
}

/**
 * Info: (20260817 - Julian) 年資級距給假表。勞基法 §38 I 的 3/7/10/14/15/+1 是**資料不是程式碼** ——
 * 它會修法，而修法時該改的是一張表的內容，不是一個 switch。
 *
 * 級距以「到職滿幾個月」為下界，右開區間。10 年以上的「每年加 1 日、至 30 日為止」
 * 由 `incrementDaysPerYear` 與 `maxDays` 表達，不需要為它列 20 筆。
 */
model LeaveAccrualTier {
  id String @id @default(uuid())

  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Cascade)

  // Info: (20260817 - Julian) 年資下界（含），以月為單位。6 個月以上未滿 1 年 => 6
  minSeniorityMonths  Int      @map("min_seniority_months")
  days                Decimal  @db.Decimal(6, 2)
  // Info: (20260817 - Julian) 超過本級距後每滿一年再加的日數（§38 I ⑥ 的「每一年加給一日」）
  incrementDaysPerYear Decimal? @map("increment_days_per_year") @db.Decimal(6, 2)
  // Info: (20260817 - Julian) 加給的上限（§38 I ⑥ 的「加至三十日為止」）
  maxDays              Decimal? @map("max_days") @db.Decimal(6, 2)

  @@unique([leavePolicyId, minSeniorityMonths])
  @@map("leave_accrual_tier")
}

/**
 * Info: (20260817 - Julian) 授予批次。**不可變。**
 *
 * ## 為什麼是批次而不是一個餘額
 *
 * §38 IV 的遞延與 §32-1 的補休期限都問「這一批是什麼時候給的、什麼時候到期」，
 * 而餘額欄位答不出來。扣減採 FIFO by expiresOn（先到期先扣），對勞工有利，
 * 且是唯一能讓「還剩幾天不會過期」有確定答案的順序。
 *
 * ## grantedDays 與 dayEquivalentMinutes 為什麼兩個都要存
 *
 * 帳本的單位是分鐘（整數、守恆恆成立），但法規的面額是日。兩個欄位一起，
 * 任何人事後都能驗算「這 3360 分鐘是 7 日 × 每日 480 分鐘來的」。
 * 少存任何一個，這筆授予就變成一個無從查核的數字。見計畫書 §D3。
 *
 * ## overtimeSegmentId
 *
 * 僅 source = OVERTIME_CONVERSION 時有值，指回產生它的加班分段 ——
 * 補休屆期折現要「依當日工資計算標準發給」(§32-1)，級距資訊必須跟著這一批走。
 * 不拆成兩張表的理由同 EmployeeShiftDay（出勤模組 §D2）：拆表不會讓非法狀態變少，
 * 由 `assertGrantSource` 擋在 repository。
 */
model LeaveGrant {
  id String @id @default(uuid())

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  employeeId String   @map("employee_id")
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Restrict)

  source LeaveGrantSource

  // Info: (20260817 - Julian) 法定面額與換算依據（見上方說明），兩者皆不可變
  grantedDays          Decimal @map("granted_days") @db.Decimal(8, 4)
  dayEquivalentMinutes Int     @map("day_equivalent_minutes")
  // Info: (20260817 - Julian) 授予的分鐘數 = grantedDays × dayEquivalentMinutes（取整）。帳本的真相
  grantedMinutes       Int     @map("granted_minutes")

  // Info: (20260817 - Julian) 週期起訖與到期日，皆為 "YYYY-MM-DD"，與 workDate 同型別同語意
  cycleStartDate String    @map("cycle_start_date")
  cycleEndDate   String    @map("cycle_end_date")
  expiresOn      String    @map("expires_on")

  // Info: (20260817 - Julian) 僅 OVERTIME_CONVERSION 有值
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
 * 手法完全比照 ADR 015 的 TeamWalletLedger：有號的 delta、扣後餘額、冪等鍵。
 * 撤銷不是刪列而是寫一筆反向的 ADJUST —— 刪掉的話「他曾經被扣過、後來退回」
 * 這個事實就消失了，而那正是勞動檢查會查的東西。
 */
model LeaveLedgerEntry {
  id String @id @default(uuid())

  leaveGrantId String     @map("leave_grant_id")
  leaveGrant   LeaveGrant @relation(fields: [leaveGrantId], references: [id], onDelete: Restrict)

  entryType    LeaveLedgerEntryType @map("entry_type")
  // Info: (20260817 - Julian) 有號：GRANT 為正，CONSUME / EXPIRE / CASH_OUT 為負，RESTORE 為正
  deltaMinutes Int                  @map("delta_minutes")
  // Info: (20260817 - Julian) 該批扣後餘額。冗餘但刻意：勾稽時不必重跑全表即可定位斷點
  grantBalanceAfterMinutes Int      @map("grant_balance_after_minutes")

  // Info: (20260817 - Julian) 來源單據。CONSUME / RESTORE 指向 LeaveDay，CASH_OUT 指向事件
  leaveDayId     String? @map("leave_day_id")
  cashOutEventId String? @map("cash_out_event_id")

  // Info: (20260817 - Julian) 冪等鍵。重試、補償、Worker 重跑皆靠它擋重複入帳
  idempotencyKey String @unique @map("idempotency_key")

  // Info: (20260817 - Julian) 操作者。系統排程產生者為 null，並以 reason 標明來源
  actorEmployeeId String? @map("actor_employee_id")
  reason          String?

  createdAt DateTime @default(now()) @map("created_at")

  @@index([leaveGrantId])
  @@map("leave_ledger_entry")
}

/**
 * Info: (20260817 - Julian) 額度餘額。**派生快取，不是第二個真相。**
 *
 * 遵守出勤模組 §D10 對 AttendancePresence 立下的三規矩：
 * ① 只在寫入異動的同一個 $transaction 內更新
 * ② 可由 rebuildLeaveBalance 完整重建
 * ③ 每日 Worker 勾稽 Σ(deltaMinutes) === remainingMinutes，不符以帳本為準並告警
 */
model LeaveBalance {
  id String @id @default(uuid())

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  employeeId String   @map("employee_id")
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Cascade)

  remainingMinutes Int @map("remaining_minutes")
  // Info: (20260817 - Julian) 30 日內即將到期的分鐘數。供畫面提示，同樣是派生值
  expiringSoonMinutes Int @default(0) @map("expiring_soon_minutes")

  // Info: (20260817 - Julian) 最後一次成功勾稽的時點。null 表示從未勾稽過 —— 與「勾稽過且相符」是兩件事
  reconciledAt DateTime? @map("reconciled_at")

  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([employeeId, leavePolicyId])
  @@index([accountBookId])
  @@map("leave_balance")
}
```

**`LeaveRequest` / `LeaveDay` 的增補**（重新設計，見 §14 遷移計畫）：

```prisma
model LeaveRequest {
  // Info: (20260817 - Julian) --- 沿用 Demo 版 ---
  id            String @id @default(uuid())
  accountBookId String @map("account_book_id")
  employeeId    String @map("employee_id")
  reason        String
  status        LeaveRequestStatus @default(PENDING)

  // Info: (20260817 - Julian) --- 新增 ---
  // Info: (20260817 - Julian) 取代 Demo 版的 leaveType 欄位。Restrict：假別被停用不可讓歷史假單靜默失去假別
  leavePolicyId String      @map("leave_policy_id")
  leavePolicy   LeavePolicy @relation(fields: [leavePolicyId], references: [id], onDelete: Restrict)

  // Info: (20260817 - Julian) 送出當下固化的總量。與 days 的加總須相等，由 assertRequestTotals 擋在 repository
  totalMinutes  Int     @map("total_minutes")
  totalDays     Decimal @map("total_days") @db.Decimal(8, 4)

  // Info: (20260817 - Julian) 證明文件。假別本身已揭露健康狀態，文件更甚 —— Tier 2，見 §12
  proofDocumentId String? @map("proof_document_id")

  // Info: (20260817 - Julian) 併休超限警示的快照。不是擋，是記錄協商的起點（見 §D14）
  concurrencyWarned Boolean @default(false) @map("concurrency_warned")

  approvalSteps LeaveApprovalStep[]
  days          LeaveDay[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([accountBookId, employeeId])
  @@index([accountBookId, status])
  @@map("leave_request")
}

model LeaveDay {
  // Info: (20260817 - Julian) --- 沿用 Demo 版（activeKey 的 partial unique 手法原樣保留）---
  id             String  @id @default(uuid())
  leaveRequestId String  @map("leave_request_id")
  workDate       String  @map("work_date")
  activeKey      String? @unique @map("active_key")
  recalledAt     DateTime? @map("recalled_at")

  // Info: (20260817 - Julian) --- 新增：讓「請半天」與「請兩小時」可表示 ---
  segment  LeaveDaySegment @default(FULL)
  // Info: (20260817 - Julian) 僅 CUSTOM 有意義。當日 00:00 起算的分鐘數，與 ShiftPattern 同型別同語意
  startMinute Int? @map("start_minute")
  endMinute   Int? @map("end_minute")

  // Info: (20260817 - Julian) 本日請假分鐘數，與該日換算依據。**逐日固化**（見計畫書 §D3）：
  // Info: (20260817 - Julian) 換算依據取自該日排班的 ShiftPattern.requiredWorkMinutes，不是一個全域參數
  minutes              Int @map("minutes")
  dayEquivalentMinutes Int @map("day_equivalent_minutes")

  recalls LeaveRecall[]
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([leaveRequestId, workDate])
  @@index([workDate])
  @@map("leave_day")
}
```

`LeaveRecall` **原樣保留**（僅 FK 型別不變、語意不變）。Demo 期間對它的三段式設計（徵詢期間假仍生效、被拒可再徵詢、同意才投影回排班）在正式版依然正確，不需要重做。

### 5.3 簽核、加班、行事曆的 Model（摘要）

篇幅考量，以下僅列關鍵欄位與不變式，完整定義隨里程碑 3、4 落地。

| Model | 關鍵欄位 | 不變式 |
|---|---|---|
| `LeaveApprovalRule` | `leavePolicyId?`、`minDays`、`maxDays?`、`priority` | 同帳本內區間不得重疊（`assertRuleRangesDisjoint`） |
| `LeaveApprovalRuleStep` | `ruleId`、`order`、`nodeKind`、`specificEmployeeId?` | `SPECIFIC_EMPLOYEE` ⟺ `specificEmployeeId != null` |
| `LeaveApprovalStep` | `leaveRequestId`、`order`、`nodeKind`、`approverEmployeeId`、`approverEmployeeNo`、`approverName`（快照）、`status`、`pendingKey String? @unique`、`escalatedReason?`、`mergedFromKinds?` | `pendingKey` 僅當 `status = PENDING` 且為當前節點時填入 |
| `OvertimeRequest` | `employeeId`、`workDate`、`filingType`、`compensationMode`、`evidenceBasis`、`requestedStartMinute/EndMinute`、`approvedMinutes`、`recognizedMinutes`、`status` | `assertOvertimeFilingType`（D10）；`recognizedMinutes <= approvedMinutes` |
| `OvertimeSegment` | `overtimeRequestId`、`order`、`tier`、`minutes`、`engineVersion` | `Σ segment.minutes === request.recognizedMinutes` |
| `LeaveConcurrencyRule` | `departmentId?`、`leavePolicyId?`、`maxConcurrentEmployees` 或 `maxConcurrentRatio`、`action` | 兩個上限欄位恰有一個為 null |
| `LeaveConcurrencyWarning` | `leaveRequestId`、`ruleId`、`observedCount`、`limitValue`、`shownToEmployeeId`、`shownAt` | append-only |
| `LeaveCashOutEvent` | `employeeId`、`reason`、`minutes`、`tier?`、`grantDayEquivalentMinutes`、`cashOutDayEquivalentMinutes`、`sourceGrantIds`、`legalBasis`、`settledAt?` | **無金額欄位**（D13） |

---

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

**護欄**：`assertCycleNotDisadvantageous(hireDate, asOf, policy)` 同時試算兩制，曆年制累計 < 週年制累計即 `throw AppError(VA_LEAVE_CYCLE_DISADVANTAGEOUS)`。

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
| `FO_SELF_APPROVAL_FORBIDDEN` | 既有 | `FORBIDDEN` | 不得自我核准（沿用出勤模組） |
| `FO_NOT_AUTHORIZED_REVIEWER` | 既有 | `FORBIDDEN` | 非簽核鏈上的節點 |
| `FO_LEAVE_CALENDAR_SCOPE` | `FO000012` | `FORBIDDEN` | 逾越可見範圍（§9.2） |
| `FO_OVERTIME_ON_REGULAR_OFF` | `FO000013` | `FORBIDDEN` | 例假日加班須依 §40 程序（§8.1 #3） |
| `NF_LEAVE_POLICY` | `NF000024` | `NOT_FOUND` | 假別不存在或已停用 |
| `NF_LEAVE_GRANT` | `NF000025` | `NOT_FOUND` | 額度批次不存在 |
| `NF_OVERTIME_REQUEST` | `NF000026` | `NOT_FOUND` | 加班單不存在 |
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
| **2** | 額度引擎與帳本 | `leave_entitlement_rules.ts` 純函數 + 單元測試；`LeaveGrant` / `LeaveLedgerEntry` / `LeaveBalance` 落地；每日勾稽 Worker；L7–L9 可用 |
| **3** | 請假與簽核 | 簽核鏈快照、SoD、`activeKey` 投影；L10–L17 可用；A11 進入相容期 |
| **4** | 加班 | `overtime_rules.ts` 純函數 + 上限護欄；補休分批入帳；L24–L30 可用 |
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

> **延伸閱讀**：[出勤模組開發計畫書](time_attendance_module_plan.md)（本模組的資料流上游）、[Demo 開發計畫書 §5 踩雷紀錄](attendance_demo_plan.md)（29 條實作教訓，本計畫多處引用）、[CLAUDE.md](../../CLAUDE.md)（架構鐵律）
