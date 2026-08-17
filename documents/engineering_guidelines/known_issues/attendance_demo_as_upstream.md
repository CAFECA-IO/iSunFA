# ⚠️ 簽到模組仍是 Demo，但它已經是上游

> **Date**: 2026-08-17
> **Author**: Julian
> **Status**: 🔴 Open —— 在簽到模組轉正之前持續有效
> **相關**: [簽到系統 Demo 開發計畫書 §7.3](../../architecture/attendance_demo_plan.md)、[出勤模組開發計畫書](../../architecture/time_attendance_module_plan.md)、[假勤模組開發計畫書 §19.5](../../architecture/leave_and_overtime_module_plan.md)

---

## 1. 這份文件要解決的問題

簽到模組是**有意識地**做成 demo 的：三張判定結果表不建、沒有權限矩陣、政策參數是常數而不是表、補打卡申請單未實作。這些取捨在 `attendance_demo_plan.md` §7.3 排好了序，是好的工程紀律。

問題不在那些取捨，而在**它已經變成上游了**。假勤模組（正式版設計）接了上去，之後薪資、專案工時、工程計價都會接。而「簽到是 demo」這件事**沒有寫在任何一支 API 的簽名上** —— 下一個接線的人看到的是一組能跑、有測試、有文件的端點。

> **這份文件不是在要求「先把簽到做完才能接線」。**
> 那個要求會擋住所有人，而且不必要 —— 簽到落地的那部分是可靠的。
> 它要回答的是：**接線之前，哪些東西不能依賴，以及不依賴的話該怎麼辦。**

**引用一律用檔名與符號名，不用行號。** 行號會漂移，而一份會被反覆查閱的規範不能每次 refactor 就變成假話。

> **本文件經過一次對抗性複查**（2026-08-17），第一版有五處事實錯誤與五項重大遺漏，皆已修正。
> 修正的內容留在文中（§3.1、§3.3、§3.5、§4、§7），因為那幾個錯誤本身就是接線時最容易犯的。

---

## 2. 一句話判準

> **落地的可以信；推導的每次都不一樣；沒有的不要假裝有。**

簽到模組刻意讓一大部分東西「不落地」—— 判定結果、現場狀態都是讀取時即時算的。那個決定是對的（`attendance_result.service.ts` 檔頭：「落地會產生第二份可能過期的真相」），**不要求改**。但它的直接後果是：

- 你**現在**問它，它會給你一個答案
- 你**明天**再問同一個問題，答案可能不同（引擎改了、排班改了、政策常數改了）
- 而**沒有任何一份快照**能告訴你當初那個答案是什麼

所以規則是：**任何需要事後舉證的數字，必須由你自己在當下固化。**

---

## 3. 接線前必答的五個問題

### 3.1 我要的東西，簽到有沒有把它存下來？

| 你想要的 | 有沒有落地 | 怎麼辦 |
|---|---|---|
| 打卡事實（誰、何時、在哪） | ✅ `AttendancePunch`，append-only | 直接讀 |
| 排班（哪天上不上班、上哪一班） | ✅ `EmployeeShiftDay` | 直接讀 |
| 班別定義（窗、核心時段、應工作分鐘） | ✅ `ShiftPattern` | 直接讀 |
| 遲到 / 早退 / 缺卡 / 工時不足的判定 | ❌ 不落地 | 見下 |
| 現在誰在班上 | ❌ 不落地 | 見下 |
| 出勤異常清單 | ❌ 不落地 | 見下 |

後三項由 `attendance_rules.ts` 的 `evaluateAttendanceDay()` 與 `attendance_presence.ts` 的 `resolvePresence()` 每次請求即時推導。它們是**純函數**，所以你可以自己呼叫；但**沒有 `AttendanceDailyResult` / `AttendanceException` / `AttendancePresence` 這三張表**，schema 裡一個 model 都沒有。

**接線規則**：
- 只是要顯示給人看 → 即時算，不要存
- 要拿去算錢、要對帳、要在勞檢時舉證 → **在你自己的表裡存一份快照，並記下 `ATTENDANCE_ENGINE_VERSION`**
- 快照要記引擎版本，否則引擎改版之後你分不出「當初算錯」與「規則改了」

