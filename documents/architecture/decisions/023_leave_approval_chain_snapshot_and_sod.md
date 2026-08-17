# 架構決策紀錄 (ADR) 023: Approval Chain Snapshots and Separation of Duties (簽核鏈快照與多級簽核的職責分離)

> **Date**: 2026-08-17
> **Author**: Julian
> **Status**: 📝 Proposed
> **核心目標**: 讓一張假單的簽核路徑在送出當下就固定下來，並讓「沒有人要簽」與「同時有兩個人在簽」這兩種狀態不可能發生。
> **關聯**: [假勤模組開發計畫書 §4 D6、D7、D8、§7](../leave_and_overtime_module_plan.md)、[ADR 009 零信任洗淨管線與 SoD](009_zero_trust_washing_pipeline_and_sod.md)、[出勤模組 §D9](../time_attendance_module_plan.md)

---

## 🛑 1. 當前架構挑戰 (Context)

Demo 版的假單只有一個核准者欄位，且它的註解已經自己承認了問題：

```prisma
// Info: (20260813 - Julian) SetNull：核准者離職不該讓假單一起消失，但「誰核准的」會因此變成 null。
// Info: (20260813 - Julian) 正式版要留下不可變的核准者快照（姓名與工號），這裡是 demo 的取捨
decidedByEmployeeId String?
```

需求要的是多級簽核（「3 天內直屬主管核准，3 天以上需簽至部門經理或 HR」）。把它做成「核准時去查 `Employee.managerId` 與 `Department.managerId`」，會產生三個獨立的問題：

| # | 問題 | 後果 |
|---|---|---|
| 1 | 組織異動改寫歷史 | 主管一調動，三個月前那張單的簽核路徑就變了。勞動檢查問「這張單當時是誰核的」，系統答的是今天的組織圖 |
| 2 | 核准者離職 → `SetNull` | 「誰核准的」變成 null。那不只是欄位遺失，那是一張**沒有人核准過的已核准假單** |
| 3 | 查不到簽核者時怎麼辦 | 員工沒有主管、部門沒有經理、帳本沒有 HR。若沒有明確決定，最容易寫出來的分支是「沒人要簽 → 直接通過」 |

第 3 點是最危險的失敗模式：一個設定缺口靜默地變成一張生效的假單，而且事後看起來完全正常 —— 因為它確實走完了所有節點（零個）。

---

## 🎯 2. 決策：規則與快照分成兩張表，送出當下展開

```
LeaveApprovalRule           帳本層級。條件 (leavePolicyId?, minDays, maxDays?) → 節點序列
    │
    │ resolveApprovalChain()  ← 只在「送出」執行一次
    ▼
LeaveApprovalStep           單據層級。**快照**：把當下的 employeeId / 工號 / 姓名 / 職稱寫死
```

`LeaveApprovalStep` 除了 `approverEmployeeId` 外，另存 `approverEmployeeNo`、`approverName`、`approverJobTitle` 三個**當下值**。核准者日後改名、調部門、離職，這張單的記載都不變。

這與 ADR 018 對 PII 的處理方向相反（那裡是加密、這裡是複寫），但目的相同：讓一個事實在它被記錄的那一刻定型。差別在於簽核者的姓名工號屬 Tier 3 INTERNAL（全公司通訊錄都看得到），不需要加密。

### 2.1 節點型別是 enum，不是資料

```typescript
export enum LeaveApprovalNodeKind {
  DIRECT_MANAGER = "DIRECT_MANAGER",         // Info: (20260817 - Julian) Employee.managerId
  DEPARTMENT_MANAGER = "DEPARTMENT_MANAGER", // Info: (20260817 - Julian) 沿 Department 樹向上找第一個有 managerId 的節點
  HR = "HR",                                 // Info: (20260817 - Julian) 具 HR 角色者，任一人簽核即通過
  SPECIFIC_EMPLOYEE = "SPECIFIC_EMPLOYEE",   // Info: (20260817 - Julian) 指名特定員工（小型組織與代理情境）
}
```

依 ADR 021 的判準：每一個值都對應一段不同的解析程式（`DEPARTMENT_MANAGER` 要走部門樹、`HR` 要查角色、`SPECIFIC_EMPLOYEE` 要讀外鍵），新增一種節點必然要寫新程式碼 —— 所以是 enum。而**門檻天數是資料**（`minDays` / `maxDays`），因為改門檻不改邏輯。

### 2.2 邊界歸屬必須明講

需求原文是「3 天內直屬主管核准，3 天以上需簽至部門經理或 HR」。這兩句在 3.0 天處**重疊** —— 恰好 3 天走哪一條？

本決策定為右開區間：`[0, 3)` 與 `[3, ∞)`，即**恰好 3 天走長假規則**。

