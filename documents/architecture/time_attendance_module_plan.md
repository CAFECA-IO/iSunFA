# 🕒 簽到系統模組開發計劃書 (Time & Attendance Module Development Plan)

> **Date**: 2026-08-13
> **Author**: Julian
> **Version**: 1.3
> **Status**: 📝 Draft — 待架構評審
> **Scope**: 人事模組第二期。承接 ADR 018（人事個資分級）、ADR 019（拆表消除非法狀態）、ADR 020（資遣費試算）既有慣例。

> **v1.3 變更摘要**（相對 v1.2）：**Demo 實作時回頭修正三處**
>
> 0. **§D5 的地圖標記數字改為「在班 + 未打下班卡」**（原本只算在班，W9 發現）。
>    `STALE` 的語意是「系統不知道他在不在」—— 把他從地圖上的數字裡拿掉，
>    就是把「不確定」顯示成「不在」，而 §D10.4 自己就寫著那是
>    「這類系統最危險的失真」。疏散時要問的是「這個工區裡最多可能有幾個人」，
>    分項留給地點卡片。
>
> 1. **§D10.5 的 `AuditLog.dataId` 寫錯了。** 原文要求填**操作者**的
>    `Employee.id`，與 `AuditLogDataType.EMPLOYEE_PII` 自己的契約矛盾 ——
>    那個 enum 要求填**被讀到的**員工，理由是「調查軸線是哪些人受影響」。
>    改為一人一筆（`createManyAuditLogs`）。操作者記在 `AuditLog.userId`，
>    不需要佔用 `dataId`。
> 2. **§D10.6 新增一項已知失真：「應到未打卡」分不到地點。**
>    `EmployeeShiftDay` 沒有地點欄位，而這些人沒有打卡、系統手上沒有座標，
>    因此只給得出全帳本的總數。加上 ToDo：排班應帶預定工區。

> **v1.2 變更摘要**（相對 v1.1）
>
> 新增 **§D10.3「`presenceStaleGraceMinutes` 在回答什麼問題」** —— 原本只寫了「怎麼做」與「為什麼 `STALE` 不刪除」，
> 沒有把「這個參數在解決什麼問題」講清楚，而那正是訂值的人需要知道的。
> 新節說明了它與 `MISSING_CLOCK_OUT` 的分工（兩者是同一件事的不同面向，寬限值建議不同），
> 並把訂值判準寫成可操作的一句話。原 §D10.3–D10.5 順延為 §D10.4–D10.6。

> **v1.1 變更摘要**（相對 v1.0）
>
> 1. **圍欄外打卡改為「拒絕」**（原為待決 Q5）。這不是一個參數改動 —— 它讓 `workLocationId` 從選填變成必填、移除 `coarseGeohash`、移除 `OUT_OF_FENCE` 異常型別，並重寫了 §D6 的立論基礎。
> 2. **新增 §D10「現場在班狀態」**：`AttendancePresence` 快取表、現場人數統計、到班人員名單、緊急疏散點名匯出。這也讓 §D5 的地圖從「隱私妥協」變成「職安功能」。
> 3. **依現 branch（`develop` @ `9757e21e8`）重新核對**：Worker 落點、ADR 編號、錯誤碼流水號、`hr_enum_mirror` 的 `MIRRORED` / `UI_ONLY` 雙清單。

---

## 📋 0. 閱讀前的三件事

### 0.1 本文件已對照過的規範

| 來源 | 本計畫受其約束之處 |
|---|---|
| `CLAUDE.md` §1–§8 | 三層架構、零 `any`、Validator 集中化、註解鐵律、Fail Fast、LLM 邊界、`AccountBook` 為租戶 Root Node |
| `documents/engineering_guidelines/coding_guidelines.md` | 同上，另含「停看聽」與異常隔離 |
| `documents/engineering_guidelines/work_guidelines/annotation.md` | 所有註解格式 `// Info: (YYYYMMDD - Julian) …` |
| `documents/engineering_guidelines/numerical_precision_guideline.md` | §5.3 說明本模組為何**不**使用 `Prisma.Decimal` |
| `documents/engineering_guidelines/rate_limiting_guideline.md` | §10.3 新增限流 bucket |
| `documents/engineering_guidelines/known_issues/api_http_status_dual_mapping.md` | 錯誤碼一律進 `API_ERRORS` + `ApiCode`，不自創 HTTP status |
| `documents/architecture/decisions/018_hr_pii_data_classification.md` | §D4 位置個資分級、AAD 綁定、`piiKeyVersion`、`AuditLogAction.READ` |
| `documents/architecture/decisions/019_hr_process_task_split.md` | §D2 「能讓它不可表示，就不要退而求其次讓它可被拒絕」的適用與**不適用**判準 |
| `documents/architecture/decisions/020_severance_pay_estimation.md` | §0.2 法規需複核的既有慣例；§5.3 與薪資模組的介面邊界 |
| `documents/architecture/decisions/009_zero_trust_washing_pipeline_and_sod.md` | §D9 補登單的職責分離 (SoD) |
| `documents/architecture/decisions/010_immutable_pipeline_and_stateless_workers.md` | §D3 打卡紀錄的不可變性 |
| `documents/architecture/decisions/015_offchain_team_wallet_ledger.md` | §D10 「離鏈 append-only 帳本 + 守恆勾稽」是本模組 presence 快取的同構先例 |
| `documents/architecture/compliance_and_audit/internal_control_and_audit_framework.md` | §10 出勤異常屬「控制活動」，需留下可稽核軌跡 |
| `documents/architecture/async_workers/00_async_worker_overview.md` | §8 背景判定的節點歸屬 |
| `documents/testing_and_qa/integration_test_guide.md` | §11 整合測試以 Supertest + Cookie/Session |
| `documents/legal/privacy_policy.md` | §D5 位置蒐集需同步更新隱私權政策（本計畫的交付項之一） |

### 0.2 本文件**沒有**做到的事（誠實聲明）

撰寫當下的環境**無法連線外部網路**，因此下列項目一律標記為 `⚠️ 待核對`，**未在本文件中寫出任何條號或年限數字**：

- 勞動基準法對「出勤紀錄置備、記載精度、保存年限」的具體條號與文字
- 個人資料保護法對「位置資料告知義務、存取軌跡」的具體條號
- 職業安全衛生法對「工作場所人員掌握／緊急應變點名」的具體條號（§D10 新增需求所觸及）
- 主管機關對「行動打卡／生物特徵打卡」的函釋現況

**這些必須在 Phase 0 由法務／HR 至全國法規資料庫核對後才可寫進程式碼註解或使用者介面。**
依 CLAUDE.md 的零捏造原則，寧可留空待補，也不寫一個看起來可信的錯誤條號 —— 錯誤的法規引用比沒有引用更危險，因為它看起來查得到。

> 這不是本專案的新做法：ADR 020（資遣費試算）§6「法規依據需複核」已建立同一個慣例 ——
> 「系統把這些規則寫進具名常數，改動時只需要改一處，**但改之前要有人確認法規真的變了**。」
> 本模組的門檻值（寬限分鐘、補登跨度、保存年限）一律比照，集中在 `src/constants/attendance.ts`。

### 0.3 現 branch 核對結果（v1.1 重新確認）

本文件依 **`develop` @ `9757e21e8`**（`feature/hr_management_ui` 合併後）撰寫。逐項確認如下：

| 項目 | 現況 | 對計畫的影響 |
|---|---|---|
| 人事模組 schema | 14 張表已在庫；`EmployeeStatus` / `Gender` / `OnboardingStatus` / `OffboardingStatus` / `ProcessTaskStatus` / `ProbationResult` / `DocumentCategory` / `ResignationType` | 本模組的 10 張新表接在其後 |
| **ADR 編號** | 已用到 **020**（`020_severance_pay_estimation.md`） | 本計畫提議的 ADR 自 **021** 起編 |
| **常駐 Worker** | **單一** `scripts/run_worker.ts`，內含**私有**的 `startServiceLoop(name, fn, intervalMs)`（3 參數）。**`src/lib/worker/service_loop.ts`、`run_ops_node.ts`、`run_compute_node.ts` 在此分支不存在** | §8.1 掛載點依此撰寫，並保留拆分後的落點說明 |
| `hr_enum_mirror.test.ts` | 有 **`MIRRORED`** 與 **`UI_ONLY`** 兩份清單 | §4.1 明確指定 8 個 schema enum 進前者、衍生的 `ShiftPatternKind` 進後者 |
| PII 基礎設施 | `src/lib/hr_pii_crypto.ts`（`encryptPii` / `decryptPii` / `IHrPiiAadContext` / `HrPiiDecryptError`）、`hr_pii_mask.ts`、`src/repositories/hr_pii_invariant.ts`、`src/constants/hr_pii.ts` 皆在庫 | §D4 直接沿用，不發明第二套 |
| `HrPiiTable` 成員 | 目前 4 個（`EMPLOYEE` / `DEPENDENT` / `BANK_ACCOUNT` / `EMERGENCY_CONTACT`） | **必須加第 5 個**，見 §10.2 |
| `Employee.piiKeyVersion` | `Int`（NOT NULL）；`Dependent` 為 `Int?` | §D4 說明本模組為何取 `Int?` |
| 錯誤碼流水號 | 現況最大值：`VA000041` / `FO000008` / `NF000016` / `CF000003`（`ApiCode.CONFLICT` 用 `CF_` 前綴，不是 `CO_`） | §6.3 已改用實際可用的下一號 |
| 存取守衛慣例 | `account_book_access.guard.ts` / `carbon_access.guard.ts` / `team_wallet_access.guard.ts` | §6.2 的 `attendance_access.guard.ts` 比照 |
| 地圖 | `maplibre-gl@^6.1.0` 已在 `package.json`；`src/components/map_viewer.tsx` 可參考 | §9 |
| 既有 attendance/shift 命名 | **schema 內零命中** | 命名空間乾淨，唯一衝突是 `Checkin`（§2.1） |

### 0.4 一句話總結本模組的設計主張

> **打卡紀錄是不可變的法定證據；到班的定義是「人在登記的地點」，不在就不成立；班表是決定論的期望值；異常是兩者相減的純函數結果；而「現在誰在現場」必須隨時答得出來 —— 那是職安需求，不是管理需求。**

---

## 🎯 1. 需求拆解與範圍界定

### 1.1 需求對照表

| # | 原始需求 | 拆解後的工程項目 | 本期範圍 |
|---|---|---|---|
| R1 | Web 打卡機制（GPS / Wi-Fi IP 定位） | 打卡端點、地理圍欄判定、網段白名單、伺服器時間權威 | ✅ |
| R2 | 可設定打卡地理位置範圍限制，**確保人員真的抵達現場才能打卡** | `WorkLocation` 圍欄主檔 + 半徑 + 網段子表；**圍欄外一律拒絕**（§D6） | ✅ |
| R3 | 固定班表（朝九晚六） | `ShiftPattern`（窗＝核心的特例） | ✅ |
| R4 | 彈性工時（核心時間 + 彈性上下班） | `ShiftPattern`（窗 ⊃ 核心） | ✅ |
| R5 | 排班制（門市／產線輪班劃休） | `EmployeeShiftDay` 逐日指派 + 例假／休息日 | ✅ |
| R6 | 出勤異常判定（遲到／早退／曠職／漏打卡） | 純函數規則引擎 + 每日結果表 + 背景重算 | ✅ |
| R7 | 忘記打卡補登申請單 + 主管確認 | `AttendanceCorrectionRequest` + SoD + 補登後重算 | ✅ |
| R8 | 地圖全局顯示同仁目前在哪些地區上班中 | 唯讀看板 API + maplibre-gl 前端 | ✅ |
| **R9** | **明確掌握現場工作人數、到班人員名單**（v1.1 新增） | **`AttendancePresence` 即時在班狀態 + 人數統計 + 名單 + 緊急點名匯出**（§D10） | ✅ |

### 1.2 明確排除（本期不做，避免範圍蔓延）

| 排除項 | 理由 |
|---|---|
| 加班費／薪資金額計算 | 屬薪資模組職責。本模組**只輸出分鐘數**，金額換算與 `MoneyUtil` 由薪資模組承接（§5.3、ADR 020 §4） |
| 特休／請假／假別管理 | 獨立模組。本模組僅預留 `WorkDayType.LEAVE` 作為銜接點 |
| 生物特徵（人臉／指紋）打卡 | 屬特種個資，保護等級高於 ADR 018 Tier 1，需獨立 ADR 與法遵評估 |
| 行動裝置原生 App 打卡 | 需求明寫「Web 打卡機制」。原生 App 的 Mock Location 防護是另一套題目 |
| **外勤／出差的自由打卡** | **與 R2「拒絕」的立場直接衝突。**外勤走兩條既有路徑：HR 事先建檔臨時 `WorkLocation`，或事後走補登申請單由主管確認（§D6.4） |
| 歷史位置軌跡回放 | **刻意排除的隱私邊界**，見 §D5 |
| 打卡紀錄上鏈錨定 | 可行（比照 ADR 015 每日 merkle root），但非首期必要；列為升級路徑 §13.2 |

---

## 🧭 2. 既有資產盤點與命名衝突

### 2.1 ⚠️ 頭號陷阱：`Checkin` 這個名字已經被用掉了

`prisma/schema.prisma` 已存在 `model Checkin`（`@@map("checkin")`），對應端點 `GET /api/v1/auth/checkin`、`src/repositories/checkin.repo.ts`、`src/services/bot.checkin.service.ts`。

**那是「使用者每日登入簽到」（原本會發點數，20260809 已取消獎勵，現僅保留登入紀錄與鏈上會員註冊確保），與員工出勤毫無關係。**

它甚至有 `position` / `ip` / `device` 三個欄位，看起來極像打卡 —— 這正是危險所在：一個新進工程師（或 AI Agent）很可能直接往那張表加欄位。

**本模組一律使用 `Attendance*` 前綴，絕不觸碰 `Checkin`：**

| 概念 | 本模組命名 | 禁止使用 |
|---|---|---|
| 打卡紀錄 | `AttendancePunch` / `attendance_punch` | `Checkin`、`checkin` |
| 常數檔 | `src/constants/attendance.ts` | 併入 `hr_management.ts` |
| API 前綴 | `…/hr/attendance/…` | `…/auth/checkin` |
| Repo | `attendance_punch.repo.ts` | `checkin.repo.ts` |

> **Phase 0 交付**：在 `model Checkin` 上方補一段 `// Info: (20260813 - Julian) 這是使用者每日登入簽到，不是員工出勤打卡。出勤請見 AttendancePunch。` —— 名稱撞車擋不掉，但可以讓下一個人在 30 秒內知道自己走錯房間。

### 2.2 可直接複用的既有資產（已於現 branch 逐一確認存在）

