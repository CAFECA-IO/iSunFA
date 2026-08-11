# 架構決策紀錄 (ADR) 017: Splitting ProcessTask to Make Illegal States Unrepresentable (拆分 ProcessTask 以消除非法狀態)

> **Date**: 2026-08-11
> **Author**: Julian
> **Status**: ✅ Accepted
> **核心目標**: 用型別結構取代執行期檢查，讓「一個任務同時／完全不屬於任何流程」與「taskType 與實際流程矛盾」這三種狀態在 schema 層就無法表示。

---

## 🛑 1. 當前架構挑戰 (Context)

初版 `ProcessTask` 用單一資料表承載報到與離職兩種任務，靠一個 `taskType` 欄位區分，並掛兩個**可選**外鍵：

```prisma
model ProcessTask {
  taskType             ProcessTaskType     // ONBOARDING | OFFBOARDING
  onboardingProcessId  String?
  offboardingProcessId String?
}
```

沒有任何機制保證「恰有一個外鍵有值」，因此三種非法狀態全部寫得進去：

| # | 非法狀態 | 後果 |
|---|---|---|
| 1 | 兩個外鍵都有值 | 一個任務同時屬於某人的報到流程與另一人的離職流程；勾選完成會同時推進兩條無關的流程 |
| 2 | 兩個外鍵都是 null | 孤兒任務，不會出現在任何清單裡，也不會有人發現它存在 |
| 3 | `taskType` 與實際外鍵矛盾 | 例如 `taskType: ONBOARDING` 掛在 `offboardingProcessId` 上。「報到進度」與「離職交接進度」兩張畫面會各自呈現不同的真相 |

第 3 種最惡劣：前兩種至少在資料上是可辨識的異常，第 3 種是**兩個都合法、但互相矛盾的事實**，而系統沒有任何依據判斷該信哪一個。

---

## 🎯 2. 為什麼不是「service 層 fail fast」

Prisma 的 schema DSL 沒有 CHECK 約束，所以單表要擋只能靠執行期檢查。但執行期檢查有兩個問題：

1. **擋不住繞過 service 的寫入** —— 種子腳本、資料遷移、批次匯入、未來的新端點。這正是 `carbon_envelope_invariant.ts` 選擇擋在 repository（唯一 DB 閘口）而非 service 的理由。
2. **即使擋在 repository，它仍是「可被拒絕」而非「不可表示」** —— 檢查本身可能被改壞、被漏掉、被新的寫入路徑繞過，而型別做不到這件事。

`prisma.config.ts` 已宣告 `migrations: { path: "prisma/migrations" }`，所以走 migration 手寫 SQL CHECK 也是可行路徑（DB 層強制、繞過 API 也擋得住）。但 CHECK 有它自己的代價：約束寫在 migration SQL 裡，讀 `schema.prisma` 的人看不到它的存在，而任何人跑一次 `prisma db push` 就會把它 drift 掉。

---

## 🎯 3. 決策：拆成 `OnboardingTask` 與 `OffboardingTask` 兩張表

```prisma
model OnboardingTask {
  onboardingProcessId String            @map("onboarding_process_id")   // 必填
  onboardingProcess   OnboardingProcess @relation(..., onDelete: Cascade)
}

model OffboardingTask {
  offboardingProcessId String             @map("offboarding_process_id") // 必填
  offboardingProcess   OffboardingProcess @relation(..., onDelete: Cascade)
}
```

外鍵轉為**必填**，三種非法狀態一次消失，且不需要寫任何檢查：

- 兩個都掛 → 一張表只有一個外鍵，不可表示。
- 都不掛 → 外鍵必填，不可表示。
- type 矛盾 → **`ProcessTaskType` enum 一併移除**。表名即型別，那個欄位唯一能做的事就是說謊。

**這與碳盤查那條「一個寫得進去就再也讀不出來的狀態，不該是可達的」是同一個判準**，只是這裡有更強的解：碳盤查的 envelope 無法用型別表達（密文與 hint 是同一列的兩個字串），只能用不變式擋在寫入端；任務歸屬則可以直接讓非法狀態不存在。

> **能讓它不可表示，就不要退而求其次讓它可被拒絕。**

---

## 📊 4. 代價與已知取捨 (Consequences)

### 代價一：欄位定義重複

兩張表目前欄位完全相同（`title`、`description`、`status`、`assignee`、`completedAt`、`accountBookId` 與時戳）。接受這份重複，理由有二：

1. 重複的是 **7 個欄位定義，不是邏輯** —— 沒有任何行為被複製。
2. 兩種任務未來大概率會分化：離職交接需要「交接對象」與「資產歸還確認」，報到不需要。屆時單表會被迫再加一批只對其中一種有意義的可選欄位 —— 又回到今天要解決的同一類問題。

`ProcessTaskStatus` 仍為兩張表共用，因為狀態機確實相同。

### 代價二：「我的待辦」需要查兩張表

`Employee` 的反向關聯拆成 `assignedOnboardingTasks` 與 `assignedOffboardingTasks`。跨兩種任務的清單（例如 IT 人員看「我要處理的所有事」）需要兩個 query 再合併排序。

**這是拆表唯一的實質成本**，也是本決策明確接受的部分。

---

## 🔜 5. 待辦：service 層落地時必須遵守的規則

目前人事模組尚無 service 層，以下三條在實作時必須成立：

1. **待辦清單走兩個 query + 合併排序**，不要為了省一次查詢而把兩張表合回去。
2. **DTO 的 `taskType` 是衍生值**（`src/constants/hr_management.ts` 的 `ProcessTaskType`），由 service 依來源表填入，**不可以寫回資料庫**。前端待辦清單把兩種任務併成一張列表，每一列需要標示來源，這是它唯一的用途。
3. **建立任務時 `accountBookId` 必須與所屬流程的 `accountBookId` 一致**。這條拆表擋不掉（兩個都是必填外鍵，但可以指向不同帳本），屬於跨表一致性，由 service 層 fail fast —— 與 ADR 016 §5 的 PII 不變式同一類，是 schema 表達不了、必須落到程式碼的規則。

---

## 🎯 6. 附帶修正：`ProbationReview.result` 改為 enum

原為 `String?`，而欄位註解自己列舉了 `PASS, EXTEND, FAIL` 三個值。註解列得出來的封閉集合就是 enum，用 String 只是把「有哪些合法值」從型別系統搬到人腦裡（CLAUDE.md §3 拒絕魔法字串），且同一份 schema 的其他狀態欄位全數是 enum，這裡沒有破例的理由。

三個值都會進分支：`EXTEND` 延長試用期並重排考核日、`FAIL` 觸發離職流程、`PASS` 把 `EmployeeStatus` 從 `PROBATION` 轉成 `ACTIVE`。用 String 的話，一個 `"Pass"` 大小寫之差就會讓員工安靜地卡在試用期，沒有任何錯誤。

**判準不是「看起來像不像列舉」，是「有沒有程式碼拿它做分支」** —— 因此 `Dependent.relationship` 與 `EmergencyContact.relationship` 維持 `String` 是對的：那是自由文字，使用者可以填「岳母」「同居人」，不進任何判斷。

---

> 相關文件：`prisma/schema.prisma`（`OnboardingTask` 的說明）、`src/constants/hr_management.ts`、`src/repositories/carbon_envelope_invariant.ts`（同一判準的另一種解）、`documents/architecture/decisions/016_hr_pii_data_classification.md`。
