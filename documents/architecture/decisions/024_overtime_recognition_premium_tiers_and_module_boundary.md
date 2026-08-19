# 架構決策紀錄 (ADR) 024: Overtime Recognition, Premium Tiers, and the Payroll Boundary (加班的事實認列、加成分段與模組邊界)

> **Date**: 2026-08-17
> **Author**: Julian
> **Status**: 📝 Proposed
> **核心目標**: 讓系統只認列真的發生過的加班、把法定加成切成可稽核的分段，並在「分鐘」這條線上與尚未存在的薪資模組交棒 —— 不算金額。
> **關聯**: [假勤模組開發計畫書 §4 D9–D13、§8](../leave_and_overtime_module_plan.md)、[ADR 020 資遣費試算](020_severance_pay_estimation.md)、[ADR 019](019_hr_process_task_split.md)、[出勤模組 §D7](../time_attendance_module_plan.md)

---

## 🛑 1. 當前架構挑戰 (Context)

需求：「員工事前/事後填寫加班申請，並選擇將加班時數轉換為『加班費』或『補休額度』。」

四個字面下的陷阱：

| # | 陷阱 | 若照直覺做會發生什麼 |
|---|---|---|
| 1 | 「加班時數」是誰說的？ | 若採信申請單填的時數，系統就在發明沒有發生過的加班 —— 直接違反 CLAUDE.md 的「零捏造」 |
| 2 | 「加班費」不是一個倍率 | §24 把一次加班切成兩個級距（前 2 小時加給 1/3、再延長加給 2/3），休息日另有兩個。單一時數乘單一倍率是錯的 |
| 3 | 「補休額度」不是加班費除以時薪 | §32-1 是**依工作時數 1:1** 換算，不乘倍率。但屆期未休折現時倍率又回來了 |
| 4 | 「轉換」聽起來像金額計算 | 而本系統沒有薪資 model，算不出基準時薪（ADR 020 已踩過同一個坑） |

---

## 🎯 2. 決策：認列時數 = 核准 ∩ 事實，取小者

`OvertimeRequest` 記載的是**意圖與核准**；實際加班分鐘的唯一來源是 `AttendancePunch`。

```
recognizedMinutes = min(approvedMinutes, 實際停留於加班區間的打卡分鐘)
```

| 情境 | 認列 | 附帶處理 |
|---|---|---|
| 申請 3h、核准 3h、實際待 1h | 1h | 無 |
| 申請 1h、核准 1h、實際待 3h | 1h | 產生 `UNAPPROVED_OVERTIME` 提示，送主管 |
| 申請 3h、核准 2h、實際待 3h | 2h | 同上，超出 1h 進提示 |

### 2.1 為什麼超出的部分不能靜默丟棄

未核准的加班是勞資爭議最常見的起點。系統若只是把它丟掉，事實仍然存在於 `AttendancePunch` 裡 —— 只是沒有人看見。而勞動檢查看得見。

`L29 GET .../overtime/unapproved` 端點的存在就是為了這個：**有打卡但無核准加班單的時段必須被看見**，由主管決定要補核准、要說明、還是要制止。系統的責任是讓它浮出來，不是替任何一方作結論。

### 2.2 沒有打卡紀錄的情形

外勤、系統故障、`WorkDayType` 為假日而當事人未打卡 —— 這些情形下沒有事實可以交集。

處置：`OvertimeRequest.evidenceBasis = MANUAL_DECLARATION`，**仍然認列**，但

1. 強制走完整簽核鏈（不套用任何簡化門檻）；
2. 在 `L28 overtime/summary` 中**與有打卡佐證的加班分開統計**。

第 2 點不是裝飾。勞動檢查會問「你們有多少加班是沒有出勤紀錄佐證的」，而一個答不出這題的系統，等於默認全部都是。

---

## 🎯 3. 決策：事前與事後是同一張表的一個欄位

```prisma
filingType OvertimeFilingType  // ADVANCE | POST_HOC
```

對照 ADR 019 拆分 `ProcessTask` 的判準：那裡拆表是因為單表可以寫入**三種互相矛盾的非法狀態**（雙掛、雙空、type 與外鍵矛盾）。

這裡沒有那個結構 —— 兩者欄位完全相同，差別只在 `createdAt` 與 `workDate` 的先後，而那是可由不變式檢查的：