| 資產 | 路徑 | 用途 |
|---|---|---|
| 欄位級加密 | `src/lib/hr_pii_crypto.ts`（`encryptPii` / `decryptPii` / `IHrPiiAadContext`） | 座標與 IP 加密，AAD 綁定 |
| 遮罩 | `src/lib/hr_pii_mask.ts` | 位置與 IP 的對外遮罩 |
| PII 不變式 | `src/repositories/hr_pii_invariant.ts`（`assertStorablePii`） | 新表直接沿用 |
| PII 常數 | `src/constants/hr_pii.ts`（`HrPiiTable`、`HR_PII_FIELD_TIER`） | **必須新增成員**，見 §D4 |
| 距離計算 | `src/lib/utils/geo.ts`（`calculateDistanceKm`，Haversine） | 地理圍欄判定，**無需新寫** |
| 日期工具 | `src/lib/utils/hr_date.ts`（本地零時語意、`addDays`、`differenceInDays`） | 工作日推算 |
| 地圖 | `maplibre-gl@^6.1.0`、`src/components/map_viewer.tsx` | 看板前端 |
| 常駐迴圈 | `scripts/run_worker.ts` 的私有 `startServiceLoop` | 每日判定 Worker（§8.1） |
| 限流 | `src/constants/rate_limit.ts` + `src/lib/rate_limiter.ts` | 打卡端點防刷 |
| 稽核 | `AuditLogDataType.EMPLOYEE_PII` + `AuditLogAction.READ`（**已存在，不新增 enum**） | 位置解密與名單匯出留痕 |
| 直屬主管 | `Employee.managerId`（自關聯，schema 註解原文即寫「**假勤流程直屬主管簽核的核心**」） | 補登單簽核鏈 |
| 派生快取先例 | `model UserStorageUsage`（註解：「配額檢查 **O(1) 讀**」） | §D10 的 `AttendancePresence` 同構 |
| Enum 鏡像測試 | `src/__tests__/hr_enum_mirror.test.ts`（`MIRRORED` + `UI_ONLY`） | 新 enum **必須登記** |

### 2.3 ⚠️ `AccountBook` 沒有時區欄位

`AccountBook` 只有 `country String`，沒有 timezone。而出勤的一切都建立在「今天是哪一天」之上。

**決策：時區放在新表 `AttendancePolicy.timeZone`，不動 `AccountBook`。**

理由：`AccountBook` 被 14 個人事表與整個財務／ESG 管線引用，加欄位的影響面遠大於收益；而時區在本模組是**出勤語意的一部分**（同一家公司的越南廠與台北總部本來就該有不同的工作日邊界），本來就該掛在政策上而不是帳本上。

---

## 🏛️ 3. 核心架構決策

以下 D1–D10 是本計畫的實質內容。**D1、D2、D4、D5＋D10 建議在評審通過後抽成正式 ADR 021–024**（見 §14.2）。

---

### D1. 固定班表是彈性班表的特例 —— 一張 `ShiftPattern`，零可空欄位

#### 問題

需求要三種工時制度。直覺做法是一張表加一個 `shiftType` 判別欄位：

```prisma
// Info: 反面教材，本計畫不採用
model ShiftPattern {
  shiftType         ShiftType  // FIXED | FLEXIBLE | ROTATING
  startTime         Int?       // 只有 FIXED 有意義
  endTime           Int?       // 只有 FIXED 有意義
  coreStart         Int?       // 只有 FLEXIBLE 有意義
  coreEnd           Int?       // 只有 FLEXIBLE 有意義
  flexWindowStart   Int?       // 只有 FLEXIBLE 有意義
  requiredMinutes   Int?       // 只有 FLEXIBLE 有意義
}
```

這是 ADR 019 點名的同一種病：**7 個可空欄位、沒有任何機制保證哪幾個該有值**，而 `shiftType` 隨時可以與實際填的欄位矛盾。判定引擎將被迫寫成一個以 `shiftType` 分支的 switch，每加一種制度就多一條分支與一組可空欄位。

#### 觀察一：排班制不是第三種班別

「早班／中班／晚班輪值、月中劃休」——**每一個班別本身仍然是一段固定時段**。輪班改變的是「哪一天上哪一班」，不是「班別怎麼定義」。

> 排班制屬於**指派方式**（§D2），不屬於**班別定義**。把它塞進 `shiftType` 是把兩個正交的概念壓進同一個欄位。

#### 觀察二：固定班表是彈性窗收縮到零的彈性班表

| | 彈性窗起 | 彈性窗迄 | 核心起 | 核心迄 | 應工作分鐘 |
|---|---|---|---|---|---|
| 朝九晚六（固定） | 09:00 | 18:00 | **09:00** | **18:00** | 480 |
| 核心 10–16（彈性） | 07:00 | 22:00 | 10:00 | 16:00 | 480 |
| 大夜班（固定，跨日） | 22:00 | 次日 06:00 | 22:00 | 次日 06:00 | 420 |

**固定班表 ⇔ `窗 == 核心`。** 這不是巧合，是定義：固定班表就是「不准早到晚走的彈性班表」。

#### 決策

```prisma
model ShiftPattern {
  // Info: 全部 NOT NULL —— 沒有「只對某一種制度有意義」的欄位
  windowStartMinute   Int   // 最早可認列的上班時刻
  windowEndMinute     Int   // 最晚可認列的下班時刻
  coreStartMinute     Int   // 遲到判定基準
  coreEndMinute       Int   // 早退判定基準
  requiredWorkMinutes Int   // 應工作分鐘（不含休息）
  breakMinutes        Int   // 法定／約定休息
}
```

**沒有 `shiftType` 欄位。** 對照 ADR 019 對 `ProcessTaskType` 的處置：

> 「表名即型別，那個欄位唯一能做的事就是說謊。」

這裡連表都不必拆 —— **型別由值決定**：`windowStart == coreStart && windowEnd == coreEnd` ⇒ 固定班。UI 需要標籤時，由 service 層計算成衍生 DTO 欄位 `ShiftPatternKind`，**不可寫回資料庫**，語意與慣例完全對齊 `src/constants/hr_management.ts` 既有的 `ProcessTaskType`（該註解已明寫「DTO 層的衍生值，DB 沒有這個欄位」）。

#### 這個決策換到的東西

判定引擎**沒有任何 `switch (shiftType)`**：

| 判定 | 統一規則 | 固定班的表現 | 彈性班的表現 |
|---|---|---|---|
| 遲到 | `firstIn > coreStart` | 09:01 打卡 → 遲到 1 分 | 10:01 打卡 → 遲到 1 分 |
| 早退 | `lastOut < coreEnd` | 17:59 → 早退 1 分 | 15:59 → 早退 1 分 |
| 工時不足 | `工作分鐘 < requiredWorkMinutes` | 恆成立即無異常 | 10:00–16:00 只有 360 < 480 → 不足 120 分 |
| 窗外時間 | `punch < windowStart \|\| punch > windowEnd` | 08:00 到班不計入工時 | 06:00 到班不計入工時 |

**四條規則、零分支，覆蓋兩種制度。** 這正是 CLAUDE.md §7 要的「所有計算與判斷收斂到 TypeScript 確定性規則引擎」——分支越少，能出錯的地方越少。

#### 已知取捨

1. **建立固定班表時必須填 6 個欄位而不是 3 個。** 由前端範本解決（選「固定班表」時自動把窗鏡射成核心），不是資料層的問題。
2. **未來若出現「窗與核心無關」的第三種制度**（如責任制），此模型仍容納得下（窗＝全日、核心＝空區間需另議），屆時再評估。

---

### D2. 排班日：單表 + 不變式 —— 為什麼這裡**不**適用 ADR 019 的拆表

#### 問題

逐日排班要能表示三種日子：上班日（掛一個班別）、例假／休息日（沒有班別）、國定假日（沒有班別）。直覺寫法：

```prisma
model EmployeeShiftDay {
  workDate       DateTime
  dayType        WorkDayType   // WORK | REGULAR_OFF | REST_DAY | HOLIDAY | LEAVE
  shiftPatternId String?       // 只有 WORK 有值
}
```

`dayType` 與 `shiftPatternId` 可以矛盾 —— 表面上與 ADR 019 的 `ProcessTask` 完全同型。

#### 為什麼拆表在這裡是**倒退**

若依 ADR 019 拆成 `ScheduledWorkDay`（必填 `shiftPatternId`）與 `ScheduledOffDay`（無此欄位）：

| | 單表 + 不變式 | 拆成兩張表 |
|---|---|---|
| `dayType` 與 pattern 矛盾 | ❌ 需不變式 | ✅ 不可表示 |
| **同一人同一天既排班又排休** | ✅ **`@@unique([accountBookId, employeeId, workDate])` 直接擋掉** | ❌ **兩張表各自唯一，跨表無法約束 —— 變成新的非法狀態** |
| 判定引擎取當日班表 | 一次查詢 | 兩次查詢 + 合併 + 衝突仲裁 |
| 月曆畫面（30 天 × N 人） | 一次查詢 | 兩次查詢 |

**拆表會用一個非法狀態換掉另一個，而且換來的那個更糟：** 「這天到底要不要上班」出現兩個互相矛盾的事實，正是 ADR 019 §1 表格裡評為「最惡劣」的第 3 種狀態；而唯一約束是本模組最強的一條保護（它擋掉的是排班表最常見的操作錯誤：重複匯入）。

> ADR 019 的原話是「**能讓它不可表示，就不要退而求其次讓它可被拒絕**」。此處拆表**做不到**「讓它不可表示」——它只是把不可表示的對象換了一個，同時弄丟一條資料庫層級的保證。判準不是「有沒有 discriminator 欄位」，是「**拆完之後非法狀態的總量有沒有變少**」。

#### 決策

單表 `EmployeeShiftDay`，並新增 `src/repositories/attendance_schedule_invariant.ts`：

```typescript
/**
 * Info: (20260813 - Julian) 排班日的「型別與班別必須一致」不變式。
 *
 * 與 hr_pii_invariant / carbon_envelope_invariant 同一種形狀：
 * 兩個欄位必須一起有值或一起沒有，schema 表達不了，擋在寫入端（repository 是唯一 DB 閘口）。
 *
 * 為什麼不拆表：拆表會弄丟 @@unique([accountBookId, employeeId, workDate])，
 * 用「同日同時排班又排休」換掉「型別矛盾」，非法狀態的總量沒有變少。見計畫書 §D2。
 */
export function assertSchedulableDay(params: {
  dayType: WorkDayType;
  shiftPatternId: string | null | undefined;
}): void {
  const isWorkDay = params.dayType === WorkDayType.WORK;
  const hasPattern = Boolean(params.shiftPatternId);

  if (isWorkDay && !hasPattern) throw new AttendanceScheduleInvariantError(/* … */);
  if (!isWorkDay && hasPattern) throw new AttendanceScheduleInvariantError(/* … */);
}
```

擋在 **repository**（不是 service），理由完全比照 `hr_pii_invariant.ts` 的檔頭：種子腳本、資料遷移、批次匯入、未來的排班表 Excel 匯入都會繞過 service，但都會經過 repository。

#### 兩種指派方式（這才是「排班制」的落點）

| 表 | 用途 | 適用 |
|---|---|---|
| `ShiftAssignmentRule` | 週期性規則：週一～週五掛 A 班，生效區間 `effectiveFrom`/`effectiveTo` | 內勤固定班、彈性工時 |
| `EmployeeShiftDay` | 逐日指派，**優先權高於規則** | 門市／產線輪班、臨時調班、國定假日覆寫 |

**取當日班表的決定論順序**（寫在 `attendance_schedule.service.ts` 的檔頭，不可散落）：

1. `EmployeeShiftDay`（逐日）→ 命中即回傳，**不再往下查**
2. `ShiftAssignmentRule`（週期規則，比對 `effectiveFrom ≤ date ≤ effectiveTo` 且 weekday 命中）
3. 皆無 → `NO_SCHEDULE`（**不是曠職**，見 §7.3 —— 沒排班就沒有應出勤時間，判成曠職是無中生有）

---

### D3. 打卡紀錄不可變 (Append-Only)

#### 決策

`AttendancePunch` **只允許 INSERT**。Repository **不提供** `update` / `delete` 方法（不是「不建議」，是不寫出來）。

理由有三層：

1. **法遵**：出勤紀錄是法定文件（⚠️ 條號待核對），必須保存並可還原任一時點的原始狀態。可被 UPDATE 的紀錄在稽核上等於沒有紀錄。
2. **對齊 ADR 010**：不可變資料管線是本專案既有的架構立場，出勤沒有理由破例。
3. **補登的正確語意**：補登不是「修改當時忘記打的卡」，而是「**事後補一筆有簽核軌跡的紀錄**」。這兩件事在稽核上是天差地別的敘事。

#### 那「打錯卡」怎麼辦

唯一可變的欄位是 `supersededById`（自關聯，`@unique`），由**核准後的補登單**寫入一次：

```
原紀錄 P1 (09:47, GPS)  ──supersededById──▶  新紀錄 P2 (08:47, CORRECTION, 附 requestId)
        ▲ 永久保留，稽核可見                          ▲ 判定引擎只採計未被 supersede 的紀錄
```

- 判定引擎的取數條件恆為 `supersededById IS NULL`
- `AttendancePunch` 沒有 `deletedAt`（軟刪除是可變性的偽裝）
- 稽核查詢可完整重建「原本打了什麼、誰在何時改成什麼、憑哪張單」

---

### D4. 位置是個資 —— `AttendancePunch` 是第 5 張 PII 表（ADR 018 的直接延伸）

> **v1.1 重大簡化**：因為圍欄外一律拒絕（§D6），**每一筆成功的 GPS／NETWORK 打卡都必然落在某個 `WorkLocation` 內**。
> v1.0 為「外勤未命中圍欄」設計的 `coarseGeohash` 欄位**整個移除** —— 那個狀態現在不可達。
> 少一個欄位、少一條分支、少一種要向法務解釋的資料型態。**這是「拒絕」這個產品決策換來的意外紅利。**

#### 問題

ADR 018 為人事模組 13 張表定了分級，**但沒有涵蓋位置資料**，因為當時還沒有這個模組。

而「某員工在 2026-08-13 08:47 位於 25.0330, 121.5654」這筆資料的敏感度**不低於通訊地址**：住址是靜態的一個點，打卡座標序列是**動態的行蹤**。若不處理，位置會以明文落地，直接違反 ADR 018 §1 訂下的判準：

> 「保護強度不該低於它所保護的東西。」

#### 決策一：分級

| 欄位 | 分級 | 加密 | 讀取稽核 | 理由 |
|---|---|---|---|---|
| `latitudeCipher` / `longitudeCipher` | **Tier 2 · CONFIDENTIAL** | ✅ | ➖ | 可識別特定自然人的行蹤；單獨不足以冒用身分或盜金流，故不是 Tier 1 |
| `clientIpCipher` | **Tier 2 · CONFIDENTIAL** | ✅ | ➖ | IP 可反查大致位置與網路身分 |
| `accuracyMeters` | Tier 3 · INTERNAL | ➖ | ➖ | 定位品質指標，不含位置本身 |
| `workLocationId` | Tier 3 · INTERNAL | ➖ | ➖ | 指向的是**公司地點**（辦公室／門市），不是個人座標 |
| `punchedAt` / `punchType` / `workDate` | Tier 3 · INTERNAL | ➖ | ➖ | 出勤事實本身，判定引擎必須直接使用 |