> ⚠️ **假勤模組沒有做到這條，不要照抄它。**
> `LeaveDay.dayEquivalentMinutes` 固化了**數值**，卻沒有固化**版本** —— schema 上沒有任何 engineVersion 欄位。
> `OvertimeSegment.engineVersion` 有欄位，但整個加班模組還沒有 repository，**那個欄位至今沒有任何寫入端**。
> 也就是說：這條規則目前在 repo 裡**一個正確範例都沒有**。見 §7 待辦甲-6。

---

### 3.2 我要的是不是「某人某日應工作幾分鐘」？

**如果是，注意這個數字在非上班日不存在。**

`attendance_schedule_invariant.ts` 的 `assertSchedulableDay()` 強制兩條：`WORK` 必有班別、**非 `WORK` 必無班別**。所以一旦某天被投影成 `LEAVE` / `HOLIDAY` / `SUSPENDED`，`EmployeeShiftDay.shiftPatternId` 就是 `null`，「這天本來要上幾分鐘」**在資料庫裡不再存在**。

這條不變式本身是對的（休假日掛著班別，排班月曆會畫出一個不存在於任何判定的班次）。但它意味著：

**接線規則**：**投影之前先把數字固化在你自己的表上。** 投影之後再回頭找，找不到。

假勤模組的做法是 `LeaveDay.dayEquivalentMinutes` —— 請假送出的當下，從該日排班的 `ShiftPattern.requiredWorkMinutes` 逐日抄一份。

⚠️ **已知漏洞**：這只涵蓋走過假勤流程的日子。demo 種子腳本直接寫成 `LEAVE` 的那幾天沒有走這條路，目前是用「該員工的預設班別」回推的 —— **那是猜測**，只在「這個人每天上同一班」時才對。見 §7 待辦甲-3。

---

### 3.3 我要不要動 `EmployeeShiftDay`？

**它是投影標的，不是真相。** 請假、銷假、停工都會覆寫它，而**覆寫的人負責能夠回復**。

目前有**三個**寫入點：

| 寫入點 | 動作 | 過 `assertSchedulableDay()` |
|---|---|---|
| `attendance_schedule.repo.upsertShiftDay` | upsert | ✅ |
| `leave.repo.resolveRecall`（銷假投影回 `WORK`） | upsert | ✅ |
| `leave_request.repo.completeApproval`（核准投影成 `LEAVE`） | **update** | ✅（2026-08-17 補上；第一版只有註解引述，沒有真的呼叫） |

> **那個第一版的錯誤值得留在這裡**：當時的理由是「反正寫死 `LEAVE` + `null`，必然合法」。
> 那句話對，但它描述的是**這一行現在長什麼樣**，不是一個保證 —— 哪天有人把它改成帶班別
> （例如半天假想保留班別），沒有任何東西擋得住。**註解攔不下 refactor，斷言可以。**

**接線規則**：

| 規則 | 為什麼 |
|---|---|
| 寫入前**呼叫** `assertSchedulableDay()`，不是在註解裡引述它 | 見上 |
| 用 `accountBookId_employeeId_workDate` 唯一鍵 | 同一天可能已經被別人投影過。用 `update` 表示「我確定它已存在」——若不確定，用 upsert |
| 投影是**單向有損的**（見 §3.2），先固化再投影 | 投影之後原本那一班就查不到了 |
| 覆寫之前先想清楚怎麼回復 | 銷假要投影回 `WORK`，靠的是 `LeaveRecall.shiftPatternId` 另存的一份 —— **但那是徵詢者指定的班，不必然等於原本那一班** |

⚠️ **目前沒有任何排班異動軌跡。** `attendance_schedule.service.ts` 只有一行 `logger.info`，而且**只記新值不記原值**。原本打算用 `AuditLog` 補，實作時發現該表**沒有 payload 欄位**，答不出「原本是什麼」，於是刻意不做半套（`attendance_demo_plan.md` §8.7）。

意思是：**「他請假那天本來是不是上班日」事後查不到。** 這對勞檢是硬傷。見 §7 待辦乙-2。

---

### 3.4 我要不要拿打卡當「工時」的事實來源？

**窗內的正常工時可以信；窗外的一切都不可信。** 四個結構性原因：