```typescript
// Info: (20260817 - Julian) assertOvertimeFilingType（repository，唯一 DB 閘口）
// Info: (20260817 - Julian) ADVANCE  → createdAt 須早於該日班別的 windowStartMinute
// Info: (20260817 - Julian) POST_HOC → 反之
// Info: (20260817 - Julian) 「事前申請卻在下班後才送出」不是一種可選的填法，是一個謊。
```

拆表在這裡不會讓非法狀態變少，只會讓「我的加班單」要查兩張表再合併排序 —— 那正是 ADR 019 自己列出的代價，且這裡換不到任何保證。

---

## 🎯 4. 決策：加成級距由純函數切段，倍率以整數分子分母表示

### 4.1 純函數

```typescript
// Info: (20260817 - Julian) src/lib/overtime_rules.ts
// Info: (20260817 - Julian) 純函數：無 DB、無 I/O、無 Date.now()。比照 attendance_rules.ts 的邊界。
export const OVERTIME_ENGINE_VERSION = 1;
export function deriveOvertimeSegments(input: IOvertimeSegmentInput): IOvertimeSegment[];
```

「當日先前已認列多少分鐘」（決定這一段從第幾小時起算）由 Service 查好後**作為參數傳入**，函數本身不查 DB。理由同出勤模組 §D7：一個會自己查資料的判定函數，其結果無法在測試裡完整重現，也就無法在爭議時重算。

`engineVersion` 隨每筆 `OvertimeSegment` 落地，語意同 `AttendanceDailyResult.engineVersion`：規則改版後，舊資料仍能說明它當初是依哪一版算出來的。

### 4.2 級距表（⚠️ 用語待法務確認）

| `OvertimePremiumTier` | 適用 | **加給**倍率 | 法源 |
|---|---|---|---|
| `WEEKDAY_FIRST_2H` | 上班日延長前 2 小時 | 1/3 | §24 I ① |
| `WEEKDAY_BEYOND_2H` | 上班日再延長 | 2/3 | §24 I ② |
| `REST_DAY_FIRST_2H` | 休息日前 2 小時 | 4/3 | §24 II ① |
| `REST_DAY_BEYOND_2H` | 休息日 2 小時後 | 5/3 | §24 II ② |
| `HOLIDAY_DOUBLE` | 休假日經同意出勤 | 工資加倍發給 | §39 |
| `EMERGENCY_DOUBLE` | §32 IV 天災事變等 | 加倍發給 | §24 I ③ |

⚠️ §24 平日用「加給三分之一」（即發給 4/3），休息日用「**另再**加給一又三分之一」（即發給 7/3）。本表以**加給倍率**為準，但這個換算陳述需法務確認 —— 差一個「另再」就差一倍工資。

### 4.3 倍率不得寫成浮點數

```typescript
// Info: (20260817 - Julian) src/constants/overtime.ts
export const OVERTIME_PREMIUM: Record<OvertimePremiumTier, { numerator: number; denominator: number }> = {
  [OvertimePremiumTier.WEEKDAY_FIRST_2H]: { numerator: 1, denominator: 3 },
  // Info: (20260817 - Julian) 嚴禁寫成 0.333。本模組不做這個乘法，但它必須把一個
  // Info: (20260817 - Julian) 「可以無誤差相乘」的東西交給薪資模組。理由同 CLAUDE.md §2。
  ...
};
```

### 4.4 跨邊界必須切段

一次 3 小時平日加班切成 `[WEEKDAY_FIRST_2H, 120]` 與 `[WEEKDAY_BEYOND_2H, 60]` 兩筆 `OvertimeSegment`，不是一筆 180 分鐘。

`Σ segment.minutes === request.recognizedMinutes` 是本表的不變式，由 repository 擋。

### 4.5 例假日的誠實揭露

`WorkDayType.REGULAR_OFF`（例假）依 §40 原則上**不得使人工作**，僅限天災、事變或突發事件，且應報當地主管機關**核備**並事後補假休息。

本 ADR **不處理**核備與補假義務（⚠️ §40 未查證）。因此在補齊之前，例假日的加班申請一律**擋下**並回 `FO_OVERTIME_ON_REGULAR_OFF`（403），提示須由 HR 依 §40 程序處理。

把它做成一個普通的 `HOLIDAY_DOUBLE` 加班，會讓一個違法的排班在系統裡看起來像一筆正常的加班 —— 那比擋下來難處理得多。