**為什麼 Tier 2 而不是 Tier 1**：ADR 018 對 Tier 1 的定義是「單獨即可用於冒用身分或盜用金流」。座標做不到這件事。分級是為了讓保護強度與後果對齊，不是「感覺很敏感就升級」—— Tier 1 會強制每次讀取寫 `AuditLog`，而現場人數看板每 30 秒查一次，那張表會被沖爆（正是 ADR 018 §6 明確要避免的失敗模式）。

#### 決策二：加密會廢掉查詢，所以保留一個非敏感的衍生欄位

加密後無法在 DB 端做地理範圍查詢 —— 這是 ADR 018 §7 已知取捨第 1 條的同一個問題（`birthday` 加密後失去日期查詢能力），也直接套用它給的解法：

> 「加一個非敏感的衍生欄位，**不要為了查詢把敏感欄位改回明文**。」

因此：**明文只存 `workLocationId`（指向公司地點），精確座標永遠只在密文欄位。**

| 用途 | 讀的欄位 | 需不需要解密 |
|---|---|---|
| 現場人數統計、到班名單、地圖看板（§D10） | `workLocationId` | ❌ 完全不需要 |
| 每日異常判定（§7） | `punchedAt` / `workDate` | ❌ 完全不需要 |
| 員工查自己的打卡紀錄 | `latitudeCipher` … | ✅（免稽核，是自己的資料） |
| HR 調閱單筆爭議紀錄 | 同上 | ✅（**必寫 `AuditLog`**） |

**本模組 95% 的讀取路徑不需要解密任何東西。** 這是把「地點」與「座標」分開存的真正價值 —— 不是為了效能，是為了讓需要明文的路徑少到可以逐一稽核。

#### 決策三：完整沿用 ADR 018 的既有機制（不發明第二套）

1. `piiAlgorithm String @default("AES-256-GCM")` + `piiKeyVersion Int?`
   - **可空**（比照 `Dependent`，而非 `Employee` 的 NOT NULL）：補登產生的 punch 完全沒有密文欄位，若設 NOT NULL 會逼出一個「宣稱用 v1 加密但沒有任何密文」的列 —— 那正是 `assertStorablePii` 第 3 條要擋的反方向。
2. **AAD 綁定**：`AttendancePunch:{id}:{欄位名}:{keyVersion}`，防止密文被搬到別列（ADR 018 §3 補充決策）。
3. **`id` 必須由應用層 `randomUUID()` 產生**，不可依賴 `@default(uuid())` —— 因為 `recordId` 是 AAD 的一部分，而加密發生在 insert 之前。這是 ADR 018 §3 白紙黑字的寫入端要求，漏掉會得到一個「看起來像密文損毀」的驗章失敗。
4. **`HrPiiTable` 新增 `ATTENDANCE_PUNCH = "AttendancePunch"`**
   - ⚠️ **這是本決策最容易被漏掉、後果最不可逆的一步**：`hr_pii.ts` 的註解已寫明該清單是金鑰輪替腳本的巡覽來源，「輪替時漏掉一張表，那張表的資料會在舊金鑰退役後永遠解不開」。
5. **`HR_PII_FIELD_TIER` 新增** `latitudeCipher` / `longitudeCipher` / `clientIpCipher` → `PiiTier.CONFIDENTIAL`。
6. 稽核沿用 `AuditLogDataType.EMPLOYEE_PII` + `AuditLogAction.READ`，`dataId` 一律填 `Employee.id`（ADR 018 §6 原則：調查軸線是「哪些**人**受影響」）。**不新增任何 enum 成員。**

#### 這個選擇防什麼、不防什麼（比照 ADR 018 的誠實表格）

| | 防得住 | 防不住 |
|---|---|---|
| 座標欄位級加密 | `pg_dump`、備份外洩、DBA 直連翻表、唯讀複本外流 | 應用層被攻破（有 API 權限即可取得明文） |
| 只存 `workLocationId` 供查詢 | 同事之間互相窺探精確位置 | 「這個人今天在哪個廠區」本來就是名單功能要回答的（R9），這是需求不是漏洞 |
| 不存歷史軌跡（§D5） | 事後被要求交出「某人上個月去過哪」 | 逐筆打卡紀錄本身仍可拼出**地點層級**的足跡（這是法定紀錄，無法排除） |

---

### D5. 地圖看板的隱私邊界 —— 顯示「在哪個地點」，不顯示「在哪個座標」

> **v1.1 立場調整**：R9 明確要求「到班人員名單」。因此**顯示名單不再是一個需要辯護的隱私妥協，而是一個明確的功能需求**（其正當性見 §D10 的職安論述）。
> 但邊界並沒有因此消失，只是移動了：**名單可以顯示「誰在哪個地點」，仍然不顯示「誰在哪個座標」，也仍然不做軌跡回放。**

#### 決策

| 項目 | 決策 |
|---|---|
| 圖上的點 | `WorkLocation`（辦公室／門市／廠區）。**沒有第二種點** —— 圍欄外打不了卡（§D6），因此不存在「散落各處的個人標記」 |
| 標記上的數字 | 該地點**在班 + 未打下班卡**的人數（§D10）|
| 點開的內容 | 到班人員名單：姓名、工號、部門、職稱、上班打卡時間（**時分，不到秒**） |
| **不回傳** | 精確座標、IP、`accuracyMeters`、任何可拼出座標級軌跡的欄位 |
| 時間範圍 | **只有「已上班且未下班」的當下狀態**。下班打卡後立即從地圖與名單消失 |
| 歷史 | **不提供軌跡回放、不提供「某人昨天在哪個座標」查詢**。歷史查詢一律回到 `AttendanceDailyResult`（工時與異常），那是出勤紀錄不是位置紀錄 |
| 可見範圍 | 由 `AttendancePolicy.mapVisibility` 控制（`ALL_MEMBERS` / `SAME_DEPARTMENT` / `MANAGER_ONLY`） |
| 緊急模式 | 具 `EMERGENCY_ROSTER` 權限者可跨部門取得全帳本名單（§D10.5），**必寫 `AuditLog`** |

#### 為什麼把這些寫進計劃書而不是留給前端

因為「地圖上有小人頭」與「員工監控系統」之間只差一個產品迭代，而那一步通常不會經過架構評審。

**把邊界寫進文件與 API 契約，是唯一能讓它在半年後仍然成立的方式** —— 這與 ADR 018 §3 選擇把「應用層被攻破時加密無效」明白寫進文件是同一個理由：「加密了」很容易被讀成「安全了」，「地圖上看得到同事」也很容易被讀成「可以看到同事的一切」。

具體到程式碼：**`attendance_map.service.ts` 與 `attendance_presence.service.ts` 在 service 層就剝掉座標欄位**，不是靠 API 層或前端不畫；並由 `attendance_map_contract.test.ts` 以鍵名斷言擋住未來的回歸（§11 T10）。

> ⚠️ **法遵前置**：位置蒐集與同仁間揭露屬個資蒐集目的之一，**上線前必須更新 `documents/legal/privacy_policy.md` 並取得員工告知同意**（條號待核對）。此為 Phase 4 的**阻斷性**交付項，不是 nice-to-have。

---

### D6. 圍欄外一律拒絕 —— 到班的定義就是「人在登記的地點」

> **v1.1 決策（原 Q5）：圍欄外打卡 → 拒絕，回 `FO_PUNCH_OUT_OF_FENCE`（403）。**

#### 這個決策的立論

需求原文寫得很清楚：

> 「可設定打卡地理位置範圍限制，**確保人員真的抵達現場才能打卡**。」

因此**圍欄不是一個「事後標記可疑」的風險指標，它是「到班」這個事實的定義本身**。人不在登記的地點，不是「到班了但有疑慮」，是**到班這件事沒有發生**。系統記錄一筆「不在現場的到班」，記錄的是一件不存在的事 —— 那與 CLAUDE.md 的零捏造原則直接衝突。

這也是 R9（現場人數與名單）能夠成立的前提：**若允許圍欄外打卡，「現場有幾個人」這個數字立刻失去意義**，而那個數字在緊急疏散時是要拿來對人頭的（§D10）。

#### 一條必須劃清楚的界線

拒絕的範圍**僅限於圍欄判定本身**。其他護欄不得援引本決策一併升級為拒絕：

| 護欄 | 性質 | 處置 | 為什麼 |
|---|---|---|---|
| **圍欄命中與否** | 對「到班事實」的**定義** | ❌ **拒絕** | 不在現場，事實不成立 |
| 瞬移偵測 (G5) | 對「紀錄可信度」的**推測** | ⚠️ 收下並標記 | 人**確實**在圍欄內（否則早被 G4 擋掉）。一個成立的現場事實，不該被一個啟發式推測否認 |
| 定位精度不足 (G3) | **證據品質**不足以判定 | ❌ 拒絕 | 不是判他沒到，是**還無法判定他到了** —— 錯誤訊息必須寫成「請到訊號較佳處重試」，不是「你不在現場」 |

**這條界線是本決策最重要的部分。** 「拒絕」一旦被當成通則，下一個護欄很容易被順手改成拒絕，而 G5 那種有誤判率的啟發式一旦拒絕，就會出現「員工真的到了公司卻打不了卡」—— 那才是這個系統唯一不能發生的事。

#### 決定論護欄（全部在 Service 層，全部可單元測試）

打卡端點的前提：**瀏覽器回報的座標可以被竄改。** DevTools 的 Sensors 面板可以直接覆寫 `geolocation`，這是官方功能，不需要任何攻擊技巧。這與 CLAUDE.md §7 對 LLM 的立場完全同構：**永遠不直接採信客戶端數值，必須與後端護欄交叉驗證。**

| # | 護欄 | 擋掉什麼 | 觸發後的行為 |
|---|---|---|---|
| G1 | **時間由伺服器產生**，`punchedAt` 不接受任何 client 傳入值 | 竄改打卡時間（最高價值的攻擊） | 無從發生 |
| G2 | 圍欄判定用 `calculateDistanceKm` 在**伺服器**算，client 不參與 | 前端繞過判定 | 無從發生 |
| G3 | `accuracyMeters > policy.maxAccuracyMeters` | 用 IP 粗定位假裝成 GPS | ❌ `VA_PUNCH_LOW_ACCURACY`（400），訊息為「定位精度不足，請重試」 |
| **G4** | **座標未落入任何 `WorkLocation` 圍欄** | **不在現場打卡** | ❌ **`FO_PUNCH_OUT_OF_FENCE`（403），回傳最近地點名稱與距離供使用者理解** |
| G4b | `policy.requireNetworkMatch` 開啟時，GPS 命中還須 IP 落在該地點的 CIDR | 純座標偽造 | ❌ `FO_PUNCH_NETWORK_MISMATCH`（403） |
| G5 | **瞬移偵測**：與同員工前一筆打卡的隱含速度 > `policy.maxImpliedSpeedKmh`（預設 300 km/h） | 座標跳躍 | ⚠️ 照常收下，標記 `SUSPICIOUS_JUMP` 異常供 HR 覆核 |
| G6 | 限流 bucket `ATTENDANCE_PUNCH`（✅ 已實作 2026-08-17） | 腳本連續打卡 | ❌ `RATE_LIMIT`（429） |
| G7 | 每工作日每型別的重複打卡收斂為「最早 IN／最晚 OUT」 | 誤觸多打 | 不報錯，判定引擎自行收斂 |

#### D6.4 拒絕之後，外勤怎麼辦（必答題）

「拒絕」如果沒有配套，第一週就會被現場推翻。三條既有路徑，**不需要任何新模型**：

| 情境 | 路徑 |
|---|---|
| 常態性的第二現場（客戶駐點、工地、門市） | HR 建檔為 `WorkLocation`。這本來就該建檔 —— 否則那個地點也不會出現在現場人數看板上 |
| 短期出差／臨時外訪 | HR 建立帶 `validFrom` / `validUntil` 的臨時 `WorkLocation`（過期後不再接受打卡，但歷史紀錄保留） |
| 完全臨時、來不及建檔 | **走補登申請單**（§D9）。人在圍欄外打不了卡，事後由主管確認到班事實 —— **「到班」由知情的人簽核，而不是由一個可被竄改的座標宣稱**。這與拒絕的立場完全一致 |

> `WorkLocation.validFrom` / `validUntil` 是為此新增的兩個欄位。它們讓「臨時地點」不需要一個 `isTemporary` 布林值 —— 有效期本身就說明了它是不是臨時的（同 §D1 的思路：不存可由值推導的判別欄位）。

#### 明確不防

| 攻擊 | 為什麼不防 |
|---|---|
| 同事代打（把手機交給同事） | 需生物特徵，屬本期排除範圍（§1.2）。緩解是 G4b 網段雙因子與異常統計，不是消除。**這是本模組最大的殘餘風險，必須在驗收時向業務明說** |
| 在圍欄內但實際沒工作 | 不屬打卡系統的職責範圍 |
| 企業 VPN 造成 IP 與實體位置不符 | 這是**誤判**風險不是攻擊；由 `requireNetworkMatch` 預設關閉、逐地點開啟來控制 |
| 室內定位漂移 | 由 `radiusMeters` 的合理下限（**建議 ≥ 100 m，因為現在誤判的代價是打不了卡**）與 G3 共同吸收 |

> **圍欄半徑的預設值因本決策而必須放寬。** v1.0 建議 ≥ 50 m 是在「圍欄外只是標記」的前提下；改為拒絕之後，半徑訂太小的成本從「多一筆待覆核異常」變成「員工站在公司門口打不了卡」。**Phase 4 UAT 必須實地量測每個地點的 GPS 漂移範圍再定值**，不可沿用文件上的預設。

---

### D7. 異常判定是純函數，且**完全不使用 LLM**

#### 決策

`src/lib/attendance_rules.ts` 匯出一支純函數：

```typescript
export function evaluateAttendanceDay(
  input: IAttendanceDayInput,   // 班表 + 當日 punches + policy + 假日
): IAttendanceEvaluation;       // 異常清單 + 工時分鐘 + engineVersion
```

- **無 DB 存取、無 I/O、無 `Date.now()`**（「現在」由呼叫端注入 `evaluatedAt`）
- 同一輸入永遠得到同一輸出 → 可重算、可回溯、可用表格驅動測試窮舉
- **本模組不呼叫任何 LLM。** CLAUDE.md §7 明令「嚴禁 LLM 算數學、做邏輯判斷」，而出勤判定是純粹的區間運算 —— 這裡連「AI 可以幫忙」的想像空間都不該留下。若未來要做「異常原因的自然語言摘要」，那是**表達層**，不得回頭影響 `AttendanceException` 的任何一個值。

#### 可重算性與 `engineVersion`

`AttendanceDailyResult` 帶 `engineVersion Int` 與 `evaluatedAt`。

規則改版（例如遲到寬限從 5 分改為 0 分）時，**舊結果不就地改寫**，而是重算並更新 `engineVersion` —— 稽核問「為什麼去年這天判成遲到、今年同樣的打卡判成正常」時，答案在欄位裡，不在某個人的記憶裡。這與 `piiAlgorithm` 版本化欄位是同一個心智模型。

---

### D8. 工作日歸屬 —— 跨夜班的唯一難題