1. **`clampToWindow()` 會把窗外時間丟掉。** `evaluateAttendanceDay()` 先把打卡夾進 `[windowStartMinute, windowEndMinute]` 才相減 —— 加班時段結構上算不進 `workedMinutes`。
2. **非上班日直接短路。** `dayType !== WORK` 立刻回 `OFF_DAY`，`workedMinutes` 停在 `0`。**「假日搶修」那些打卡，系統算出來的工時是 0。**
3. **只取最早 IN / 最晚 OUT。** 中間外出不扣、晚上回來的段落與白天併成一段。這是本期的簡化，記載於 `time_attendance_module_plan.md`。
4. **圍欄外一律 403 不入庫**（`FO_PUNCH_OUT_OF_FENCE`）。外勤到工**沒有任何入口**（補打卡申請單從未實作）。

**接線規則**：
- 要算「他有沒有正常上完班」→ 可以用
- 要算「他加班幾分鐘」「他在工地待了幾小時」→ **現有引擎給不了，需要另寫一支窗外工時的推導**
- 素材本身是夠的（append-only、伺服器產生的 `punchedAt`、多段進出可辨識），缺的是推導與外勤入口

---

### 3.5 我要不要判斷「誰有權做這件事」？

> ⚠️ **這一項的成因不是簽到 demo。** 它是整個 HR 模組共用的地基缺口，簽到只是第一個繞過它的模組。修它也不只服務簽到 —— 報到、離職、試用期、假勤都在等。列在這裡是因為它是接線時最容易踩到、後果最嚴重的一項。

#### 3.5.1 `Employee` 上沒有任何角色來源

現況是三條互不相干的軸線：

| | 是什麼 | 掛在哪 | 能不能拿來當 HR 角色 |
|---|---|---|---|
| `Role`（USER/ADMIN/SUPER_ADMIN） | 平台身分 | `User.role` | ❌ 平台管理員不是 HR |
| `TeamRole`（OWNER/ADMIN/EDITOR/VIEWER） | 帳本存取權 | `TeamMember.role` | ❌ 財務的 ADMIN 不是 HR |
| `HrDashboardRole`（HR/MANAGER） | **頁面上的切換器** | 沒有落地 | ❌ 它自己的 ToDo 寫著「接上權限後改為讀取 `useAuth()` 的角色，切換器整個移除」 |

而 `Employee.userId` 是 **`String? @unique`** —— 工地的人可能根本沒有平台帳號，但他仍然要能出現在簽核鏈上；反過來，帳本的 `OWNER` 可能完全不是這家公司的員工。**三條軸線硬套會同時產生兩種錯誤。**

**接線規則**：
- **不要**從 `TeamRole` 或 `Role` 推導 HR 職能。這不是保守，是會錯。
- 需要「HR」「薪資」「稽核」這類職能 → 目前沒有來源，**擋下來並回報明確錯誤**，不要猜。
- 「直屬主管」與「部門主管」有來源（`Employee.managerId` / `Department.managerId`），**但那兩個來源自己也有兩個坑，見 3.5.2**。
- **不可以把主管關係也做成角色列** —— 它們已經有來源，再存一份就是第二種真相（ADR 019 判準）。

#### 3.5.2 主管關係這兩個「可靠來源」的兩個坑

1. **`Department.managerId` 是 `@unique`** —— 一位員工最多只能掛**一個**部門的主管。「一人兼管兩個工務段」在工程公司很常見，但在資料上**不可表示**。而 `resolveDepartmentManager` 沿部門樹向上找的行為會把這個限制遮蓋成「總是找得到一個人」—— 找到的是上一層的人，不是兼管的那個人。
2. **`Employee.managerId` 與 `Department.managerId` 都是 `onDelete: SetNull`** —— 主管的員工檔一被刪，所有下屬的直屬主管與該部門的主管欄位**靜默變 null**，簽核鏈直接變 `NO_DIRECT_MANAGER` / `NO_DEPARTMENT_MANAGER`。§3.3 抱怨排班無軌跡，但**這裡連一行 `logger.info` 都沒有**。

#### 3.5.3 已有一個範圍錯的權限檢查（比「沒有檢查」更難處理）

說簽到 demo「完全沒有權限控制」是過度概括。排班 `PUT`、名單、判定矩陣確實只驗身分，但**銷假徵詢有檢查** —— `leave.service.requestRecall` 會先跑 `employeeRepo.isDepartmentManager()`，不是主管就丟 `FO_ATTENDANCE_SUPERVISOR_ONLY`。

問題是那個檢查**只問「你有沒有管任何部門」，沒有比對被徵詢者是不是在你管的部門底下**：