**補記（2026-08-19，review B7）**：上面的「一律」原本有一個未被注意到的旁路 —— `deriveOvertimeSegments` 與 service 的 `assertDayTypeAllowed` 都把 `isEmergency` 排在例假之前，於是申請人在送出的 payload 裡自填一個布林值就繞過了這一條。旁路已移除，例假日現在排在判定表的第一列。

會出現那個旁路，是因為 §32 IV 與 §40 都以「天災、事變或突發事件」為前提，看起來像同一件事。**它們不是**：§32 IV 是延長工作時間，程序是「通知工會；無工會者報當地主管機關**備查**」；§40 是停止假期，程序是「報當地主管機關**核備**」。備查是報請存查，核備須經主管機關認可 —— 法律效果不同，因此前者的記載不能拿來放行後者。

本文件先前多處把 §40 的程序寫成「通報」，那個用語同時涵蓋了兩種效果，也正是旁路成立的認知起點。已一律改回條文原文。

---

## 🎯 5. 決策：補休一段一批，1:1 換算，級距隨批次保留

選 `COMPENSATORY_LEAVE` 時，**每一個 `OvertimeSegment` 各產生一筆 `LeaveGrant`**（`source = OVERTIME_CONVERSION`，`overtimeSegmentId` 指回該段），`grantedMinutes` 等於該段的實際加班分鐘。

### 5.1 1:1，不乘倍率

§32-1：「依勞工工作之時數計算補休時數」。加班 1 小時換補休 1 小時，**不是 1.33 小時**。

這是最容易做錯的一點，且做錯的方向是「多給」—— 表面上對勞工有利，實際上會在屆期折現時算出一個與法定標準不符的金額，兩邊都對不上。

### 5.2 為什麼一段一批

§32-1 規定補休期限屆滿或契約終止而未補休之時數，「依延長工作時間或休息日工作**當日之工資計算標準**發給工資」。

若把 3 小時加班（2h @ 1/3 + 1h @ 2/3）合併成一批 3 小時的補休，屆期折現時就算不出金額 —— 級距資訊在合併的那一刻被銷毀。分批入帳，每批帶著自己的級距（透過 `overtimeSegmentId`），折現時逐批計算。

詳細的帳本結構與不變式見 [ADR 022 §5](022_leave_entitlement_append_only_ledger.md)。

### 5.3 變更選擇

`PAYMENT ⇄ COMPENSATORY_LEAVE` 允許互轉，但限**尚未進入薪資結算**且**補休尚未被使用**時，且必須留下 `LeaveLedgerEntry(entryType = ADJUST)` 的反向分錄，不刪列。

---

## 🎯 6. 決策：上限是護欄不是提示

`assertOvertimeLimits()` 在核准前檢查，任一不過即 `throw`：

| 限制 | 值 | 來源 |
|---|---|---|
| 單日正常 + 延長 | ≤ 12 小時 | §32 II，法定，不可設定 |
| 單月延長累計 | ≤ 46 小時；`extendedLimitAgreed` 為真時 ≤ 54 小時 | §32 II、III |
| 每三個月延長累計 | ≤ 138 小時（僅 `extendedLimitAgreed` 為真時適用） | §32 III |

### 6.1 `extendedLimitAgreed` 必須有記載

放寬到 54 小時的前提是「經工會同意，如事業單位無工會者，經勞資會議同意」。因此 `OvertimePolicy.extendedLimitAgreed = true` 時，`agreementRecordUrl` 與 `agreedAt` **必填**，由 repository 不變式擋。

一個沒有記載的「已同意」等於沒有同意，而系統會據此多放 8 小時 —— 那是會被開罰的 8 小時。

### 6.2 為什麼是 `throw` 而不是警示

這條線與財務的 `A = L + E`、ESG 的質量守恆同性質：越過它的輸入不是「需要人判斷的例外」，是**違法**。依 CLAUDE.md §6，在 Service 開頭凍結，絕不讓髒資料進 DB。

### 6.3 三個月的區間定義（⚠️ 待核對）

滾動三個月或曆季，條文未明。在核對完成前，引擎以**滾動三個月**（較嚴）實作，並在 `OVERTIME_ENGINE_VERSION` 的註解標明此為保守選擇 —— 保守的方向若日後證明過嚴，改動是放寬；反過來則是追溯已核准的加班，那要重算工資。