#### 問題

大夜班 22:00 上班、次日 06:00 下班。這兩筆 punch 分屬兩個日曆日，但屬於**同一個工作日**。若以日曆日分組，每個大夜班員工每天都會被判成「上班沒下班 + 下班沒上班」兩筆異常。

#### 決策

1. `AttendancePunch.workDate String`（`"YYYY-MM-DD"`，**明文、Tier 3**）：由 service 在**寫入時**決定論計算並固化，判定引擎只依它分組。
2. 歸屬規則：punch 的當地時刻落在 `[班別窗起 − 寬限, 班別窗迄 + 寬限]` 內 → 歸屬該班別的 `workDate`。跨日班的窗迄以 `minute ≥ 1440` 表示（如 06:00 記為 1800）。
3. **時區一律取 `AttendancePolicy.timeZone`**，絕不使用伺服器本地時區。
4. 日期字串處理沿用 `src/lib/utils/hr_date.ts` 的既有語意（該檔檔頭已寫明 `new Date("2026-08-10")` 會被當 UTC 午夜解析、在 UTC 以西時區退一天的陷阱）。
5. **`npm run test:tz` 必須涵蓋本模組**：至少跑 `Asia/Taipei`、`UTC`、`America/Los_Angeles`（含日光節約切換日）三組。`hr_date.tz.test.ts` 與 `hr_employee.tz.test.ts` 已建立這個慣例，出勤是比到職日更容易踩的地雷。

#### 時刻的儲存型別：`Int`（分鐘）而非 `DateTime`

班別的「09:00」是一個**時刻概念**，不是一個時間點。用 `DateTime` 存會被迫綁一個沒有意義的日期，而那個日期會在時區轉換時產生真實的偏移。`Int` 分鐘（0–2879，≥1440 表次日）沒有這個問題，且跨日表達是自然的。

---

### D9. 補登申請單的職責分離 (SoD)

對齊 ADR 009（Zero-Trust 與 SoD）與內控框架的「控制活動」要求：

| 規則 | 落點 | 違反時 |
|---|---|---|
| **不得自我核准**：`reviewerId ≠ employeeId` | Service fail fast | `FO_SELF_APPROVAL_FORBIDDEN`（403） |
| 核准者須為申請人的 `manager` 或具 HR 角色 | Service（讀 `Employee.managerId`） | `FO_NOT_AUTHORIZED_REVIEWER`（403） |
| 已核准／已駁回的單不可再改 | Service + 狀態機 | `VA_REQUEST_ALREADY_REVIEWED`（400） |
| `APPROVED`/`REJECTED` 必須有 `reviewerId` + `reviewedAt` | Repository 不變式 `assertReviewedRequest` | `AttendanceRequestInvariantError` |
| 補登跨度上限（預設 30 天內） | Service（`policy.maxCorrectionBacklogDays`） | `VA_CORRECTION_TOO_OLD`（400） |
| 核准後產生的 punch 必須帶 `correctionRequestId`，且**不得帶任何位置密文** | Repository 不變式 | 見 §4.3 第 3 條 |

**跨帳本一致性**：申請單、員工、班別的 `accountBookId` 必須一致 —— 這是 ADR 019 §5 第 3 條點名的同一類問題（「拆表擋不掉，屬跨表一致性，由 service 層 fail fast」），本模組所有多外鍵的表都適用。

> **v1.1 補充：補登單的角色變重了。** 圍欄外一律拒絕之後，補登單從「忘記打卡的補救措施」變成「**外勤到班事實的唯一入口**」（§D6.4）。因此 Phase 3 必須把它當一級功能做完整（含推播通知主管、待審清單、批次核准），不能當附屬功能。

---

### D10. 現場在班狀態 —— `AttendancePresence`（v1.1 新增）

> R9：**明確掌握現場工作人數、到班人員名單。**

#### D10.1 為什麼需要一張表，而不是每次從 punch 推導

「誰現在在班」完全可由 `AttendancePunch` 推導：取每人當日最新一筆，是 `CLOCK_IN` 且無後續 `CLOCK_OUT` 即在班。

**推導是正確的，但每次推導不可行**：那是一個「每位員工取最新一筆」的 window function，而現場人數看板每 30 秒查一次、緊急點名時要在幾秒內回全帳本名單。

本專案已有同一個問題的既有解法：`model UserStorageUsage` 的註解寫得很直接 ——「**配額檢查 O(1) 讀**」。那張表存的也是完全可由附件明細加總推導的數字，存下來的理由就是不想每次加總。

**決策：`AttendancePresence` 是 `AttendancePunch` 的派生快取，不是第二個真相。** 三條規矩：

1. **同交易寫入**：punch 寫入與 presence upsert 在**同一個 Prisma transaction** 內。分開寫就會出現「打了卡但沒進名單」——而那正好是緊急點名時最不能發生的狀態。
2. **可重建**：提供 `rebuildPresence(accountBookId, workDate)`，從 punch 完整重算。**這支函數是這張表的正當性來源** —— 一張無法從真相重建的快取，就是第二個真相。
3. **勾稽**：每日判定 Worker 順便對帳（presence 在班人數 vs 由 punch 推導的人數），不一致即告警。這是 ADR 015 團隊錢包「append-only Ledger + 守恆勾稽」的同一種形狀，只是這裡守恆的是人數不是點數。

#### D10.2 資料模型

```prisma
/**
 * Info: (20260813 - Julian) 現場在班狀態。**AttendancePunch 的派生快取，不是第二個真相。**
 *
 * 存在的唯一理由是 O(1) 讀（比照 UserStorageUsage）：現場人數看板每 30 秒查一次、
 * 緊急疏散點名要在幾秒內回全帳本名單，而每次都跑「每人取最新一筆」的 window function 不可行。
 *
 * 三條規矩見計畫書 §D10.1：與 punch 同交易寫入、可由 rebuildPresence 完整重建、每日勾稽對帳。
 */
model AttendancePresence {
  id String @id @default(uuid())

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])
  employeeId    String      @map("employee_id")
  employee      Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  // Info: (20260813 - Julian) 必填 —— 圍欄外打不了卡（§D6），因此在班必然有地點
  workLocationId String       @map("work_location_id")
  workLocation   WorkLocation @relation(fields: [workLocationId], references: [id])

  status    PresenceStatus // ON_SITE | STALE
  // Info: (20260813 - Julian) 上班打卡時間；名單上顯示到分，不到秒
  since     DateTime
  workDate  String   @map("work_date")
  // Info: (20260813 - Julian) 來源 punch，供勾稽與重建時比對
  sourcePunchId String @map("source_punch_id")

  updatedAt DateTime @updatedAt @map("updated_at")

  // Info: (20260813 - Julian) 一人最多一筆在班狀態。下班打卡即刪除該列（不是標記，見 §D10.4）
  @@unique([accountBookId, employeeId])
  @@index([accountBookId, workLocationId])
  @@map("attendance_presence")
}
```

新增 enum `PresenceStatus { ON_SITE, STALE }`。

#### D10.3 `presenceStaleGraceMinutes` 在回答什麼問題

這個參數的名字取得不夠白話，而訂值的人需要先知道它在解決什麼，才有辦法給出一個數字。

##### 它解決的問題：有人忘記打下班卡

現場名單的資料來源只有打卡紀錄：打上班卡 → 進名單，打下班卡 → 出名單。

問題出在**下班卡沒打**的情況（走得急、手機沒電、直接從客戶端下班回家）。這時系統手上只有一筆上班卡，然後就沒有下文了。這個人要怎麼顯示？

兩個直覺選項都是錯的：

| 做法 | 後果 |
|---|---|
| **一直當他在現場** | 名單只進不出。週五早上打開看到「現場 187 人」，其實是過去兩週忘記打下班卡的人全部堆在那裡。**這張名單就廢了** |
| **立刻當他不在** | 但他可能真的還在加班。緊急疏散點名漏掉一個還在樓裡的人，**這是這套系統最不能犯的錯** |

`presenceStaleGraceMinutes` 就是這兩者之間的那條線：**「等多久之後，系統承認自己不知道這個人還在不在」**。

##### 因此 `STALE` 的語意是「我不知道」，不是「他不在」

| 狀態 | 系統的認知 | 怎麼來的 |
|---|---|---|
| `ON_SITE` 🟢 | **我知道他在** | 打了上班卡，還沒到該下班的時間 |
| `STALE` 🟡 | **我不知道他在不在** | 該下班的時間過了 + 緩衝，仍沒有下班卡 |
| 不在名單上 | **我知道他走了** | 打了下班卡 |

`STALE` 不是懲罰、不是異常標記，是**誠實**。這也是 §D10.4 堅持「`STALE` 不從名單移除」的原因 —— 這些人恰恰是緊急點名時要**優先打電話確認**的對象。

##### 時間軸

```
班別 09:00–18:00，presenceStaleGraceMinutes = 30

09:05  打上班卡              → 🟢 ON_SITE
18:00  下班時間到             → 🟢 仍是 ON_SITE（緩衝中）
18:12  打下班卡              → 從名單消失 ✅ 正常結束

—— 如果他忘了打 ——

18:00  下班時間到             → 🟢 ON_SITE
18:30  緩衝用完，仍無下班卡     → 🟡 STALE（系統承認自己不知道）
```

**緩衝存在的理由**：18:00 準時下班的人，走到門口掏出手機打卡可能已經 18:03。沒有緩衝的話，**每一位正常下班的人都會先閃一下黃燈才消失**，看板會一直在跳，而黃色因此失去意義。緩衝就是「還在收拾東西」的合理時間。

##### 怎麼訂這個值

判準是：**「超過這個時間還沒打卡，就真的不太可能只是還在加班」的那個點。**

- 訂太短 → 常態加班到 20:00 的公司，整層樓在 18:30 集體變黃。黃色一旦變成常態就沒人看了
- 訂太長 → 緊急點名時拿到的名單裡混著早就下班回家的人，而點名的價值正在於準確

因此它與**公司的加班文化**直接相關，不是一個可以抄別人的數字。訂值前建議先觀察一週的 `MISSING_CLOCK_OUT` 分佈（§7.2 第 7 條），看實際忘記打卡的人都是幾點離開的。

> **⚠️ Demo 版刻意改掉了這個參數的基準點。** Demo 沒有班表，因此不知道誰幾點該下班，改為從**上班打卡**起算 3 分鐘 —— 純粹為了讓觀眾在演示中看到狀態轉換。
> 那個語意問的是「打卡多久了」，本節問的是「該走了嗎」，**是兩個不同的問題共用一個變數名**。詳見 `attendance_demo_plan.md` §3.2，該處以 `Deprecated:` 標記要求正式版整段移除。

##### 它與「漏打卡異常」是兩回事

同一件事（忘記打下班卡）在系統裡會產生兩個東西，容易混淆：

| | `PresenceStatus.STALE` | `AttendanceExceptionType.MISSING_CLOCK_OUT` |
|---|---|---|
| 屬於 | 即時現場狀態（`AttendancePresence`） | 當日出勤判定（`AttendanceDailyResult`） |
| 什麼時候算 | 當下 | 當天結束後，由判定 Worker 產生（§8.2） |
| 給誰看 | 保全、職安、部門主管 | HR、員工本人 |
| 要做什麼 | **現在**打電話確認人還在不在 | **事後**走補登申請單修正工時（§D9） |
| 受哪個參數控制 | `presenceStaleGraceMinutes` | 判定表第 7 條的「窗迄 + 寬限」 |

一個回答「樓裡現在還有誰」，一個回答「這天的工時怎麼算」。**兩個寬限值可以不同，也建議不同** —— 前者服務於安全（寧可早一點承認不知道），後者服務於工時計算（寧可晚一點判定異常）。

#### D10.4 生命週期（三個轉換，沒有第四個）

| 事件 | 動作 |
|---|---|
| `CLOCK_IN` 成功 | upsert 一列，`status = ON_SITE` |
| `CLOCK_OUT` 成功 | **刪除該列** |
| 超過班別窗迄 + `policy.presenceStaleGraceMinutes` 仍未下班打卡 | Worker 標記 `status = STALE` |

**為什麼下班是刪除而不是標記為 `OFF_SITE`**：這張表回答的問題是「現在誰在現場」。一個標記為「不在現場」的列，對這個問題沒有任何貢獻，卻會讓每一支查詢都必須記得加 `WHERE status != 'OFF_SITE'` —— 而遲早有一支會忘記。歷史在 `AttendancePunch` 裡，不在這裡。

**`STALE` 為什麼不刪除**：忘記打下班卡的人，**很可能真的還在現場**（尤其加班時）。直接移除會讓緊急點名漏掉他。標成 `STALE` 讓看板可以分兩欄呈現：

```
台北總部   在班 42 人  ⚠️ 未打下班卡 3 人
```

這三個人是點名時**最需要優先確認**的對象 —— 系統不知道他們在不在，這件事本身就是要傳達的資訊。**把「不確定」顯示成「不在」是這類系統最危險的失真。**

#### D10.5 功能與端點

| 功能 | 端點 | 說明 |
|---|---|---|
| 現場人數總覽 | `GET /presence` | 各 `WorkLocation` 的 `ON_SITE` / `STALE` 人數；地圖看板與儀表板共用 |
| 到班人員名單 | `GET /presence/location/[location_id]` | 姓名、工號、部門、職稱、上班時間（到分）、`status` |
| 我的部門誰在班 | `GET /presence?scope=department` | 受 `mapVisibility` 約束 |
| **緊急疏散點名匯出** | `POST /presence/roster/export` | CSV／PDF，含地點、名單、產出時間戳、**產出者** |
| 個人狀態 | `GET /today` | 我現在算不算在班 |

**緊急點名匯出是本功能的正當性核心。** 職安場景下，「現場有幾個人、分別是誰」是必須在事故當下答得出來的問題（⚠️ 條號待核對）。這個定位也決定了三件事：

1. **匯出必寫 `AuditLog`**（`EMPLOYEE_PII` / `READ`）—— 它一次讀出全帳本的在班名單，是本模組批次讀取量最大的動作。
   **`dataId` 填每一位被列出的員工，一人一筆**（`createManyAuditLogs`）

   > **v1.3 更正（實作 W7 時發現）**：本項原本寫「`dataId` 填**操作者**的 `Employee.id`」，
   > 那與 `AuditLogDataType.EMPLOYEE_PII` 這個 enum 自己的契約矛盾 ——
   > 它的註解寫得很清楚：「`dataId` 一律填**所屬**的 `Employee.id`……
   > 個資外洩事故的調查軸線是『哪些**人**受影響』，不是『哪張表被讀』。」
   >
   > 依原文只寫一筆、把操作者填進 `dataId`，會讓「這名員工的資料被誰看過」
   > 這個最常被問的問題完全答不出來 —— 而那正是這條稽核存在的唯一理由。
   > 操作者本來就記在 `AuditLog.userId` 裡，不需要佔用 `dataId`。
2. **匯出需獨立權限 `EMERGENCY_ROSTER`**，不隨 `mapVisibility` 放寬。日常看板與緊急點名是兩種東西
3. **匯出檔案含產出時間戳與產出者**：事故調查時，「這份名單是幾點幾分產出的」與名單本身同等重要