```ts
const count = await prisma.department.count({
  where: { accountBookId, managerId: params.employeeId },
});
return count > 0;
```

**結果是第一工務段的主管可以對第五工務段的員工發起銷假徵詢。** 見 §7 待辦甲-5。

補權限時**必須先改掉這個**，而不是在它之上疊一層 —— 疊上去的話，錯的那層仍然會放行。

#### 3.5.4 排班可被竄改，會繞過下游的職責分離

上游沒有權限、下游有嚴格職責分離的結果是 **可以先改某人的排班，再走下游那套嚴謹流程**。接線時請假設排班是可被竄改的。

---

## 4. 不可依賴的清單

| # | 不可依賴 | 現況 | 接線時怎麼辦 |
|---|---|---|---|
| 1 | 判定結果、異常清單、現場狀態的**歷史值** | 三張表不建，讀取時即時推導 | 需舉證就自己存快照 **+ 引擎版本**（§3.1 註明：目前 repo 裡沒有正確範例可抄） |
| 2 | 非上班日的「應工作分鐘數」 | `assertSchedulableDay` 保證班別為 null | 投影前先固化 |
| 3 | 排班的**變更歷程** | 只有一行 `logger.info`，且只記新值 | 假設可被無聲竄改 |
| 4 | 主管關係的**變更歷程** | `onDelete: SetNull`，連 log 都沒有 | 簽核鏈要能容忍它突然變 null |
| 5 | 窗外工時、假日到工工時 | `clampToWindow` + `OFF_DAY` 短路 | 另寫推導，或改用自陳 + 核准 |
| 6 | 外勤／圍欄外的到工事實 | 403 不入庫，補登單未實作 | 只能自陳 |
| 7 | 任何 HR 職能角色 | 沒有來源（§3.5.1） | 擋下來，不要猜 |
| 8 | 「一人兼管多部門」的可表示性 | `Department.managerId` 是 `@unique` | 資料上做不到，別假設 |
| 9 | `isDepartmentManager()` 的判斷結果 | **範圍錯**，跨部門會放行（§3.5.3） | 自己比對部門範圍 |
| 10 | 政策參數的**租戶隔離** | 8 個 `DEMO_*` 全域常數，無 `AttendancePolicy` 表 | 見下 |
| 11 | **時區** | `DEMO_TIME_ZONE = "Asia/Taipei"` 寫死，`AccountBook` 上沒有時區欄位 | 見下 |
| 12 | `ATTENDANCE_API` 的端點字串 | `DEMO_ACCOUNT_BOOK_ID`（已標 `Deprecated:`）被寫死進 `ATTENDANCE_API_BASE`；常數本身標的是 `ToDo:` | 自己組 `[account_book_id]` 動態路徑 |
| 13 | 緊急點名 CSV 的欄位標題 | `ROSTER_CSV_LABELS_ZH_TW` 寫死繁中，已標 `Deprecated:` | 依請求者語系取字典 |
| 14 | **假勤的額度帳本** | 見 §4.1 | 目前是空的 |

### 4.1 第 10、11 項：政策參數不只是「換一個組裝點」

`attendance_result.service.ts` 的 `DEMO_POLICY` 只裝了 **3 個**欄位（遲到、早退、缺卡寬限）。其餘五個常數是各自散在別處直接 import 的：

| 常數 | 使用點 |
|---|---|
| `DEMO_MAX_ACCURACY_METERS`、`DEMO_WORK_DATE_TOLERANCE_MINUTES` | `attendance_punch.service.ts` |
| `DEMO_PRESENCE_STALE_MINUTES` | `attendance_presence.service.ts` |
| `DEMO_ATTENDANCE_MAX_RANGE_DAYS` | 兩支 service ＋ `error_dictionary.ts` |
| `DEMO_TIME_ZONE` | 四支 service ＋ `use_server_clock.ts` ＋ **兩個 client component** ＋ roster export route |

**時區尤其**：它有**前端**使用點。改成帳本層級的 `AttendancePolicy` 不是「把 `DEMO_POLICY` 換掉」，而是要新開一條把帳本時區送到 client 的路徑。這是中型工作，不是小型。

### 4.2 第 14 項：假勤的額度帳本目前沒有生產者

`LeaveLedgerEntryType` 有六種，但**只有 `CONSUME` 有寫入端**（`leave_request.repo`）。`GRANT` / `RESTORE` / `EXPIRE` / `CASH_OUT` / `ADJUST` 全部沒有。連帶地：