這種邊界不能留給實作者猜。`assertRuleRangesDisjoint()` 保證同帳本內區間不重疊、且完整覆蓋 `[0, ∞)` —— 沒有任何天數會落在規則之外。

### 2.3 相鄰去重與升級

展開後可能出現兩種需要處理的情形：

**同一個人連續出現**（直屬主管恰好就是部門經理，在小部門很常見）：去除相鄰重複，並在快照記 `mergedFromKinds: ["DIRECT_MANAGER", "DEPARTMENT_MANAGER"]`。讓「為什麼這張單只有兩關」事後查得到，而不是看起來像少簽了一關。

**申請人就是該節點解析出來的人**（自己是自己的主管、或最高層級）：該節點**自動上升**至下一級（部門經理 → HR），並記 `escalatedReason`。**不 `throw`** —— 老闆也要能請假，把它做成錯誤只會逼出一個繞過簽核的後門。

---

## 🎯 3. 決策：簽核鏈展開為空 → 拒絕送出，不是自動核准

`resolveApprovalChain()` 若展開出零個節點，回 `CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED`（409），假單**送不出去**。

理由已在 §1 第 3 點說明：自動核准會讓設定缺口變成一張看起來正常的生效假單。依 CLAUDE.md §6「提早報錯（Fail Fast）」，在最外層就凍結。

錯誤訊息必須指出**缺什麼**（「您尚未設定直屬主管，請聯繫人資」），而不是一句「簽核流程錯誤」—— 因為這個錯誤的解法在 HR 手上，不在員工手上。

**為什麼用 409 而非 400**：這不是請求參數錯誤（員工填的每一個欄位都對），是系統狀態與請求不相容。同 `ApiCode.CONFLICT` 的既有語意。

---

## 🎯 4. 決策：「同一張單同時有兩個待簽節點」在 schema 層不可表示

```prisma
model LeaveApprovalStep {
  // Info: (20260817 - Julian) 僅當本節點為「當前待簽」時等於 leaveRequestId，其餘為 null。
  // Info: (20260817 - Julian) Postgres 的 unique index 不約束 NULL，因此已簽與尚未輪到的節點
  // Info: (20260817 - Julian) 可以有很多筆，而待簽的只能有一筆。
  pendingKey String? @unique @map("pending_key")
}
```

手法完全沿用既有的 `LeaveDay.activeKey`（「同一人同一天有兩張生效假單」不可表示）與 `LeaveRecall.pendingLeaveDayId`（「同一天同時掛兩張待回應徵詢」不可表示）。

**這是本專案第三次用同一個手法**，這件事本身值得記下來：partial unique index 是「同一個實體在同一時刻只能有一個活躍狀態」這類約束的標準解，而它在 Prisma 的可攜寫法就是一個可空的 `@unique` 欄位加上「只在活躍時填值」的紀律。第四次遇到時不需要再論證一遍。

### 4.1 為什麼不是 `LeaveRequest.currentStepOrder`

那會是第二個真相：`LeaveRequest.currentStepOrder = 2` 與 `LeaveApprovalStep[1].status = PENDING` 可以互相矛盾，而系統沒有依據判斷該信哪一個 —— 正是 ADR 019 §1 表格評為「最惡劣」的第 3 種非法狀態。

### 4.2 沒有 `PARTIALLY_APPROVED` 狀態

`LeaveRequestStatus` 維持四個值（`PENDING` / `APPROVED` / `REJECTED` / `WITHDRAWN`）。

理由與既有 `LeaveRequestStatus` 註解拒絕 `RECALLED` 的理由相同：中間節點簽了不代表這張單處於一個新的狀態，那只是簽核鏈走到第幾格 —— 而那個事實已經在 `LeaveApprovalStep` 上。把它同時寫成單據狀態，就是把同一個事實存兩份。

---

## 🎯 5. 決策：四條職責分離規則

前三條沿用出勤模組 §D9 對補登單立下的規矩，第四條為本模組新增。

| # | 規則 | 錯誤碼 |
|---|---|---|
| 1 | 不得自我核准 | `FO_SELF_APPROVAL_FORBIDDEN`（既有） |
| 2 | 非簽核鏈上的節點不得代簽 | `FO_NOT_AUTHORIZED_REVIEWER`（既有） |
| 3 | 已決之單不得再改 | `VA_LEAVE_ALREADY_REVIEWED` |
| 4 | 節點解析出申請人本人時自動上升，不 `throw` | 見 §2.3 |

第 1 條與 §2.3 的自動上升是同一件事的兩面：**規則 1 擋的是「繞過鏈去簽自己的單」，§2.3 處理的是「鏈本身正當地指向了自己」。** 兩者若混為一談，會得到「老闆不能請假」這個荒謬的結果。