> **這個框架也回答了 §D5 的隱私質疑**：現場人數與名單不是為了讓主管知道誰在座位上，是為了火災時知道樓裡還有誰。**兩者的資料完全相同，差別在於誰能看、看多久、留不留痕** —— 而那三件事全部寫在 §D5 與本節裡。

#### D10.6 已知失真

| 失真 | 影響 | 緩解 |
|---|---|---|
| 打了上班卡但已離開現場（未打下班卡） | 人數高估 | `STALE` 標記 + 看板分欄顯示 |
| 在現場但忘了打上班卡 | **人數低估（較危險）** | 補登單事後修正；**看板須顯示「今日應到未打卡」人數**作為對照，讓使用者知道這個數字的不確定性從哪來 |
| **「應到未打卡」分不到地點** | 工地主任看不到「我這個工區今天少了誰」 | 這些人沒有打卡，系統手上沒有任何座標，而 `EmployeeShiftDay` 也沒有地點欄位 —— 硬分配就是捏造。**正解是排班帶上預定工區**（或給員工一個預設工地），見下方 ToDo |
| 跨夜班在午夜的歸屬 | 人數短暫錯亂 | presence 以 `workDate` 綁定，跨日不重置（§D8） |

> **ToDo（v1.3，實作 W7 時發現）：`EmployeeShiftDay` 需要一個地點欄位。**
>
> 沒有它，「應到未打卡」只能給全帳本一個總數。而對工程機關，
> 「第一工務所今天少了三個人」與「全處少了三個人」是完全不同的兩件事 ——
> 前者有人要立刻打電話，後者只是一個數字。
>
> 這個欄位同時也讓排班月曆能直接回答「明天誰在哪個工區」，
> 而那是排班本來就該回答的問題。加上去之後，圍欄判定仍然以實際座標為準
> （護欄 G2 不變），排班上的地點只用於**預期**，不參與**認定**。

**「應到未打卡」這個對照數字是必要的，不是加分項。** 一個只顯示「在班 42 人」的看板，會讓人以為現場就是 42 個人；顯示「在班 42 ／ 應到未打卡 3 ／ 未打下班卡 3」才誠實地表達了「系統知道什麼、不知道什麼」——這與 ADR 018 把「防不住什麼」寫進文件是同一種誠實。

---

## 🗄️ 4. 資料模型草案

> 完整可貼上的 `schema.prisma` 片段見附錄 A（`documents/architecture/attendance_schema_draft.prisma`，Phase 1 產出）。以下為結構與關鍵約束。

### 4.1 新增 Enum（9 個）

| Enum | 成員 | 是否有程式碼分支 |
|---|---|---|
| `WorkDayType` | `WORK` / `REGULAR_OFF`（例假） / `REST_DAY`（休息日） / `HOLIDAY`（國定） / `LEAVE`（請假，銜接假勤模組） | ✅ 判定引擎依此決定是否需要出勤 |
| `PunchType` | `CLOCK_IN` / `CLOCK_OUT` | ✅ |
| `PunchVerification` | `GPS` / `NETWORK` / `CORRECTION` | ✅ 決定哪組證據欄位必填（不變式） |
| `AttendanceExceptionType` | `LATE` / `EARLY_LEAVE` / `ABSENT` / `MISSING_CLOCK_IN` / `MISSING_CLOCK_OUT` / `INSUFFICIENT_HOURS` / `SUSPICIOUS_JUMP` | ✅ |
| `AttendanceDayStatus` | `NORMAL` / `EXCEPTION` / `NO_SCHEDULE` / `OFF_DAY` | ✅ |
| `CorrectionRequestStatus` | `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` | ✅ |
| `NetworkIdentifierKind` | `IP_CIDR` / `WIFI_BSSID` | ✅ 決定 `value` 的解析與驗證方式 |
| `MapVisibility` | `ALL_MEMBERS` / `SAME_DEPARTMENT` / `MANAGER_ONLY` | ✅ |
| **`PresenceStatus`** | `ON_SITE` / `STALE` | ✅ 看板分欄、點名優先序（§D10.3–4） |

> **v1.1 移除**：`AttendanceExceptionType.OUT_OF_FENCE`。圍欄外的打卡不會進入資料庫（§D6），因此它不可能成為一筆「事後發現的異常」—— 留著只會讓人以為系統允許那種紀錄存在。

> **判準複述**（ADR 019 §6）：「不是『看起來像不像列舉』，是『有沒有程式碼拿它做分支』。」
> 因此 `WorkLocation.name`、`AttendanceCorrectionRequest.reason` 維持 `String` —— 那是自由文字，不進任何判斷。
>
> **9 個 enum 全部登記進 `src/__tests__/hr_enum_mirror.test.ts` 的 `MIRRORED`**；
> §D1 的衍生值 `ShiftPatternKind`（schema 沒有對應 enum）登記進同一支測試的 **`UI_ONLY`** ——
> 慣例已由 `ProcessTaskType` 建立：覆蓋率檢查會把未登記的前端 enum 報成「漏了鏡像」，
> 而 `ShiftPatternKind` 恰恰是**刻意**沒有 schema 對應物的那一種。

### 4.2 新增 Model（11 張）

| # | Model | 一句話 | 關鍵約束 |
|---|---|---|---|
| M1 | `AttendancePolicy` | 帳本級出勤政策（時區、寬限、圍欄參數、地圖可見性） | `accountBookId @unique`（一帳本一筆） |
| M2 | `WorkLocation` | 打卡地點與地理圍欄 | `@@unique([accountBookId, code])`；`latitude`/`longitude`/`radiusMeters` **必填**；`validFrom`/`validUntil` 供臨時地點（§D6.4） |
| M3 | `WorkLocationNetwork` | 地點的網段／BSSID 白名單 | 必填外鍵 → `WorkLocation`；`kind` 決定 `value` 格式 |
| M4 | `ShiftPattern` | 班別定義（窗／核心／應工作分鐘，§D1） | `@@unique([accountBookId, code])`；**六個時刻欄位全部 NOT NULL** |
| M5 | `ShiftAssignmentRule` | 週期性班表指派 | `@@index([accountBookId, employeeId, effectiveFrom])` |
| M6 | `EmployeeShiftDay` | 逐日排班／劃休（優先於 M5） | **`@@unique([accountBookId, employeeId, workDate])`** ← 本模組最重要的一條約束 |
| M7 | `AttendancePunch` | 打卡紀錄（append-only、含加密位置） | `@@index([accountBookId, employeeId, workDate])`；`supersededById @unique` |
| M8 | `AttendanceDailyResult` | 每日判定結果（可重算） | `@@unique([accountBookId, employeeId, workDate])` |
| M9 | `AttendanceException` | 單日的多筆異常（M8 的子表） | 必填外鍵 → M8，`onDelete: Cascade` |
| M10 | `AttendanceCorrectionRequest` | 補打卡申請單 | 必填 `employeeId`；`reviewerId?`；狀態機 |
| **M11** | **`AttendancePresence`** | **現場在班狀態（派生快取，§D10）** | **`@@unique([accountBookId, employeeId])`**；`workLocationId` **必填** |

> M9 獨立成表是因為**一天可以同時遲到又早退**——把它壓成 `AttendanceDailyResult` 上的一個 enum 欄位，會逼出「哪個異常比較重要」這個沒有答案的問題；壓成一排 boolean 欄位則每加一種異常就要改 schema。

**`AccountBook` 需新增 11 個反向關聯欄位**（比照現有人事 14 張表的寫法，集中在同一個 `// Info:` 區塊內）。

### 4.3 `AttendancePunch` 詳細設計（本模組最關鍵的一張表）

```prisma
/**
 * Info: (20260813 - Julian) 打卡紀錄。**Append-Only**：repository 不提供 update / delete。
 *
 * ## 為什麼不可變
 * 出勤紀錄是法定文件（⚠️ 條號待法務核對），必須能還原任一時點的原始狀態。
 * 打錯卡不是「改掉那筆」，而是由核准後的補登單產生新紀錄並回頭寫 supersededById——
 * 原紀錄永久保留。判定引擎恆以 supersededById IS NULL 取數。
 *
 * ## 為什麼每一筆都有 workLocationId
 * 圍欄外一律拒絕（計畫書 §D6）：座標未落入任何圍欄的打卡不會走到寫入這一步。
 * 因此 GPS / NETWORK 來源的紀錄必然掛得上地點，「散落在圍欄外的打卡」這個狀態不存在。
 * 這讓現場人數與到班名單（§D10）成為可信的數字——若允許圍欄外打卡，那個數字沒有意義。
 *
 * ## 為什麼位置是密文
 * 「某人某時在某座標」是行蹤資料，敏感度不低於通訊地址（ADR 018 Tier 2）。
 * 加密後失去 DB 端地理查詢能力，解法比照 ADR 018 §7 對 birthday 的處置：
 * 查詢改讀非敏感的 workLocationId，**不要為了查詢把座標改回明文**。
 *
 * ## 為什麼不拆成 GpsPunch / NetworkPunch / CorrectionPunch
 * ADR 019 拆表的代價是「我的待辦要查兩張表」，那是可接受的。
 * 這裡拆會變成三張表，而本表是全模組讀取最頻繁的一張（每日判定 × 全員 × presence 勾稽）。
 * 因此改由 attendance_punch_invariant 擋在寫入端，理由與 hr_pii_invariant 同形。
 */
model AttendancePunch {
  // Info: (20260813 - Julian) id 必須由應用層 randomUUID() 產生 —— 它是 PII 加密 AAD 的一部分，
  // Info: (20260813 - Julian) 而加密發生在 insert 之前，等不到 @default(uuid())。見 ADR 018 §3。
  id String @id

  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])
  employeeId    String      @map("employee_id")
  employee      Employee    @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  punchType    PunchType         @map("punch_type")
  verification PunchVerification
  // Info: (20260813 - Julian) 伺服器時間，絕不接受 client 傳入（護欄 G1）
  punchedAt    DateTime          @map("punched_at")
  // Info: (20260813 - Julian) 歸屬工作日 "YYYY-MM-DD"，跨夜班靠它分組；寫入時由 service 決定論固化
  workDate     String            @map("work_date")

  /**
   * Info: (20260813 - Julian) 打卡當下命中的地點。
   *
   * 型別是可空的，但業務上只有 verification = CORRECTION 時才會是 null——
   * 補登發生在事後，當下沒有位置可言。GPS / NETWORK 必填由不變式擋（§4.3 第 1、2 條）。
   *
   * 之所以不設 NOT NULL，是因為那會讓補登這條合法路徑無法寫入；
   * 而把 CORRECTION 拆成另一張表的代價見本表檔頭。
   */
  workLocationId String?       @map("work_location_id")
  workLocation   WorkLocation? @relation(fields: [workLocationId], references: [id], onDelete: Restrict)

  // Info: (20260813 - Julian) --- 位置證據（Tier 2 機密，密文入庫；分級見計畫書 §D4）---
  latitudeCipher  String? @map("latitude_cipher")
  longitudeCipher String? @map("longitude_cipher")
  clientIpCipher  String? @map("client_ip_cipher")
  // Info: (20260813 - Julian) 定位品質，不含位置本身，明文
  accuracyMeters  Int?    @map("accuracy_meters")
  // Info: (20260813 - Julian) 打卡當下與圍欄中心的距離（公尺）。明文：它是「有多接近」不是「在哪裡」，
  // Info: (20260813 - Julian) 且爭議發生時「當時距離中心 87 公尺」是免解密就能回答的關鍵事實
  distanceMeters  Int?    @map("distance_meters")

  // Info: (20260813 - Julian) 個資封裝參數，語意同 Employee
  piiAlgorithm  String @default("AES-256-GCM") @map("pii_algorithm")
  // Info: (20260813 - Julian) 可空（比照 Dependent）：補登 punch 沒有任何密文欄位，
  // Info: (20260813 - Julian) 標了代次會踩到 assertStorablePii 第 3 條（無密文卻有代次）
  piiKeyVersion Int?   @map("pii_key_version")

  // Info: (20260813 - Julian) 補登來源；verification = CORRECTION 時必填（不變式）
  correctionRequestId String?                      @map("correction_request_id")
  correctionRequest   AttendanceCorrectionRequest? @relation(fields: [correctionRequestId], references: [id])

  // Info: (20260813 - Julian) 本紀錄被哪一筆取代。唯一可被 UPDATE 的欄位，且只寫一次
  supersededById String?          @unique @map("superseded_by_id")
  supersededBy   AttendancePunch? @relation("PunchSupersede", fields: [supersededById], references: [id])
  supersedes     AttendancePunch? @relation("PunchSupersede")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([accountBookId, employeeId, workDate])
  @@index([accountBookId, workDate])
  @@index([workLocationId])
  @@map("attendance_punch")
}
```

**`attendance_punch_invariant.ts` 檢查四組組合**（與 `assertStorablePii` 疊加呼叫，不取代它）：

| # | 條件 | 擋掉的終態 |
|---|---|---|
| 1 | `verification = GPS` ⇒ `latitudeCipher`、`longitudeCipher`、**`workLocationId`** 皆有值 | 一筆宣稱 GPS 定位卻沒有座標或沒有地點的紀錄。**後者尤其嚴重：它會讓現場人數少算一個人** |
| 2 | `verification = NETWORK` ⇒ `clientIpCipher` 與 `workLocationId` 皆有值 | 同上 |
| 3 | `verification = CORRECTION` ⇒ `correctionRequestId` 有值，**且三個密文欄位與 `workLocationId` 皆為空** | 沒有簽核軌跡的補登紀錄；以及補登卻帶著位置證據 —— 那必然是偽造的，補登當下人不在現場 |
| 4 | `distanceMeters` 有值 ⇒ `workLocationId` 有值 | 一個「距離某個沒有記錄下來的地點 87 公尺」的數字 |

> **`WorkLocation` 的 `onDelete: Restrict`**：地點被刪除時不可讓歷史打卡的 `workLocationId` 變成 null —— 那會靜默改寫過去的出勤事實。地點停用應改設 `validUntil`（§D6.4），不是刪除。

---

## 📦 5. 常數、型別與精度

### 5.1 新增檔案

| 路徑 | 內容 |
|---|---|
| `src/constants/attendance.ts` | 9 個 enum 的前端鏡像、路由表 `ATTENDANCE_ROUTE`、i18n key 對照、預設門檻 |
| `src/interfaces/attendance.ts` | `IAttendanceDayInput` / `IAttendanceEvaluation` / `IPunchRequest` / `IPresenceSummary` / `IRosterEntry` 等 DTO |
| `src/validators/attendance.ts` | 所有 Zod schema，**由 `src/validators/index.ts` 集中導出**（CLAUDE.md §2） |

### 5.2 必須修改的既有檔案（漏一個就有實質後果）