---

## 🎯 7. 決策：模組邊界在「分鐘」，不在「金額」

本模組**不算錢**。所有需要金額的場景一律產出 `LeaveCashOutEvent` 交棒。

| `LeaveCashOutReason` | 觸發 | 法源 |
|---|---|---|
| `OVERTIME_PAYMENT` | 加班單核准且選 `PAYMENT` | §24 |
| `ANNUAL_YEAR_END` | 特休年度終結未休且未協商遞延 | §38 IV |
| `ANNUAL_CARRY_FORWARD_END` | 遞延年度終結仍未休 | §38 IV |
| `COMPENSATORY_EXPIRED` | 補休期限屆滿未休 | §32-1 |
| `TERMINATION_SETTLEMENT` | 契約終止結算 | §38 IV、§32-1 |

事件內容：員工、分鐘數、級距、兩端的日約當分鐘、法源標記、來源 `LeaveGrant` 清單。**沒有金額欄位。**

### 7.1 這與 ADR 020 是同一個決定

ADR 020 面對資遣費時的處置是：系統只算它真的知道的部分（年資切分、基數、法條依據），平均工資留給 HR 手動輸入，因為沒有薪資 model 就算不出來。

本模組面對的是同一個缺口的另一面。差別是資遣費至少可以請 HR 填一個數字，而加班費要的是「平日每小時工資額」—— 那是一個需要從經常性給與推算的量，不是一個可以憑印象填的數字。

因此本模組連「請 HR 填」都不做，只交棒。這比留一個半對半錯的估算誠實。

### 7.2 薪資模組上線前怎麼辦

`L23 GET .../leave/cash_out/export` 產出 CSV，交給既有的薪資作業流程。CSV 的欄位就是事件的欄位 —— 分鐘、級距、法源，沒有金額。

⚠️ CSV 產出須套用既有的公式注入中和（`= + - @` 前置 `'`、CRLF 分隔），理由見 `ledger_and_trial_balance_integration_plan.md` Phase 5 的 M7 與 Demo 期間 W20 的踩雷紀錄。

---

## ⚖️ 8. 取捨與代價

| 代價 | 說明 | 為何接受 |
|---|---|---|
| 認列取小者會讓員工「少拿」 | 申請 3h 只待 1h → 只認 1h | 這不是少拿，是沒有發生。零捏造沒有例外 |
| 一段一批讓補休列數變多 | 一次 3h 加班產生 2 筆 grant | 換到 §32-1 折現算得出來。合併省下的那一列，代價是一個法定義務履行不了 |
| 例假日直接擋下 | §40 未查證前功能缺一角 | 擋下來的成本是 HR 手動處理；放行的成本是一個看起來正常的違法紀錄 |
| 三個月採較嚴解釋 | 可能過度限制 | 保守的方向可放寬；反向要追溯重算工資 |
| 不算金額 | 使用者仍要另外算加班費 | 同 ADR 020 —— 半對半錯的估算比明確的缺口更難處理 |

---

## 🚧 9. 後果與待辦

1. **`WorkDayType.SUSPENDED` 必須先補上**（出勤模組既有 ToDo）。停工日到工的加成標準與國定假日不同，而目前 Demo 借用 `HOLIDAY` 表達停工 —— 加班引擎會把停工日的加班當成國定假日算。⚠️ 停工日的加成標準本身也待核對（§8.1 #8）。
2. **⚠️ 待法務複核**（計畫書 §3.2）：§24「加給」與「另再加給」的換算陳述、§40 例假出勤的程序義務、§32 III 三個月的區間定義、停工日的加成標準。
3. **`OvertimeSegment` 是 `LeaveGrant.overtimeSegmentId` 的參照對象**，故 `onDelete: Restrict` —— 加班單不可在已換成補休後被刪除。撤銷走 §5.3 的反向分錄。
4. **加班與行事曆的整合留待里程碑 5 後評估**（計畫書 §17 缺口 6）：「誰在加班」與「誰在放假」是同一個營運問題的兩面，但本期不做。
5. **`UNAPPROVED_OVERTIME` 的保存期限未定**：它是由 `AttendancePunch` 推導的衍生提示，不落地。若日後要落地成待辦清單，需一併決定保存期限與 PII 分級。
