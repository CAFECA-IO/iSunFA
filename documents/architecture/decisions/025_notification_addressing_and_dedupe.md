# ADR 025: 通知的定址、去重與內容邊界

> **Author**: Julian ｜ **Version**: 3.0 ｜ **Status**: Accepted ｜ **Last Updated**: 2026-08-25
> **相關文件**：[通知模組開發計畫書](../notification_module_plan.md)、[部署檢查表](../../engineering_guidelines/deploy_checklist_notification_2026q3.md)

---

## 0. 一句話

通知是**投遞**不是軌跡；**待辦型活算不入庫、事件型入庫**；文案不存 DB；收件人恆為 `User`；去重靠 `dedupeKey` 唯一鍵。

---

## 1. 待辦型活算，事件型入庫

| 類別 | 來源 | 例 |
|---|---|---|
| **待辦型** | 有活來源的：讀取時向來源表**現算**，不存副本。沒有活來源的：存 DB | `TEAM_INVITATION`（活算）、`WALLET_UPGRADE`（入庫） |
| **事件型** | 發生時寫入 DB | `ANALYSIS_COMPLETED`、`ANALYSIS_FAILED` |

**為什麼邀請不入庫**：邀請被接受、撤回、過期時，通知必須**同步**消失。存副本就要在 accept / decline / revoke / expire 四條路徑上都記得改它，漏一條就是一則永遠掛著、點進去接受不了的假待辦。活算沒有這個同步問題，代價只是一次 `teamInvitation.findMany`。

**判準（供後續型別套用）**：

> 一個待辦要不要入庫，看它**有沒有一個能回答「還需要處理嗎」的活來源**。有 → 活算。沒有 → 入庫，而那時就需要一把可回收的鍵（§5.1）。

`WALLET_UPGRADE` 落在後者：「系統要求你升級」不是任何一張表算得出來的狀態。它因此入庫，也因此是 D1 的成因。

---

## 2. 型別用 `String`、狀態用 `readAt`、`id` 用 DB default

**`type: String` 而不是 Prisma `enum`**：本專案沒有 migrations 目錄，schema 以 `prisma db push` 套用，enum 新增成員必須改 schema。`String` + 常數層 `as const` 已滿足 coding_guidelines §3.4「拒絕魔法字串」（單一定義處、`NotificationType` 聯集型別、比對的是常數），而新增一種事件型通知**完全不動 schema**。

代價：DB 層不擋未知的 type 字串。可接受 —— 寫入端只有 service，而 service 只用常數。

**`readAt DateTime?` 而不是 `status` enum**：只有兩種狀態，而 `readAt` 同時承載「讀了」與「什麼時候讀的」。多一個沒有消費者的 `ARCHIVED` 會讓它看起來像一條生效中的規則。

**`id @default(uuid())`**：應用層產生 id 的理由是「service 要在寫入前持有 id 好放進投遞軌跡」。沒有投遞軌跡表（§5.2），這個理由不成立。

> 值得記一句：原本的設計要靠 schema 註解攔住「順手補上 default」這個更簡單的寫法。**當一份 ADR 需要靠註解攔住一個更簡單的寫法時，先問那個更簡單的寫法是不是其實就夠了。**

---

## 3. 只存 `type` + `payload`，文案在前端

```prisma
type    String   // NOTIFICATION_TYPE 常數
payload Json     // type 專屬資料（analysisId、analysisType…），畫面插值用
```

**不存句子、不存 i18n key、不存連結路徑。** 三個理由：

1. **五語系即時生效。** `zh_tw.ts` 是唯一事實來源，其餘四語系 `satisfies BaseTranslation` —— 少一個 key 就 `tsc` 失敗。存句子等於把產生當下的語系凍結進 DB。
2. **個資不會被複製到保護更弱的地方。** `payload` 只放 id、type、數量，**不放姓名**（雖然是 Tier 3）。理由不是敏感度，是衍生值是第二種真相，而通知沒有 `LeaveApprovalStep` 那種舉證需求。
3. **保留期限不會被繞過。** 嵌了個資的通知會活得比 ADR 018 的清除排程更久。

**要守的紀律**：`type → 文案` 與 `type → 路徑` 各只能有一個判斷點，收在 `src/constants/notification.ts` 的查表裡，**元件不做決定**（checklist §2.1）。深連結只用站內相對路徑，且**不得帶任何 token**（checklist §4.1：秘密會進 access log、瀏覽器歷史與 `Referer`）。

---

## 4. 收件人恆為 `User`，必填外鍵

**不做** `recipientUserId? + recipientEmployeeId? + recipientKind` 的三欄組合 —— ADR 019 §1 逐字判為最惡劣的形狀，三種非法狀態一個不少：兩個外鍵都有值、都是 null（沒有人看得到、也沒有人會發現它存在）、`kind` 與外鍵矛盾。

> 能讓它不可表示，就不要退而求其次讓它可被拒絕。

**未來需要員工維度的通知時：拆表**（`EmployeeNotification`），比照 ADR 019 對 `ProcessTask` 的處置。代價是兩支查詢 + 合併排序，而 ADR 019 §5 已經替這個代價背書。