- **`LeaveGrant` 沒有任何寫入端** —— 全 repo 只有 `findMany`，seed 也不建
- **`LeaveBalance` 只有遞減的 `updateMany`**，沒有建立端
- **`LeaveApprovalRule` 沒有任何寫入端** —— 沒有 repository 方法、沒有 API、seed 不建

⚠️ **最後一項的後果**：今天送任何一張假單，失敗原因是 **`NO_MATCHING_RULE`** —— `resolveApprovalChain` 的 `selectRule` 回 null 就先返回了，**根本走不到 HR 節點解析**。所以「含 HR 節點的規則會以 `NO_HR` 擋下」雖然是真的，但它排在一個更前面、更全面的阻斷之後。

⚠️ **另一個陷阱**：`NO_HR` 這個 reason **不能反推「規則含 HR 節點」**。自我核准上升階梯走到底找不到人時，即使原節點是 `DIRECT_MANAGER`，回傳的仍是 `NO_HR`（只有原節點就是 HR 時才回 `NO_OTHER_HR`）。所以「老闆自己請假」的單子會拿到一個與成因無關的錯誤碼，而接線的人會照著它去查一個不存在的 HR 設定。

---

## 5. 可以放心依賴的清單

同樣重要 —— 否則接線的人會什麼都自己重做一份，那才是真的災難。

| 東西 | 為什麼可信 | 但要注意 |
|---|---|---|
| `AttendancePunch` | append-only（repository 刻意沒有 update/delete/upsert）、`punchedAt` 由伺服器產生、`workLocationId`（`onDelete: Restrict`）與 `distanceMeters` 已固化 | — |
| `EmployeeShiftDay.dayType` | 落地的 enum，加班級距判定可以直接用 | 可被無聲竄改（§3.3） |
| `ShiftPattern.requiredWorkMinutes` | **引擎層唯一的「一天多長」來源** | `LeaveDay.dayEquivalentMinutes` 是它在**特定時點**的拷貝，兩者不保證一致（班別改了，舊快照不動 —— 那正是快照的用意）。**不要再抄第三份** |
| `assertSchedulableDay()` | 三個寫入點與種子腳本現已全部套用 | 第三個是 2026-08-17 才補的（§3.3） |
| `activeKeyOf(employeeId, workDate)` | 「同一人同一天只能有一張生效假單」的唯一保證，只有一處定義 | **請 import，不要自己組字串** |
| `evaluateAttendanceDay()` / `resolvePresence()` | 純函數、無 IO、有測試 | 結果不落地（§3.1） |
| `collectDepartmentScope()` | 掃描到收斂而非遞迴，確實防環，有測試 | ⚠️ **這是顯示範圍，不是授權邊界。** 目前唯一呼叫端是 React 元件，吃的是前端已取回的部門陣列。**不要拿它當權限判斷** |

---

## 6. 兩個容易被誤複製的規範偏離

### 6.1 Repository 裡的 unit-of-work

`CLAUDE.md` 明訂 Repository「**不處理業務邏輯**」。但 `leave.repo.resolveRecall()` 在一個 `$transaction` 裡編排三張表的寫入 —— 理由是原子性只有 DB 給得起，而把 `$transaction` 拉到 service 會違反優先度更高的「只有 Repository 能碰 Prisma」。

完整的提案條文在 `attendance_demo_plan.md` §7.4，**狀態是「提案（尚未採納）」，至今沒有寫入 `coding_guidelines.md`**。

⚠️ 假勤模組的 `leave_request.repo.ts` 已經第二次援引同一條例外。**在條文正式通過之前，第三次援引請先把它寫進 `coding_guidelines.md`。**

> §7.4 提到「全 repo 有 22 處 `$transaction`，本次只檢查了一處」。**那是撰稿當時的數字，現況約 29 處**（`src` + `scripts`，排除 generated 與測試；光 `leave_request.repo.ts` 自己就 6 處）。引用它估工時請重新盤點。

### 6.2 種子腳本自己補不變式

種子腳本直接進 Prisma，繞過了 repository 這道關卡，因此 `seed_attendance_demo.ts` 自己呼叫 `assertSchedulableDay()` 與 `assertLeavePolicyUnit()`。