| 檔案 | 修改 | 漏掉的後果 |
|---|---|---|
| `src/constants/hr_pii.ts` | `HrPiiTable` 加 `ATTENDANCE_PUNCH`；`HR_PII_FIELD_TIER` 加 3 個欄位 | **金鑰輪替時漏掉這張表 → 舊金鑰退役後位置資料永遠解不開** |
| `src/constants/rate_limit.ts` | 加 `ATTENDANCE_PUNCH` bucket | 打卡端點可被腳本刷爆 |
| `src/lib/utils/error_dictionary.ts` | 加 16 個 `API_ERRORS`（流水號見 §6.3） | 只能回 500，前端無法區分「圍欄外」與「系統壞了」 |
| `src/__tests__/hr_enum_mirror.test.ts` | 9 個 schema enum 進 `MIRRORED`；衍生的 `ShiftPatternKind` 進 `UI_ONLY` | 前者：schema 與前端常數失去同步保護。後者：覆蓋率檢查會誤報「漏了鏡像」 |
| `scripts/run_worker.ts` | 掛入判定 Worker 迴圈（§8.1） | 每日判定與 `STALE` 收斂不會跑 |
| `prisma/schema.prisma` `model AccountBook` | 加 11 個反向關聯 | Prisma 產不出 client |
| `prisma/schema.prisma` `model Employee` | 加 6 個反向關聯（punches / presence / shiftDays / assignmentRules / dailyResults / correctionRequests） | 同上 |
| `prisma/schema.prisma` `model Checkin` | 補一行澄清註解（§2.1） | 下一個人往錯的表加欄位 |
| `documents/legal/privacy_policy.md` | 補位置蒐集、同仁間揭露、緊急點名條款 | **法遵風險，上線阻斷項** |
| `documents/readme.md` | 索引新增本計畫與後續 ADR | 知識庫失去導覽價值 |
| `documents/architecture/decisions/020_severance_pay_estimation.md` | §4 補第 4.5 條（見 §5.3） | 薪資模組上線時會自己再算一次工時 |

### 5.3 精度：本模組**不**使用 `Prisma.Decimal`（並說明為什麼這不是違規）

CLAUDE.md §2 的原文是「**財務金額與碳排當量**嚴禁用原生 `number`」。本模組的數值是：

| 數值 | 型別 | 理由 |
|---|---|---|
| 工作分鐘、遲到分鐘、應工作分鐘 | `Int` | 分鐘是**整數計數**，不是連續量。用 `Decimal` 表達一個永遠是整數的量，只是增加轉換成本與誤用空間 |
| 時刻（分鐘 of day） | `Int` | 同上，另見 §D8 為何不用 `DateTime` |
| `latitude` / `longitude` | `Float` | 與既有 `Seaport` / `Airport` 一致；不是金額或碳排當量；Haversine 本身即浮點運算。float64 對座標的精度約 mm 級 |
| `radiusMeters` / `accuracyMeters` / `distanceMeters` | `Int` | 公尺整數；圍欄精度到公尺已遠超 GPS 誤差 |
| 現場人數 | `Int` | 人數 |

**跨模組邊界宣告**：本模組**只輸出分鐘數**。加班費、時薪、假日加給的金額換算屬薪資模組職責，該處必須走 `MoneyUtil` / `Prisma.Decimal`（`documents/domain/salary_calculator_mechanism.md`、ADR 020 §2.2）。**分鐘 → 金額的乘法絕不在本模組發生。**

這條線不是本計畫自己畫的：**ADR 020 §4 已經在列「薪資模組上線後要接的介面」**，其中 §4.1 要求一張以 `(employeeId, 年月)` 為鍵的薪資紀錄表、§4.3 要求一支共用的「取平均工資」查詢，並明白指出「各自實作一份，三個畫面遲早會給出三個不同的數字」。

出勤工時是那些計算的**輸入之一**。本模組把它輸出成一個乾淨的分鐘數，正是為了讓薪資模組上線時只需要接一個介面，而不是回頭重新詮釋出勤紀錄。**因此建議在 ADR 020 §4 補上第 4.5 條：「加班／請假時數的唯一來源是 `AttendanceDailyResult`」** —— 否則薪資模組上線時很可能自己再算一次工時。

---

## 🧱 6. 分層實作

### 6.1 Repository（唯一 DB 閘口）

| 檔案 | 重點 |
|---|---|
| `attendance_policy.repo.ts` | upsert by `accountBookId` |
| `work_location.repo.ts` | 含 `WorkLocationNetwork` 巢狀寫入；**停用改寫 `validUntil`，不提供 delete** |
| `shift_pattern.repo.ts` | — |
| `attendance_schedule.repo.ts` | `ShiftAssignmentRule` + `EmployeeShiftDay`；**寫入前呼叫 `assertSchedulableDay`** |
| `attendance_punch.repo.ts` | **只有 `create` / `findMany` / `markSuperseded`；沒有 `update`、沒有 `delete`**；`create` 前呼叫 `assertStorablePii` + `assertPunchEvidence`；**`create` 與 presence upsert 同交易**（§D10.1） |
| `attendance_presence.repo.ts` | `upsert` / `remove` / `markStale` / **`rebuild`**（重建是這張表的正當性來源） |
| `attendance_result.repo.ts` | `upsert` by `(accountBookId, employeeId, workDate)`；異常子表整批換掉（重算語意） |
| `attendance_correction.repo.ts` | 寫入前呼叫 `assertReviewedRequest` |

### 6.2 Service（業務大腦）

| 檔案 | 職責 |
|---|---|
| `attendance_punch.service.ts` | 打卡主流程：伺服器時間 → 政策 → 當日班表 → **圍欄判定（不中即 403）** → 護欄 G3–G7 → 加密 → **同交易寫 punch + presence** → 觸發當日重算 |
| `attendance_schedule.service.ts` | 班別 CRUD、指派、**「取某人某日班表」的決定論順序**（§D2）、批次排班匯入 |
| `attendance_evaluation.service.ts` | 呼叫純函數規則引擎、落地 `AttendanceDailyResult` ＋異常子表、批次重算 |
| `attendance_correction.service.ts` | 申請單狀態機、SoD 檢查（§D9）、核准後產生補登 punch + `markSuperseded` + 重算 |
| **`attendance_presence.service.ts`** | **現場人數、到班名單、`STALE` 收斂、緊急點名匯出、與 punch 的勾稽對帳（§D10）** |
| `attendance_map.service.ts` | 地圖聚合。**在此層就剝掉座標欄位**，不是靠 API 層或前端 |
| `attendance_access.guard.ts` | 誰能看誰的資料。比照既有 `carbon_access.guard.ts` / `account_book_access.guard.ts` |

**存取矩陣**（`attendance_access.guard.ts` 的單一來源）：

| 角色 | 自己的打卡 | 部屬的打卡 | 全帳本 | 位置明文 | 現場名單 | 緊急點名匯出 | 核准補登 |
|---|---|---|---|---|---|---|---|
| 員工 | ✅ 讀 | ➖ | ➖ | 僅自己（免稽核） | 依 `mapVisibility` | ➖ | ➖ |
| 直屬主管 | ✅ | ✅ 讀 | ➖ | ➖（只看地點名） | 本部門 | ➖ | ✅ 部屬的 |
| HR | ✅ | ✅ | ✅ 讀 | ✅ 單筆調閱（**寫 `AuditLog`**） | 全帳本 | ✅（**寫 `AuditLog`**） | ✅ |
| 職安／緊急聯絡人 | ➖ | ➖ | ➖ | ❌ | 全帳本 | ✅（**寫 `AuditLog`**） | ➖ |
| 地圖看板 | — | — | 依 `mapVisibility` | ❌ **永不回傳** | — | — | — |

### 6.3 API（純端口，`route.ts` 內零業務邏輯）

前綴一律 `/api/v1/user/account_book/[account_book_id]/hr/attendance/…`，與既有租戶資源路徑慣例一致；一律 `getIdentityFromDeWT(authHeader)` → `Schema.safeParse(body)` → service → `jsonOk` / `jsonFail(API_ERRORS.X)`。

| # | Method | 路徑（前綴省略） | 說明 |
|---|---|---|---|
| A1 | `POST` | `/punch` | 打卡。body 只有 `punchType` / `latitude` / `longitude` / `accuracy`；**沒有時間欄位**（G1）。**圍欄外回 403** |
| A2 | `GET` | `/punch` | 查打卡紀錄，位置**預設遮罩** |
| A3 | `GET` | `/punch/[punch_id]/location` | 單筆位置明文調閱。**HR 專用，必寫 `AuditLog`** |
| A4 | `GET` | `/today` | 我今天的狀態（已上班？幾點？在哪個地點？可否下班打卡？） |
| A5 | `GET`/`PUT` | `/policy` | 帳本出勤政策 |
| A6 | `GET`/`POST` | `/location` | 工作地點與圍欄 |
| A7 | `GET`/`PUT` | `/location/[location_id]` | 含網段子資源；**停用走 `validUntil`，無 DELETE** |
| A8 | `GET`/`POST` | `/shift_pattern` | 班別 |
| A9 | `GET`/`PUT`/`DELETE` | `/shift_pattern/[pattern_id]` | — |
| A10 | `GET`/`POST` | `/schedule` | 排班（逐日／規則）；POST 支援批次 |
| A11 | `GET` | `/schedule/calendar` | 月曆檢視（部門 × 月） |
| A12 | `GET` | `/result` | 每日判定結果查詢（期間、部門、異常型別） |
| A13 | `POST` | `/result/recompute` | 手動重算（HR，指定期間） |
| A14 | `GET`/`POST` | `/correction` | 補登申請單：查詢／建立 |
| A15 | `POST` | `/correction/[request_id]/review` | 主管核准／駁回（SoD） |
| A16 | `POST` | `/correction/[request_id]/cancel` | 申請人撤回（限 `PENDING`） |
| A17 | `GET` | `/map` | 地圖看板。**契約層面不含任何座標欄位** |
| **A18** | `GET` | `/presence` | **各地點現場人數（`ON_SITE` / `STALE` / 應到未打卡）** |
| **A19** | `GET` | `/presence/location/[location_id]` | **該地點到班人員名單** |
| **A20** | `POST` | `/presence/roster/export` | **緊急疏散點名匯出（CSV／PDF），必寫 `AuditLog`** |
| **A21** | `POST` | `/presence/rebuild` | **由 punch 重建 presence（HR／維運，指定日期）** |

**新增 `API_ERRORS`**，**禁止自創 HTTP status**（`known_issues/api_http_status_dual_mapping.md`）。

> **本表的號碼不是保留席位。** `src/lib/utils/error_dictionary.ts` 是唯一真相，
> 而錯誤碼是**跨分支共用的命名空間**：實作當下才配號，且配號前要做
> base / develop / branch 三方比對（code review checklist §6.1，比法是各取一份
> 算「雙方各自新增」的交集，不是讀 diff）。
>
> 初版本表把號碼寫死在規劃階段，實作落地時已經漂掉 —— 16 列裡 4 列號碼不同、
> 10 列從未實作。更糟的是那些沒實作的號碼**現在有些已被 develop 用走**
> （例如 `VA000047` 在 develop 是 `VA_CARBON_SESSION_NOT_BOUND`），
> 照抄本表實作就會直接撞號。因此未實作者一律不預留號碼。
> 已實作者的號碼於 2026-08-19 對齊字典現況。

| Key | code | ApiCode | 情境 |
|---|---|---|---|
| `VA_PUNCH_LOW_ACCURACY` | `VA000042` | `VALIDATION_ERROR` | G3；訊息須為「定位精度不足，請重試」 |
| `VA_PUNCH_NO_SCHEDULE` | —（未實作） | `VALIDATION_ERROR` | 當日無排班且政策不允許自由打卡 |
| `VA_CORRECTION_TOO_OLD` | —（未實作） | `VALIDATION_ERROR` | 超過補登跨度 |
| `VA_REQUEST_ALREADY_REVIEWED` | —（未實作） | `VALIDATION_ERROR` | 重複審核 |
| `VA_SHIFT_WINDOW_INVALID` | —（未實作） | `VALIDATION_ERROR` | 核心時間超出彈性窗 |
| `VA_LOCATION_RADIUS_INVALID` | —（未實作） | `VALIDATION_ERROR` | 圍欄半徑低於下限（§D6） |
| **`FO_PUNCH_OUT_OF_FENCE`** | `FO000009` | `FORBIDDEN` | **G4 —— 本模組最常被觸發的錯誤，回傳最近地點與距離** |
| `FO_PUNCH_NETWORK_MISMATCH` | —（未實作） | `FORBIDDEN` | G4b |
| `FO_SELF_APPROVAL_FORBIDDEN` | `FO000014` | `FORBIDDEN` | D9 |
| `FO_NOT_AUTHORIZED_REVIEWER` | `FO000015` | `FORBIDDEN` | D9 |
| `FO_ATTENDANCE_SCOPE_DENIED` | —（未實作） | `FORBIDDEN` | 越權查他人 |
| `FO_ROSTER_EXPORT_DENIED` | —（未實作） | `FORBIDDEN` | 無 `EMERGENCY_ROSTER` 權限 |
| `NF_WORK_LOCATION` | `NF000018` | `NOT_FOUND` | — |
| `NF_SHIFT_PATTERN` | `NF000021` | `NOT_FOUND` | — |
| `NF_CORRECTION_REQUEST` | —（未實作） | `NOT_FOUND` | — |
| `CF_PUNCH_DUPLICATE` | —（未實作） | `CONFLICT` | 短時間內重複打卡（若政策設為拒絕而非收斂） |

> **`FO_PUNCH_OUT_OF_FENCE` 的回應內容需特別設計**：它會是全系統觸發頻率最高的 403，而收到它的人正站在某處試圖上班。回應必須包含**最近的地點名稱與距離**（`distanceMeters`），讓使用者立刻知道「我離台北總部 340 公尺，要再走近一點」而不是「系統說我不能打卡」。這個資訊免解密就拿得到（§4.3）。

---

## ⚖️ 7. 異常判定規則引擎規格

### 7.1 輸入

```typescript
interface IAttendanceDayInput {
  workDate: string;                 // "YYYY-MM-DD"
  timeZone: string;                 // 來自 AttendancePolicy
  dayType: WorkDayType;
  shift: IShiftWindow | null;       // dayType !== WORK 時為 null
  punches: IPunchSnapshot[];        // 已過濾 supersededById IS NULL，已依時間排序
  policy: IAttendancePolicySnapshot;
  evaluatedAt: Date;                // 「現在」由呼叫端注入，函數內不呼叫 Date.now()
}
```

### 7.2 判定表（決定論，由上而下，第一個命中即決定 `AttendanceDayStatus`）