**`accountBookId` 目前沒有**，而這是對的：現有三種型別沒有一個是帳本層的事。真的出現時要一併決定「帳本**軟刪除**後通知怎麼辦」—— `AccountBook.deletedAt` 存在，所以 `onDelete: Cascade` 永遠不會觸發。

---

## 5. 一把鍵夠用，第二把要等 HR

`dedupeKey String? @unique`，永久去重。組成是決定性的業務屬性、**不含 timestamp**（`analysis-completed:${analysisId}`、`wallet-upgrade:${userId}`）—— 時間戳不同就是兩個不同的鍵，那正是 ADR 010 §1 的 Double Booking 成因。

**需要它的原因**：`MissionExecutor` 崩潰時會刻意輸出帶錯誤標記的 `result.md` 以推進狀態機 → 上鏈 → reject → 重試，最多三輪。沒有這把鍵，使用者會收到三則「您的報告已完成」。

**可空是對的**：不需要去重保護的通知不帶鍵，而 Postgres 的唯一約束允許多個 null。

### 5.1 第二把鍵（`activeUnreadKey`）：時機未到

「同一個待辦同時最多一則未讀，已讀時把鍵設回 null 好讓它能再發」—— 對**活算的**待辦不需要（§1），對**入庫的**待辦需要，而 `WALLET_UPGRADE` 正是入庫的。

目前的處置是讓待辦型的已讀完全由它自己的完成條件驅動（探針轉 true），於是不需要可回收的鍵。**HR 接線時就需要了**：「這張單等您簽核」在被撤回、重送、簽核鏈重展開後要能再發，而它不是活算的。屆時加 `activeUnreadKey String? @unique`，只在未讀時填值。

> 這是本專案第五次用同一個手法（`LeaveDay.activeKey`、`LeaveRecall.pendingLeaveDayId`、`LeaveApprovalStep.pendingKey`、`EmployeeHrFunctionAssignment.activeKey`）。ADR 023 §4 寫的是「第三次」—— **手法是慣例，數字不是；寫在文件裡的計數是一種會腐壞的引用。**

### 5.2 投遞失敗軌跡：要等 fan-out

目前每種通知都是一人一則，沒有 fan-out，也就沒有「解析不到收件人」這個狀態。

HR 引入第一個 fan-out 時它就要回來，而理由會更硬：`Employee.userId` 可空**是刻意的**（工地的人可能沒有平台帳號）。fan-out 解析到 0 人時最容易寫出來的分支是靜默成功，後果是**一張假單永遠沒有人知道要簽** —— 與 ADR 023 §3 拒絕「空鏈自動核准」是同一個失敗形狀。

**那張表必須有讀者，否則不要建**（checklist §3.5：稽核欄位沒有讀者，稽核價值就是零）。

---

## 6. 提示音用 WebAudio 合成，不用音檔

兩聲短音（880 Hz + 1174.66 Hz，間隔 0.12s，gain 指數衰減）。沒有 binary 資產、沒有授權來源要查、沒有載入失敗的路徑 —— **本專案至今沒有任何媒體資產，這個決定讓它繼續是零。**

**autoplay 政策靜默降級**：`ctx.state !== "running"` 時直接 `return`。反面做法是「嘗試播放、失敗後提示使用者開啟音效」，那會在每個新開的分頁上跳一次提示，而使用者什麼都沒做錯。繞過它的手段（隱藏 iframe 之類）都比「少響一聲」糟。

**AudioContext 是模組層單例**，首次手勢解鎖、回前景 resume。per-play `new AudioContext()` 會撞上 Chrome 約 6 個的上限，而超過之後是**靜默失敗**。

**「什麼算有新通知」比較的是總數增加**（`total > last`），不是「有沒有未讀」；`last === null`（首抓）不觸發。前者會讓沒收掉的舊通知每分鐘搖一次，後者會讓使用者剛打開頁面就被打招呼。

### 6.1 抵達的識別值：第三把鍵，而且它一開始是錯的

跨分頁「同一次抵達只響一次」需要一個識別值，它要同時滿足兩件事：

1. **每個分頁算出來要一樣** —— 否則三個分頁各認為自己是第一個，各響一聲
2. **不同的抵達要不一樣** —— 否則識別值被記住之後就再也不響

初版用 `todoCount:completedCount`，滿足第 1 點（純內容、無本地時間戳，正是 §5 對 `dedupeKey` 的同一條理由），**但不滿足第 2 點**。手動驗收實測到的序列：

```
讀完（0:0）→ 來一則（0:1）→ 響
讀完（0:0）→ 再來一則（又是 0:1）→ 搖，但不響
```

這是最常見的使用節奏。`SEEN_KEY_LIMIT = 32` 要 32 個**相異**的鍵才會把舊的擠掉，實務上永遠擠不掉。而且症狀不可見：畫面照樣搖、徽章照樣加。

修正（D17）是把**伺服器端最新一則未讀的 `createdAt`** 編進去：

```
`${latestUnreadAt ?? 0}:${todoCount}:${completedCount}`
```