這條界線與 ADR 009 對零信任洗淨管線的三角色切割同源：職責分離的目的是讓每一筆寫入都有一個不同於發起人的見證者，而不是讓流程走不下去。

---

## 🎯 6. 決策：餘額不預扣，扣減發生在最後一關通過的那個交易內

### 6.1 決策內容

- **送出時**檢查餘額，不足回 `VA_LEAVE_INSUFFICIENT_BALANCE`。**但不預扣。**
- **最後一個簽核節點通過**時，在單一 `$transaction` 內完成：寫 `LeaveLedgerEntry` → 更新 `LeaveBalance` → 投影 `EmployeeShiftDay.dayType = LEAVE` → 更新 `LeaveRequest.status = APPROVED`。

### 6.2 為什麼不預扣

預扣就必須處理三條補償路徑：駁回要退回、撤回要退回、簽核中主管離職卡住也要退回。每一條都是一個可能漏掉的分支，而漏掉的後果是額度憑空消失 —— 那是員工會投訴、HR 查不出原因的那種 bug。

不預扣則**只有一條路徑會動到額度**，而那條路徑上不會有中斷（同一個交易）。

### 6.3 代價：兩張單併發

兩張假單同時送出、都通過送出時的餘額檢查、先後核准 → 第二張在**核准時**才失敗（`CF_LEAVE_BALANCE_RACE`，409）。

這是可接受的：失敗發生在核准者面前，而核准者本來就是要做判斷的人；且第二張單的申請人會看到一個明確的理由，而不是一個算不出來的餘額。

### 6.4 併發的正確寫法

核准端**不得**先讀餘額再寫。必須用帶條件的 `updateMany` + `count === 0` 判輸：

```typescript
// Info: (20260817 - Julian) 讀後寫在併發下會兩張單都過。條件更新把判斷交給資料庫，
// Info: (20260817 - Julian) count === 0 即代表「有人先扣走了」。
// Info: (20260817 - Julian) 手法沿用 Demo 期間 W20 分頁競態的結論（attendance_demo_plan.md §5）。
const updated = await tx.leaveBalance.updateMany({
  where: { employeeId, leavePolicyId, remainingMinutes: { gte: minutes } },
  data: { remainingMinutes: { decrement: minutes } },
});
if (updated.count === 0) throw new AppError(API_ERRORS.CF_LEAVE_BALANCE_RACE);
```

`LeaveGrant` 層的 FIFO 扣減（ADR 022 §4）同理，逐批以條件更新扣，任一批失敗即整個交易回滾。

---

## ⚖️ 7. 取捨與代價

| 代價 | 說明 | 為何接受 |
|---|---|---|
| 快照會過時 | 主管調動後，未簽完的舊單仍指向舊主管 | **這正是要的**。若要改派，走明確的「轉簽」動作並在快照留記錄，而不是靜默地換人 |
| 資料冗餘 | 姓名工號各存一份 | 冗餘的是**當下值**不是同一個事實的第二份 —— `Employee.name` 是「他現在叫什麼」，快照是「他當時叫什麼」，兩者本來就可以不同 |
| 規則展開的成本 | 每次送出多幾次查詢 | 送出是低頻操作；且 L17（試算端點）已經要做同一件事，兩者共用 `resolveApprovalChain()` |
| 第二張單失敗得晚 | §6.3 | 換到只有一條路徑會動額度 |

---

## 🚧 8. 後果與待辦

1. **`LeaveRequest.decidedByEmployeeId` / `decidedAt` 移除**：其職責由 `LeaveApprovalStep` 承接。Demo 版的該欄位註解自己預告了這件事。
2. **代理人機制未做**（計畫書 §17 缺口 4）：主管出差時簽核會卡住。暫以 `SPECIFIC_EMPLOYEE` 節點手動繞行，里程碑 3 後評估是否需要 `LeaveApprovalDelegation` 表。若要做，快照必須同時記「原節點」與「代理人」—— 只記代理人會讓路徑看起來像設定錯誤。
3. **`HR` 節點的角色來源待定**：目前沒有帳本層級的 HR 角色定義。⚠️ 需與既有 `teamRepo.getTeamMember` 的角色體系對齊，不新造一套權限。里程碑 3 前必須決定。
4. **通知與簽核解耦**：`LeaveApprovalStep` 進入 `PENDING` 時發通知，但**通知失敗不得阻斷簽核**。失敗進既有重試機制，達上限落 DLQ（CLAUDE.md §6 第 3 條）。
5. **`assertRuleRangesDisjoint` 必須同時檢查「完整覆蓋」**：只檢查不重疊而漏掉覆蓋，會讓某個天數區間展開出空鏈，然後撞上 §3 的拒絕送出 —— 那時錯誤訊息會指向員工的主管設定，而真正的原因在規則表。以 `leave_approval_chain.test.ts` 釘住。