| # | 條件 | 狀態 | 產生的異常 |
|---|---|---|---|
| 1 | `dayType ≠ WORK` 且無打卡 | `OFF_DAY` | 無 |
| 2 | `dayType ≠ WORK` 且有打卡 | `OFF_DAY` | 無異常（**假日出勤不是異常**，是加班事實，交給薪資模組） |
| 3 | `shift == null`（無排班） | `NO_SCHEDULE` | 無 —— **不判曠職**，沒有應出勤時間就沒有「缺席」可言 |
| 4 | 應出勤且**完全無打卡**，且 `evaluatedAt > 當日窗迄` | `EXCEPTION` | `ABSENT`（曠職） |
| 5 | 應出勤且完全無打卡，但**當日尚未結束** | `NORMAL`（暫定） | 無 —— 早上 10 點不能判人曠職 |
| 6 | 有 `CLOCK_OUT` 無 `CLOCK_IN` | `EXCEPTION` | `MISSING_CLOCK_IN` |
| 7 | 有 `CLOCK_IN` 無 `CLOCK_OUT`，且 `evaluatedAt > 窗迄 + 寬限` | `EXCEPTION` | `MISSING_CLOCK_OUT`（**同時觸發 presence 標 `STALE`**，§D10.3 說明兩者差異） |
| 8 | `firstIn > coreStart + lateGraceMinutes` | `EXCEPTION` | `LATE`（分鐘 = 差值） |
| 9 | `lastOut < coreEnd − earlyLeaveGraceMinutes` | `EXCEPTION` | `EARLY_LEAVE` |
| 10 | 工作分鐘 `< requiredWorkMinutes` | `EXCEPTION` | `INSUFFICIENT_HOURS` |
| 11 | G5 瞬移偵測命中 | `EXCEPTION` | `SUSPICIOUS_JUMP` |
| 12 | 以上皆不成立 | `NORMAL` | 無 |

**8–11 可同時成立**（因此異常是子表而非單一 enum，見 §4.2）。

> **v1.1 移除原第 11 條 `OUT_OF_FENCE`**：圍欄外的打卡在 API 層就被 403 擋掉，永遠不會成為一筆待判定的紀錄（§D6）。判定表少一條、異常型別少一個、規則引擎少一個輸入 —— 「在入口拒絕」比「在出口標記」便宜的地方不只是語意。

### 7.3 三條「不判為異常」的刻意設計

| 情境 | 為什麼不判 |
|---|---|
| 無排班（#3） | 判曠職等於系統自己發明了一個不存在的應出勤義務。**沒有班表就沒有比較基準** —— 這是「零捏造」在本模組的具體形狀 |
| 當日未結束（#5、#7） | 判定的前提是「這一天已經過完」。提早下結論會讓早班同仁每天早上都收到一封曠職通知 |
| 假日出勤（#2） | 假日來上班是加班事實，不是異常。把它標紅會讓真正的異常被淹沒 |

### 7.4 工作分鐘的計算

```
工作分鐘 = clamp(lastOut, 窗內) − clamp(firstIn, 窗內) − shift.breakMinutes
```

- **打卡時間先夾到彈性窗內**：08:00 到班的固定班（窗起 09:00）不因早到而多算工時，也不因此判成異常
- 結果為負時取 0（不產生負工時）
- 多次進出（外出洽公）本期以「最早 IN / 最晚 OUT」收斂；**分段計時列為升級路徑 §13.2**，並在此明白記錄本期的簡化，避免日後被當成 bug 追查

---

## ⚙️ 8. 背景 Worker

### 8.1 掛載位置（依現 branch）

**現 branch（`develop` @ `9757e21e8`）只有單一 `scripts/run_worker.ts`**，內含私有的 `startServiceLoop(name, fn, intervalMs)`（3 參數）。判定迴圈掛在它的 `Promise.all` 清單裡，與既有的 `AmortizationWorker`、`WalletGuardian`、`SubscriptionExpiry` 並列：

```typescript
// Info: (20260813 - Julian) 每日出勤判定 + presence 收斂與勾稽
startServiceLoop("AttendanceEvaluator", () => runAttendanceEvaluation(), HOUR_MS),
```

**若「外部運算節點 / 內部維運節點」的拆分先落地**（`run_compute_node.ts` / `run_ops_node.ts`，該分支上 `startServiceLoop` 多一個 `nodeName` 參數並移到 `src/lib/worker/service_loop.ts`），本迴圈一律掛 **OpsNode**，理由直接引自 `00_async_worker_overview.md`：ComputeNode 是「處理使用者上傳內容、不該連得到資料庫」的外部節點；而出勤判定的工作**就是寫庫**，且不吃任何外部非結構化輸入。

> 實作前請先 `git log -1 -- scripts/` 確認落點 —— 兩種形狀的差別只有一個參數，但掛錯節點意味著把一個需要 DB 寫入權限的迴圈放進刻意隔離的網段。

### 8.2 `src/services/cron/attendance_evaluation.cron.ts`

| 項目 | 設計 |
|---|---|
| 頻率 | 每小時（`HOUR_MS`，與既有 `AmortizationWorker` / `WalletGuardian` 同節奏） |
| 工作一：判定 | 每帳本各自時區下的「昨日」＋「今日已過窗迄」的員工 |
| **工作二：presence 收斂** | 超過窗迄 + `presenceStaleGraceMinutes` 未下班 → 標 `STALE`；跨過工作日邊界的殘留列清理 |
| **工作三：presence 勾稽** | 比對 presence 在班人數 vs 由 punch 推導的人數；不一致即告警並記錄差異（ADR 015 守恆勾稽的同形） |
| 冪等 | `upsert` by `(accountBookId, employeeId, workDate)`，異常子表整批換掉。**重跑 100 次結果相同** |
| 失敗處理 | 單一員工判定失敗**不中斷整批**；累計失敗達 3 次寫入 `attendance_giveup` 標記並停止重試（CLAUDE.md §6 的 DLQ 要求） |
| 觀測 | 每輪輸出「掃描帳本數 / 員工日數 / 異常數 / `STALE` 數 / **勾稽差異數** / 失敗數」 |
| 重算觸發 | 除排程外，`POST /result/recompute`（A13）與補登核准也會即時觸發單日重算 |

**時區的實務難題**：Worker 每小時醒一次，各帳本的「昨日」在不同時刻結束。做法是每輪都對所有帳本檢查「該帳本當地時間是否已跨過判定門檻」，跨過才處理 —— 而不是假設某個固定時刻是全球的午夜。

---

## 🖥️ 9. 前端

沿用 `src/app/hr_management/` 既有版面（`hr_sidebar.tsx` / `hr_header.tsx` / `hr_nav_items.ts`），新增 `ATTENDANCE` 導覽項與六個頁面：

| 路由 | 對象 | 內容 |
|---|---|---|
| `/hr_management/attendance` | 全員 | **打卡主畫面**：大按鈕、今日狀態、目前定位與命中地點、本月異常摘要 |
| `/hr_management/attendance/presence` | 依 `mapVisibility` | **現場人數與到班名單**（R9）：地點卡片、三個數字、名單、匯出 |
| `/hr_management/attendance/map` | 依 `mapVisibility` | **地圖看板**（maplibre-gl）：地點標記 + 在班人數，點開為名單。**前端拿不到座標** |
| `/hr_management/attendance/schedule` | HR / 主管 | 班別管理 + 月曆排班（拖拉指派、批次劃休） |
| `/hr_management/attendance/exception` | HR / 主管 | 異常清單、篩選、匯出、一鍵重算 |
| `/hr_management/attendance/correction` | 全員 / 主管 | 補登申請單：填寫、我的申請、待我審核 |

### 9.1 打卡畫面的關鍵設計（因「拒絕」而變重要）

圍欄外一律拒絕之後，**打卡畫面必須在使用者按下按鈕之前就讓他知道打不打得成**，否則每一次拒絕都是一次挫折：

1. **進頁即定位**，顯示「距離台北總部 32 公尺 ✅ 可打卡」或「距離最近地點 340 公尺 ❌ 請再靠近」
2. **打卡按鈕在圍欄外時保持可按**（不 disable），按下去給出帶距離的明確錯誤 —— disable 掉的按鈕不會告訴任何人為什麼
3. **定位中／定位失敗／拒絕授權**三種狀態各有文案，並在拒絕授權時直接給出「改用補登申請」的入口（§D6.4）
4. `navigator.geolocation` 需 HTTPS

### 9.2 現場人數畫面（R9）

```
┌─ 台北總部 ──────────────────────────┐
│  在班 42        ⚠️ 未打下班卡 3       │
│  應到未打卡 5                        │
│  [ 查看名單 ]  [ 緊急點名匯出 ]        │
└────────────────────────────────────┘
```

**三個數字必須同時顯示**（§D10.6）：只顯示「在班 42」會讓人以為現場就是 42 個人。

### 9.3 其他

1. i18n：五個語系檔（`en` / `zh_tw` / `zh_cn` / `ja` / `ko`）皆須補 `attendance.*`，比照既有 `hr_management.ts` locale 結構
2. 狀態色階沿用 `EMPLOYEE_STATUS_STYLE` 的 50/100/700 慣例（其註解已說明深色主題的處理方式）
3. 打卡按鈕須有防連點，但真正的防線在 G6 限流
4. 現場人數與地圖輪詢 30 秒；升級為即時推播（`src/lib/centrifugo.ts` 已在庫內）列為選項，非首期

---

## 🔐 10. 安全、稽核與限流

### 10.1 稽核 (`AuditLog`)

| 動作 | 是否寫 AuditLog | `dataType` / `action` | `dataId` |
|---|---|---|---|
| 打卡（建立紀錄） | ➖ | — | — |
| 讀取自己的打卡（含位置） | ➖ | — | — |
| 現場人數統計、到班名單（日常查詢） | ➖ | — | — |
| **HR 調閱他人位置明文**（A3） | ✅ | `EMPLOYEE_PII` / `READ` | 該員工的 `Employee.id` |
| **緊急點名匯出**（A20） | ✅ | `EMPLOYEE_PII` / `READ` | **操作者的** `Employee.id` |
| 修改出勤政策 / 圍欄 / 班別 | ✅ | `EMPLOYEE_PII` / `UPDATE` | 操作者的 `Employee.id` |
| 核准補登（改變出勤事實） | ✅ | `EMPLOYEE_PII` / `UPDATE` | 申請人的 `Employee.id` |
| **presence 重建**（A21） | ✅ | `EMPLOYEE_PII` / `UPDATE` | 操作者的 `Employee.id` |

**不新增任何 `AuditLogDataType` / `AuditLogAction` 成員。** ADR 018 §6 已把「個資存取軌跡」的軸線定為 `Employee.id`，出勤位置屬同一軸線；另立 `ATTENDANCE_PII` 只會讓「這名員工的資料被誰看過」這個最常問的問題需要查兩種 dataType。

**日常名單查詢刻意不寫 AuditLog**，理由同 ADR 018 §6 ——「如果每次讀 Journal 都寫一筆 AuditLog，這張表會被沖爆，真正該被看見的個資存取反而被淹沒」。而**匯出寫**，因為它一次帶走全帳本名單，性質與逐筆查詢不同。

### 10.2 加密落地檢查清單

- [ ] `HrPiiTable.ATTENDANCE_PUNCH` 已加入（**金鑰輪替巡覽清單**）
- [ ] `HR_PII_FIELD_TIER` 已加入 3 個欄位
- [ ] 寫入端 `id = randomUUID()`，**未使用** `@default(uuid())`
- [ ] AAD 使用 `AttendancePunch:{id}:{field}:{keyVersion}`
- [ ] `assertStorablePii` 已在 repository 呼叫
- [ ] 金鑰輪替腳本已涵蓋本表（**與第 1 項是兩件事：清單有登記 ≠ 腳本有處理**）
- [ ] `AttendancePresence` **不含任何密文欄位**（它只有 `workLocationId`，故不進 `HrPiiTable`）

### 10.3 限流

```typescript
// src/constants/rate_limit.ts
ATTENDANCE_PUNCH = "ATTENDANCE_PUNCH",
// Info: 正常人一天打 2–4 次卡。上限壓低是為了讓腳本刷卡在造成資料污染前先撞牆並留下告警。
// Info: 圍欄外的失敗嘗試也計入——否則「試遍座標直到過關」不會被任何東西擋住。
[RateLimitBucketEnum.ATTENDANCE_PUNCH]: [
  { windowMs: MINUTE_MS, max: envInt("ATTENDANCE_RL_PUNCH_PER_MINUTE", 5) },
  { windowMs: DAY_MS,    max: envInt("ATTENDANCE_RL_PUNCH_PER_DAY", 40) },
],
```

> **失敗的打卡也要計入限流。** 實作上靠位置保證：`enforceRateLimit` 排在 DeWT 驗證之後、`resolveEmployee` 之前，因此圍欄外被 403 的那些次數一樣算。`attendance_rate_limit.test.ts` 有一條測試守這個順序 —— 那個錯誤在程式碼裡看起來只是「兩行的位置不一樣」。

> ⚠️ **更正（2026-08-17 - Luphia）：本節原本寫「攻擊者唯一的手段就是用不同座標反覆嘗試直到猜中圍欄位置」，那句話不成立。**
>
> `GET .../hr/attendance/location` 對**任何**已綁定的員工回傳每一個工區的 `latitude` / `longitude` / `radiusMeters` —— 前端要用它在地圖上畫圓，而那個圓的大小正是「我站在這裡打不打得到卡」的唯一依據，所以它必須是真值。**圍欄座標對員工是公開資訊，不需要枚舉。**
>
> 因此限流擋的**不是**座標枚舉，而是：腳本化的連續打卡（污染法定文件）、以及把單一帳號當成打卡代理（一支手機幫全工地打卡）。這兩件事上限 5/min、40/day 都擋得住。
>
> 而**偽造座標本身，G1–G7 沒有任何一條擋得住** —— DevTools 的 Sensors 面板覆寫 `geolocation` 是官方功能，服務端收到的就是一組看起來完全正常的座標。真正對抗它的是 G4b（網段／BSSID 白名單，需要人在該網段內）與裝置認證，兩者都還沒實作。同理 **G3 在 client 省略 `accuracyMeters` 時直接放行**（部分裝置不提供這個值，一律擋會讓「打不了卡」變成裝置問題），所以它是資料品質過濾器，不是防偽造的防線。
>
> 把這一段寫清楚的理由：原本的敘述會讓下一個人以為「限流補上就防住偽造了」，於是不再推進 G4b —— 而那才是唯一真的擋得住的那一條。

**寫入類另立兩個桶**（2026-08-17 實作時新增，本節原本只規劃了 `ATTENDANCE_PUNCH`）：

- `ATTENDANCE_WRITE`（30/min、500/day）：排班寫入、發起銷假徵詢、回應徵詢。這些動作已各有權限閘，限流擋的是**閘後的濫用**（有權限的人腳本化改班表）。
- `ATTENDANCE_EXPORT`（6/min、60/day）：緊急點名匯出。它的成本不是 CPU 而是**`AuditLog` 放大** —— 一次匯出對名單上每個人寫一筆 `READ`（500 人的帳本 = 500 列），而 ADR 018 §6 選擇只對 `EMPLOYEE_PII` 開放 `READ` 的理由正是「這張表會被沖爆」。一支能被連打的放大器會親手造成那件事。上限仍足以支撐真實疏散（現場會連續匯出好幾份）。

兩者都不與 carbon 的 `SAVE` 共用：那個桶的尺寸是為報表 autosave（debounce 2s ≈ 30/min）訂的，共用會讓兩邊互相擠壓同一個預算，而成本屬性毫無關係（同 `PRF` 當初必須與 `SIGNING` 分開的理由）。