值由來源決定，所有分頁看到同一個（滿足 1）；新通知必然有更晚的時間（滿足 2）。這**不違反** §5 拒絕 timestamp 的理由 —— 那條反對的是各分頁**各自產生**的時間，這裡要的正是唯一來源的時間。三個值一起組是為了涵蓋活算的待辦（邀請沒有 `createdAt`，但它一定讓 `todoCount` 變動）。

摘要因此多回一個 `latestUnreadAt`，而**沒有多打一趟 DB**：`summarizeUnread` 用同一支 `groupBy` 加 `_max: { createdAt: true }` 一起帶回來。這支是每 60 秒 × 在線人數的端點，多一次往返要乘上那個係數。

> **教訓**：`dedupeKey`（同一件事只發一則）與抵達識別值（同一次抵達只響一聲）看起來是同一個問題，**但去重的維度不同** —— 前者跨時間永久去重，後者只在一次抵達的範圍內去重。把前者的設計原則整套搬到後者身上，得到的是一個永久靜音的鈴鐺。

---

## 7. 落地時必守的既有工程契約

每一條都有既知的失效樣本，不是風格偏好。

| 契約 | 內容 |
|---|---|
| **分層** | `route.ts` 只做驗身分 → 限流 → service → `jsonOk`/`jsonFail`。Repository 是唯一碰 Prisma 的層，且**可以回答「是什麼」，不可以回答「可不可以」**。⚠️ 這條目前**沒有自動守門人**（`transaction_layering.test.ts` 只存在於另一條分支），靠 review |
| **回應信封** | `jsonOk()` → `{ powerby, success, code, message, payload }`。前端 `request<T>()` **不拆信封**，必須自己讀 `.payload`。漏拆的症狀：`tsc` 與 `build` 全綠，**只在 API 成功時**於 render 階段炸掉 |
| **限流** | `enforceRateLimit(identity, bucket)` 排在驗身分之後、業務邏輯之前。⚠️ `attendance_rate_limit.test.ts` 的掃描根只有 HR 目錄，通知路由**登記不進去、缺席也不會變紅** —— 因此本模組自帶 `notification_rate_limit.test.ts` |
| **錯誤碼** | `API_ERRORS` 以鍵索引，**兩個鍵並存不會有型別錯誤，只有 code 字串撞號，而對外契約正是那個字串**。開發前對 base／develop／branch 各取一份算交集（checklist §6.1） |
| **失敗要留線索** | 把多種上游狀態塌成同一個回傳值，在 log 裡的後果是查不出成因。`IS_UNKNOWN` 不 log 就是這個形狀 |
| **三個 Error 型別** | `AppError`（`lib/utils/error.ts`）、`ApiError`（`error_dictionary.ts`，本模組用的是這支）、**另一個** `ApiError`（`request.ts`，前端 fetch 失敗時拋出）。前端要 catch 的是最後那支 |
| **註解** | `// Info: (YYYYMMDD - 作者) …`；只有 `Info:` / `ToDo:` / `Deprecated:`；JSX 內 `{/* Info: … */}` |
| **命名** | 檔名 `snake_case`（ESLint `check-file` 強制）、interface `^I[A-Z]`、匯入一律 `@/` |
| **樣式 token** | 只用 `@theme` 真的定義過的名字。裸的 `--color-surface` / `--color-border` 不存在 —— 用了就是無效 class，而 `tsc` 與 `lint` 全綠（D3）。`success` 是 20260825 為本模組新加的 |
| **沒有 migrations** | `prisma db push`；欄位新增與資料回填是兩件事，**順序做錯不會噴錯，只會安靜停擺** |

---

## 8. 未解決的問題（不在本 ADR 拍板）

1. **關閉音效／關閉鈴鐺的路徑。** 目前沒有。加之前要先決定它們是不是同一件事。
2. **通知的保留期限**，以及它與 ADR 018 兩處未結案的個資清除排程的關係。天數走 ADR 017 簽章設定，而 `UNTRUSTED` 下清除 worker **必須拒絕執行**（一般設定 fail-closed 可逆；刪資料不可逆）。
3. **`LeaveRequest` 的假別與 `reason` 在 ADR 018 的三級表中不存在。** 病假、生理假揭露健康狀況，而通知是最容易把它擴散出去的介面。§3 已把風險降到最低，但分級本身是要回報給 ADR 018 的缺口。
4. **HR 職能 fan-out 為空時的行為。** `EmployeeHrFunctionAssignment` 有讀取來源但沒有指派 API。
5. **需求說「側邊欄」而實作是桌機下拉 / 手機全螢幕** —— 是刻意的簡化還是偏離？上線前的產品決策項。

---

## 9. 一句話總結

這個模組最大的一個決定是**把「待辦通知」從一筆資料變成一次查詢** —— 那消掉了整套「發了要記得回收」的同步負擔，而不是把它做得更好。

剩下三樣東西（可回收的鍵、投遞失敗軌跡、員工維度的收件人）不是錯的，是**還沒到**。§5 記下了它們各自要回來的觸發條件，那比把它們寫進一個現在沒有人需要的 schema 有用。