**這是要延續的模式，不是可省略的儀式** —— 規則產生器寫錯時，沒有這幾句就會安靜地種出違反不變式的資料，而那要到演示當天看到畫面才會發現。

---

## 7. 待辦（依「不補會怎樣」分級）

### 甲. 硬阻斷 —— 不補，下游模組會算錯或違法

| # | 項目 | 規模 | 備註 |
|---|---|---|---|
| 甲-1 | **`Employee` 層級的角色 enum** | 大 | ⚠️ 成因不是簽到。**不可套用 `Role` 或 `TeamRole`**（§3.5.1）。需另立 enum；「是否允許一人多職能」與「是否需要指派軌跡」尚未決定。ADR 023 §8.3 的原判斷已作廢 |
| 甲-2 | **`AttendancePolicy` 帳本層級政策表** | **中**（不是小） | 至少要有時區，而時區有前端使用點，需新開一條送到 client 的路徑（§4.1） |
| 甲-3 | **非上班日的「應工作分鐘數」持久來源** | 小 | 兩條路：`EmployeeShiftDay` 加 `plannedWorkMinutes` 快照欄位（目前 repo 不存在此欄位），或要求所有 `LEAVE` 日必須有 `LeaveDay` |
| 甲-4 | **銷假接回額度帳本 + 檢查 `LeavePolicy.recallable`** | 小 | `resolveRecall` 不寫 `LeaveLedgerEntry`，`RESTORE` 無寫入端。**注意：這目前還炸不了** —— 額度帳本沒有生產者，QUOTA 假別在 `submit` 就會先被 `VA_LEAVE_INSUFFICIENT_BALANCE` 擋下。它是**一顆等 `LeaveGrant` 一有寫入端就立刻引爆的炸彈**。`recallable` 欄位存在但從未被讀 → 目前可對產假發起銷假徵詢 |
| 甲-5 | **修正 `isDepartmentManager()` 的範圍** | 小 | 目前跨部門會放行（§3.5.3）。**必須先改它再疊權限**，否則錯的那層仍然放行 |
| 甲-6 | **快照要記引擎版本** | 小 | `LeaveDay` 沒有 engineVersion 欄位；`OvertimeSegment.engineVersion` 有欄位但無寫入端。§3.1 那條規則目前沒有正確範例 |
| 甲-7 | **額度帳本的生產者**（`LeaveGrant` / `LeaveBalance` / `LeaveApprovalRule` 的寫入端與設定 API） | 中 | 不是簽到的債，但它是假勤自己「送得出一張單」的前提 —— **目前任何假單都會以 `NO_MATCHING_RULE` 失敗** |

### 乙. 可降級 —— 取決於下游模組的範圍

| # | 項目 | 降級做法 | 代價 |
|---|---|---|---|
| 乙-1 | **窗外工時推導 + 分段計時 + 補打卡申請單** | 加班改為純自陳 + 主管核准 | `min(核准, 實際)` 那條防線消失；外勤加班永遠佐證不了 |
| 乙-2 | **排班與主管關係的異動軌跡** | 列為已知缺口先上 | 勞檢時答不出「他請假那天本來是不是上班日」。前置是 `AuditLog` 補 payload 欄位 |
| 乙-3 | **權限矩陣** | 沿用現有的最小視野 | 上游可竄改排班以繞過下游的職責分離。**但甲-5 不可降級** |
| 乙-4 | **`Department.managerId` 放寬為多對多** | 維持 `@unique`，兼管者靠部門樹向上找 | 找到的是上一層的人，不是兼管的那個人（§3.5.2） |

### 丙. 與接線無關 —— 不要因為在同一張清單上就一起做

`SUSPICIOUS_JUMP` 瞬移偵測、線形工程圍欄（PostGIS）、`PunchVerification.NETWORK`、一次徵詢多天、徵詢推播通知、`LeaveRecallStatus.EXPIRED`、手機端驗證、圍欄校準頁。

這些是簽到自己的品質債。**它們佔了 §7.3 待辦清單的大半，但沒有一項會讓下游模組算錯數字。**

---

## 8. 這份文件何時廢止

甲-1 到甲-7 全部完成，且 §4 的十四項各自有了可依賴的替代來源時。屆時本文件併入 `time_attendance_module_plan.md`，`attendance_demo_plan.md` §7.3 一併結案。

在那之前：**接線可以做，但 §4 的每一項都必須在接線的模組裡有對應的處置，而不是假設它會被補上。**