現場人數、名單與地圖沿用既有 `READ` bucket（120/min），足以支撐 30 秒輪詢。與 carbon 共用可接受，因為 `READ` **只有分鐘窗、沒有每日上限** —— 不會出現「一邊用完，另一邊當天就不能用」那種跨功能的額度擠壓。

---

## 🧪 11. 測試計畫

> CLAUDE.md 的核心主張是決定論。決定論的唯一驗收方式是**窮舉表格**，不是抽樣。

| # | 測試檔 | 類型 | 重點 |
|---|---|---|---|
| T1 | `attendance_rules.test.ts` | 單元（表格驅動） | §7.2 判定表 12 條 **逐條**；含固定班／彈性班／跨夜班三組班別 |
| T2 | `attendance_rules.boundary.test.ts` | 單元 | 邊界：剛好 `coreStart`、剛好寬限邊界、工時剛好等於 required、窗外 1 分鐘 |
| T3 | `attendance_tz.test.ts` | tz（`npm run test:tz`） | `Asia/Taipei` / `UTC` / `America/Los_Angeles`；**含日光節約切換當日的跨夜班** |
| T4 | `attendance_geofence.test.ts` | 單元 | **圍欄邊界：半徑內／外／剛好邊界必須明確落在「准」或「拒」**；反經線與極區座標；`calculateDistanceKm` 既有行為 |
| T5 | `attendance_punch_invariant.test.ts` | 單元 | §4.3 四組組合的合法與非法，比照 `hr_pii_invariant.test.ts` |
| T6 | `attendance_schedule_invariant.test.ts` | 單元 | `WORK` 無班別 / 非 `WORK` 有班別 |
| T7 | `attendance_pii.test.ts` | 單元 | 座標加解密往返、**AAD 換列必須驗章失敗**、補登 punch 必須無 `piiKeyVersion` 且無 `workLocationId` |
| T8 | `attendance_schedule_priority.test.ts` | 單元 | 逐日覆寫規則、生效區間邊界、皆無 → `NO_SCHEDULE` |
| T9 | `attendance_correction_sod.test.ts` | 單元 | 自我核准被擋、非主管核准被擋、已審核不可再審、跨帳本被擋 |
| T10 | `attendance_map_contract.test.ts` | 單元 | **看板與名單回傳物件不得包含任何座標／IP 欄位**（以鍵名斷言） |
| **T11** | **`attendance_presence.test.ts`** | 單元 | **三個生命週期轉換（§D10.4）；下班是刪除不是標記；`STALE` 不被移除** |
| **T12** | **`attendance_presence_rebuild.test.ts`** | 單元 | **`rebuildPresence` 從 punch 完整重建；重建結果與增量寫入結果必須相同**（這條測試是這張快取表的正當性證明） |
| T13 | `hr_enum_mirror.test.ts`（修改） | 單元 | 9 個 enum 進 `MIRRORED`、`ShiftPatternKind` 進 `UI_ONLY` |
| T14 | `attendance.integration.test.ts` | 整合（Supertest） | 打卡 → presence → 判定 → 補登 → 核准 → 重算的完整閉環；**含圍欄外必須回 403** |
| T15 | E2E | E2E | 帳本 id 以 **`e2e-book-`** 前綴（CLAUDE.md §8） |

**T10 與 T12 值得特別說明：**

- **T10 測的不是行為，是契約。** §D5 的隱私邊界如果只寫在文件裡，半年後一個「順便回傳座標讓前端畫得準一點」的 PR 不會有任何東西擋它。斷言鍵名不存在，才讓那個邊界有牙齒。
- **T12 是 `AttendancePresence` 存在的正當性。** 一張無法從真相重建的快取就是第二個真相；這條測試每次綠燈都在重新證明它只是快取。

---

## 🗓️ 12. 里程碑

| Phase | 內容 | 交付 | 阻斷關係 |
|---|---|---|---|
| **P0** 法遵與決策確認 | 法規條號核對（§0.2）、隱私權政策草案（含緊急點名）、D1/D2/D4/D5＋D10 評審、`Checkin` 澄清註解 | 4 份 ADR 草案 + 政策草案 | **阻斷 P4、P5 上線** |
| **P1** 資料層 | 11 張表 + 9 個 enum + migration + 2 支不變式 + `hr_pii.ts` 修改 | schema + T5/T6/T7/T13 綠燈 | 阻斷全部 |
| **P2** 規則引擎 | `attendance_rules.ts` 純函數 + 窮舉測試 | T1/T2/T3/T4 綠燈 | 阻斷 P3 |
| **P3** 服務與 API | 6 支 service + 1 支 guard + 21 支端點 + validators + `API_ERRORS` | T8/T9/T11/T12/T14 綠燈 | 阻斷 P4 |
| **P4** 前端 | 6 個頁面 + maplibre 看板 + 現場人數畫面 + 5 語系 i18n | T10 綠燈 + **實地 UAT 量測圍欄半徑**（§D6） | 依賴 P0 隱私政策 |
| **P5** Worker 與觀測 | 判定 cron + `STALE` 收斂 + 勾稽對帳 + DLQ + 指標 | 重算冪等驗證 + 勾稽零差異 | — |
| **P6** 硬化 | 限流（含失敗計入）、稽核驗收、金鑰輪替腳本涵蓋本表、E2E | T15 + 安全複核 | — |

**建議分支**：`epic/time_attendance`，各 Phase 開 `feature/attendance_*` 併入；每次發 MR 前 rebase 最新 `develop`（CLAUDE.md §5）。

> **P4 的實地量測是硬性交付項，不是驗收項。** 圍欄外一律拒絕之後，半徑訂錯的後果是員工上不了班 —— 這個數字不能從文件上的預設值抄。

---

## ⚠️ 13. 已知取捨與升級路徑

### 13.1 本期接受的取捨

| # | 取捨 | 為什麼接受 | 何時該回來處理 |
|---|---|---|---|
| 1 | 座標加密後無法在 DB 端做地理範圍查詢 | 查詢改讀 `workLocationId`（因拒絕政策，它必然有值）。95% 的讀取路徑不需要解密 | 若出現「找出半徑 N 公里內所有打卡」的需求 —— 走盲索引同一套路，**不要退回明文** |
| 2 | **圍欄外完全無法打卡** | §D6 的核心立場。配套是臨時地點與補登單（§D6.4） | 若外勤比例高到補登單成為日常負擔 → 檢討的是「該不該建更多 `WorkLocation`」，不是「該不該放寬圍欄」 |
| 3 | 多次進出只取最早 IN／最晚 OUT | 首期範圍控制 | 接上假勤模組時一併處理 |
| 4 | 排班日用不變式而非拆表 | §D2：拆表會弄丟同日唯一約束 | Prisma 若支援 CHECK 約束，可下放資料庫（比照 ADR 018 §5 對 `pii_key_version` 的處置） |
| 5 | GPS 可被竄改，本模組不能消除代打 | §D6 誠實聲明。緩解不是消除 | 若導入生物特徵，需獨立 ADR 與特種個資評估 |
| 6 | `AttendancePresence` 是快取，可能與 punch 短暫不一致 | 同交易寫入 + 每小時勾稽 + 可重建（§D10.1） | 若勾稽持續出現差異 → 表示同交易的假設被破壞，優先查那裡 |
| 7 | 現場人數會低估「忘記打上班卡」的人 | §D10.6，以「應到未打卡」對照數字誠實揭露 | 若職安要求人數必須精確 → 需要門禁系統整合，不是打卡系統能解的 |
| 8 | 地圖 30 秒輪詢而非即時推播 | 需求是「瞭解誰在哪上班」，不是即時追蹤 | 有明確即時需求時接 `centrifugo` |
| 9 | 出勤紀錄不上鏈 | 首期非必要；`AuditLog` 已提供軌跡 | 若客戶需要對抗「HR 自己改資料」的質疑 → 比照 ADR 015 每日 merkle root 錨定 |
| 10 | 本模組只輸出分鐘數，不算錢 | §5.3 跨模組邊界 | 薪資模組接手時定義介面，**不要在此模組長出金額欄位** |

### 13.2 升級路徑

1. **打卡紀錄每日 merkle root 上鏈**（比照 ADR 015 團隊錢包 Phase 1）—— 讓「出勤紀錄未被事後竄改」成為可對外證明的事實，這是本系統相對於一般 HR 系統的真正差異化
2. **分段工時**（多次進出、外出時段扣除）
3. **假勤整合**：`WorkDayType.LEAVE` 已預留
4. **門禁／閘門整合**：現場人數的精確度上限由此決定（§13.1 第 7 項）
5. **地理圍欄改用 PostGIS**：若地點數成長到範圍查詢成為瓶頸（`Seaport` 的註解已提到 PostGIS，但實際欄位仍是 `Float`，屆時是整體升級而非本模組單獨處理）
6. **欄位級授權**：ADR 018 §8 已列此路徑；出勤位置是它最自然的第一個應用場景

---

## ❓ 14. 待確認事項

### 14.1 已於 v1.1 決議

| # | 問題 | 決議 |
|---|---|---|
| ~~Q5~~ | 圍欄外打卡：拒絕還是標記？ | ✅ **拒絕**（`FO_PUNCH_OUT_OF_FENCE` 403）。連帶影響見 §D6、§D4、§4.1、§7.2、§10.3 |
| ~~Q9~~ | 是否需要現場人數與名單？ | ✅ **需要**，見 §D10（R9） |

### 14.2 仍需業務／法務回答（阻斷 P0）

| # | 問題 | 影響 |
|---|---|---|
| Q1 | 出勤紀錄的法定保存年限與記載精度（⚠️ 條號待核對） | 資料保留策略、是否需要歸檔表 |
| Q2 | 位置蒐集 + **同仁間名單揭露** + **緊急點名匯出**的告知同意形式 | **P4 上線阻斷項**。三者的告知內容不同，需分別敘明 |
| Q3 | 地圖與名單的預設可見範圍：全帳本 / 同部門 / 僅主管？ | `AttendancePolicy.mapVisibility` 預設值 |
| Q4 | 誰持有 `EMERGENCY_ROSTER` 權限？（HR？職安人員？各廠區主管？） | §D10.5 存取矩陣 |
| Q6 | 補登跨度上限（30 天？當月？） | `maxCorrectionBacklogDays`。**因拒絕政策，補登成為外勤唯一入口，此值不宜過短** |
| Q7 | 遲到寬限分鐘數 | `lateGraceMinutes` |
| Q8 | 國定假日行事曆由誰維護（人工 / 政府開放資料匯入）？ | 是否需要第 12 張表 `HolidayCalendar` |
| **Q10** | **各工作地點的實際圍欄半徑** | **P4 實地量測交付項。訂太小 = 員工打不了卡（§D6）** |
| **Q11** | **`presenceStaleGraceMinutes` 訂多久？**（參數在解決什麼問題見 **§D10.3**） | 太短會把加班的人誤標 `STALE`，黃色變常態就沒人看了；太長會讓緊急點名拿到混著已下班者的名單。建議先觀測一週 `MISSING_CLOCK_OUT` 的實際離開時間分佈再定值 |

### 14.3 建議抽成正式 ADR

編號自 **021** 起（`020_severance_pay_estimation.md` 已占用 020）：

| ADR | 主題 | 來源 |
|---|---|---|
| **ADR 021** | Attendance Location as PII（位置個資分級；因拒絕政策而簡化的衍生欄位設計） | §D4 |
| **ADR 022** | Unified Shift Model（固定班表是彈性班表的特例） | §D1 |
| **ADR 023** | When *Not* to Split a Table（ADR 019 判準的邊界條件） | §D2 |
| **ADR 024** | Presence, Geofence, and the Definition of "Being at Work"（圍欄即到班定義；現場名單的職安框架與隱私邊界） | §D5 + §D6 + §D10 |

**ADR 023 的價值最容易被低估**：ADR 019 立下了一個很強的原則，而強原則最常見的失敗方式是被無差別套用。把「這個判準在什麼情況下會導致更糟的結果」寫下來，是讓它繼續正確的必要條件。

**ADR 024 之所以把 D5／D6／D10 合成一份**：它們是同一個決策的三個面向 —— 「到班的定義是人在登記的地點」同時決定了打卡會被拒絕、資料模型少一個欄位、以及現場人數為什麼可信。拆成三份會讓讀者看不出它們互為前提。

---

## 📎 附錄 A：Phase 1 交付檔案清單

```
prisma/schema.prisma                                   （修改：+11 model、+9 enum、AccountBook/Employee 反向關聯、Checkin 澄清註解）
src/constants/attendance.ts                            （新增）
src/constants/hr_pii.ts                                （修改：HrPiiTable、HR_PII_FIELD_TIER）
src/constants/rate_limit.ts                            （修改：ATTENDANCE_PUNCH bucket，失敗亦計入）
src/interfaces/attendance.ts                           （新增）
src/validators/attendance.ts                           （新增，經 index.ts 導出）
src/validators/index.ts                                （修改）
src/lib/attendance_rules.ts                            （新增：純函數規則引擎）
src/lib/utils/error_dictionary.ts                      （修改：+16 API_ERRORS，流水號見 §6.3）
src/repositories/attendance_punch_invariant.ts         （新增）
src/repositories/attendance_schedule_invariant.ts      （新增）
src/repositories/attendance_*.repo.ts                  （新增 × 8，含 attendance_presence.repo.ts）
src/services/attendance_*.service.ts                   （新增 × 6，含 attendance_presence.service.ts）
src/services/attendance_access.guard.ts                （新增）
src/services/cron/attendance_evaluation.cron.ts        （新增：判定 + STALE 收斂 + 勾稽）
src/app/api/v1/user/account_book/[account_book_id]/hr/attendance/**  （新增 × 21 端點）
src/app/hr_management/attendance/**                    （新增 × 6 頁面）
src/components/hr_management/attendance/**             （新增）
src/i18n/locales/{en,zh_tw,zh_cn,ja,ko}/attendance.ts  （新增 × 5）
src/__tests__/attendance_*.test.ts                     （新增 × 13，見 §11 T1–T12、T14）
src/__tests__/hr_enum_mirror.test.ts                   （修改：MIRRORED +9、UI_ONLY +1）
scripts/run_worker.ts                                  （修改：掛入判定迴圈，見 §8.1）
documents/architecture/decisions/021–024_*.md          （新增 × 4）
documents/architecture/decisions/020_severance_pay_estimation.md （修改：§4 補第 4.5 條，見 §5.3）
documents/legal/privacy_policy.md                      （修改：位置蒐集 + 名單揭露 + 緊急點名）
documents/readme.md                                    （修改：索引）
```

---

> **相關文件**：`CLAUDE.md`、`documents/architecture/decisions/018_hr_pii_data_classification.md`、`019_hr_process_task_split.md`、`020_severance_pay_estimation.md`、`015_offchain_team_wallet_ledger.md`、`documents/architecture/async_workers/00_async_worker_overview.md`、`documents/engineering_guidelines/coding_guidelines.md`、`documents/engineering_guidelines/numerical_precision_guideline.md`、`documents/testing_and_qa/integration_test_guide.md`、`src/constants/hr_pii.ts`、`src/lib/hr_pii_crypto.ts`、`src/repositories/hr_pii_invariant.ts`、`prisma/schema.prisma`（人事區塊）
