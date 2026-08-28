# 可接續任務「可以繼續了」的通知（規劃）

> **Author**: Julian ｜ **Date**: 2026-08-28
> **狀態**：**已實作**（20260828，`npm run test` 全綠）。實作紀錄與兩處計劃修正見 §12。
> **分支**：`feature/notice_of_point_refilling`，疊在 `feature/notification_bell` 之上 ——
> 後者會先合併，屆時本分支的 review 範圍才會收斂到這個功能本身。
> **相關**：[通知模組開發計畫書](notification_module_plan.md)｜`src/constants/resumable_job.ts`（issue #6713）｜`POST /v1/user/job/[job_id]/resume`（issue #6714）

---

## 1. 需求

> 因為點數不足而中斷的任務，在點數補回時要通知使用者。

今天唯一會走到這個情境的是**智能溫盤的匯入報告**（`JOB_TYPE.CARBON_REPORT_IMPORT`）：
逐章匯入，每章一次 LLM 呼叫、各自計費。#6713 的起因就是一個真實事故 ——
64 頁的報告匯入到一半點數用完。

---

## 2. 現況：狀態機已經備好了，缺的是最後一哩

| 元件 | 狀態 |
|---|---|
| `ResumableJob` 資料表（`@@unique([resourceKey, type])`、`@@index([userId, status])`） | ✅ |
| `PAUSED` / `RESUMABLE` 兩個狀態 | ✅ |
| `scanResumableJobs`（每 5 分鐘、一輪 50 筆，已掛在 `run_worker.ts`） | ✅ 團隊額度那半邊 |
| `markResumable()`（條件更新，只有真的翻面才回 `true`） | ✅ |
| 個人點數的翻面 | ❌ 掃描明確跳過 |
| **告訴使用者** | ❌ |

`RESUMABLE` 這個狀態存在的理由，常數註解自己說了：

> 為了讓「可以繼續了」這件事有一個**明確的時點** —— 畫面據此把橫幅從「已用完」
> 換成「可以繼續」，而不是每次載入都自己去猜。

**那個時點就是通知的發射點。** 這不是硬塞一個 hook，是把一個已經被刻意標記出來的
時刻接上一個已經存在的出口。

而目前唯一會讀到它的是 `GET /v1/user/job`，**只在碳盤查聊天室頁面載入時打一次**。
使用者點數用完之後最可能做的事就是關掉分頁 —— 然後再也不會知道額度補回來了。

---

## 3. 伺服器不可能自動重啟，這決定了文案與型別

`POST /v1/user/job/[job_id]/resume` 的檔頭：

> 回傳剩餘步驟，**執行由呼叫端進行** —— 內容在呼叫端手上
> （個人會話是端到端加密，伺服器沒有金鑰）。

報告內容加密在使用者那邊，逐章迴圈跑在瀏覽器（`runResumableJob` 是 `use_carbon_chat.ts`
匯入的前端函式）。`scanResumableJobs` 只翻狀態，**不執行也不可能執行**任何工作。

所以使用者實際要做三件事：

1. 回到那個聊天室
2. 按「繼續匯入」
3. **換過裝置或重新整理過的話，還要重新上傳同一份原始檔案**

第 3 點是真的：暫停清單存在 `CarbonPendingImport`（跟著帳號走），但原始檔案只在
`lastImportSourceRef` —— 記憶體裡。`use_carbon_chat.ts` 有一段註解專門講這件事。

### 由此得到兩個結論

- **文案不得寫「已為你繼續」**。要寫的是「可以繼續了，回去按一下」。
- **這是待辦型，不是事件型**：有一件事等著使用者做，做完之後那則通知才該消失。

---

## 4. 型別歸類：待辦型、**活算**

`listNotifications` 的待辦區現在有兩個來源：邀請（活算）與錢包升級（入庫）。這裡加第三個，用活算。

**為什麼活算**：`ResumableJob.status` 本身就是活狀態。使用者按「繼續」時
`startJobResume` 把它設成 `RUNNING` 並清掉 `pauseReason`，取消則是 `CANCELLED` ——
兩種情況那則通知都該同步消失，而活算天然做得到。

**為什麼不入庫**：同一個 `resourceKey` 會暫停 → 繼續 → 再暫停。入庫的話
`dedupeKey` 是永久唯一鍵，第二次就發不出來；要修得把 `activeUnreadKey`
（ADR 025 §5.1）要回來，而那是為了「來源不是活狀態」的情況設計的。這裡不是。

### 代價：小鈴鐺的摘要要多一趟 DB

現在每 60 秒兩趟（邀請活算 + 未讀計數），加第三個來源變三趟。而計畫書 §6 第 7 項
說效能從來沒量過 —— **這是該量的時機**，不是該忽略的細節。

查詢本身是索引撐得住的（`@@index([userId, status])`，只撈 `RESUMABLE`），
但「多一趟」乘上在線人數才是問題。要評估的選項：與現有查詢合併、
或只在待辦計數非零時才查明細。

---

## 5. 兩條觸發路徑，機制不同

| | 觸發 | 落點 | 現況 |
|---|---|---|---|
| 團隊額度 `CREDITS_EXHAUSTED` | 每 5 分鐘輪詢 | `scanResumableJobs` 裡 `markResumable` 回 `true` 之後 | 機制已有，只缺通知 |
| 個人點數 `PAYMENT_REQUIRED` | `TxTracker` 確認付款 | **新增**：訂單轉 `PAID` 後查該 user 的暫停任務 | 機制要新做 |

### 5.1 團隊額度：**不用改任何程式碼**

> **20260828 修正。** 這一節原本寫著「`markResumable` 回 `true` 之後發通知」，
> 而那是把活算當成事件型在想。

`JOB_RESUMABLE` 是活算的（§4），所以**翻成 `RESUMABLE` 這件事本身就是通知** ——
小鈴鐺下一次輪詢從 `listResumableByUser` 讀到它就出現了。
`scanResumableJobs` 不需要、也不該呼叫任何發射函式，與
`team_invitation.service` 從來不「發射」邀請是同一件事。

團隊那條路的程式碼改動因此是 **0 行**。

連帶地，原本列在 §9 的兩條判準（「只發一則」、「`markResumable` 回 `false` 時不發」）
對這條路失去意義 —— 它們變成**狀態的性質**而不是發射的性質。
`markResumable` 的條件更新仍然重要，但它守的是「不要把正在跑的任務標成等著被繼續」，
那件事本來就有測試。

### 5.2 個人點數：事件驅動，不要輪詢

掃描刻意跳過 `PAYMENT_REQUIRED`，理由有兩層，兩層都仍然成立：

1. **判斷不出來**：個人點數在鏈上，要問就得發 RPC。掃描一輪 50 筆、每 5 分鐘一次 ——
   原始碼寫著「一輪 50 筆 RPC 太貴」，所以它連查都不查。
2. **就算查得出來也不該翻**：那個暫停原因不是「餘額不夠」，是「這筆錢需要你簽章」。
   沒付款就是不能繼續，翻成「可以繼續」是**一個假承諾**。

所以不要把 `PAYMENT_REQUIRED` 加進掃描。改走事件：

```
使用者付款 → TxTracker 確認入帳 → 訂單轉 PAID
           → 查該 userId 有沒有 PAYMENT_REQUIRED 的 PAUSED 任務
           → 有就翻面 + 發通知
```

一次付款確認配一次 DB 查詢，**零額外 RPC**，而且比 5 分鐘輪詢更即時。
`order.tracker.service.ts` 有兩處把訂單標成 `PAID`，兩處都要接。

#### 翻面前不再確認一次餘額

與 `resume` route 現在的做法一致，它的檔頭寫著：

> 這一支不做餘額檢查：真正的判斷在執行時的扣款…先檢查一次會出現
> 「檢查說夠、扣款說不夠」兩個答案，而使用者只會相信後者。

付款確認過就翻面，夠不夠讓實際扣款說了算。萬一還是不夠，它會再暫停一次 ——
那條路徑本來就在。

#### 補點數與那個任務無關時也要接

使用者可能是幾天後從定價頁單純加購點數。**任何** `BILLING_POINT` 訂單轉 `PAID`
都該重查一次該使用者的暫停任務，不要只認「為了這個任務建的那張單」。

#### 邏輯要放在 TxTracker **外面**

`order.tracker.service.ts` 沒有測試檔，而它 import 了 `publicClient`、`viem` 的
`decodeEventLog` 與 `ABIS`。要為它寫第一支測試，得先把鏈上那一層架起來 ——
而那是替一支既有服務補課，與這個功能沒有直接關係，範圍會失控。

所以邏輯抽成一支純服務函式：

```
releasePaymentBlockedJobs({ userId, nowMs })   ← 只依賴 repo 與 notification service
  ↑
order.tracker.service.ts 標 PAID 之後呼叫它     ← 只是一行接線
```

測試落在新寫的那支函式上（兩個相依都好 mock）；TxTracker 那一行用
`notification_bell_wiring.test.ts` 既有的 `codeOf` 掃描手法釘住「有沒有呼叫」，
與現在釘 recorder 的那兩條同一個形狀。

**代價要說清楚**：掃描證明不了「真的付款時會走到那裡」。那一項只能靠真的跑一次 ——
與通知驗收清單的 `p1`（Validator 產不產得出 `approved.*.md`）是同一種形狀。

---

## 6. 去處

**`/user/carbon_chatbot`** —— 但這裡有一個限制要先講明白。

那一頁**不吃任何 searchParams**（`grep searchParams src/app/user/carbon_chatbot/page.tsx`
零命中），所以現在做不到「點通知直接開那一個聊天室」。

與 D43 的情況要分清楚：D43 的錯是把人帶到一個**結構上放不下那筆紀錄**的頁面。
這裡不同 —— 那一頁就是匯入所在的地方，只是不夠精準。所以：

- 這一版指向 `/user/carbon_chatbot`，可點
- 逐一深連結（帶 `resourceKey`／sessionId）需要那一頁支援 searchParams，**另開一項**
- payload 仍然帶 `resourceKey`，這樣深連結做好時**這張表不用改就會生效**
  （與 D43 的 `:token` 同一個手法）

---

## 7. 測試準備度（動手前先看這節）

兩個接點的準備度差很多，而那個差異決定了工作量的分佈。

### 7.1 新相依會炸掉某支測試的 mock —— 但**位置與這節原本的預測不同**

> **20260828 修正。** 這一節原本預測 `resumable_job_service.test.ts` 會炸，
> 理由是「加了通知呼叫就會拉進 notification service」。
> 實作之後那件事沒有發生 —— 因為活算讓 `resumable_job.service` 根本不 import 通知。
>
> **真正炸的是 `notification_service.test.ts`**：`notification.service` 現在
> import `resumableJobRepo`，少了 mock 整支測試會拉進真的 Prisma。
> 活算把相依關係搬到了另一個方向，而預測沒有跟著搬。
>
> **坑的形狀判斷對了，位置判斷錯了。** 記在這裡是因為下一個加活算來源的人
> 會踩同一顆：問「誰 import 了新東西」，不是問「誰呼叫了新功能」。

> Jest 的 `jest.mock` 是**逐檔案**的。全站對 notification service 的分工是：
> `notification_service.test.ts` 測它本體（假 repo、真 service）；
> `issue_recorder_giveup.test.ts`、`notification_bell_wiring.test.ts`、
> `notification_rate_limit.test.ts` 各自 mock 掉它，因為它們測的是「有沒有呼叫」
> 而不是通知本身。新的呼叫端要選邊站，而這裡屬於後者。

這與 20260828 那次 `TransactionRepo: class {}` 是同一種傷：mock 只覆蓋了
「當時走得到的路」，新程式碼走到新的路就炸。所以它是**實作的第一步**，不是收尾。

### 7.2 `order.tracker.service.ts`：**完全沒有測試檔**

見 §5.2 的處置 —— 邏輯抽出來測，接點用掃描釘住。
不要為了這個功能去補 TxTracker 的測試。

### 7.3 順帶要看的既有測試

- `carbon_import_pause.test.ts`：測「點數用完」的暫停路徑。這次不動暫停側，
  但若 `saveJobBookmark` 的回傳形狀有變動，它會第一個紅
- `resumable_job.test.ts` / `resumable_job_ownership.test.ts`：repo 新增方法時
  順帶確認它們的假 repo 需不需要跟著補

---

## 8. 落點清單

| 檔案 | 改什麼 |
|---|---|
| `src/constants/notification.ts` | 新增 `JOB_RESUMABLE` 型別；加進 `TODO_NOTIFICATION_TYPES`；`NOTIFICATION_TYPE_STYLE` 與 `NOTIFICATION_LINK_PATH` 各補一格 |
| `src/lib/notification_message.ts` | 文案分支（帶 `completed/total` 進度） |
| `src/components/notification/notification_row.tsx` | `ICON_BY_KEY` 加 `play`（見 §12 的理由） |
| `src/constants/resumable_job.ts` | 新增 `JOB_RESUMABLE_NOTICE_LIMIT` |
| `src/repositories/resumable_job.repo.ts` | 新增「某使用者的 `RESUMABLE` 任務」（活算來源）與「某使用者 `PAYMENT_REQUIRED` 的 `PAUSED` 任務」 |
| `src/services/notification.service.ts` | `listNotifications` / `getNotificationSummary` 加第三個活算來源 |
| `src/services/resumable_job.service.ts` | **新增** `releasePaymentBlockedJobs()` —— 個人付款後的翻面與通知，可測 |
| `src/services/order.tracker.service.ts` | 兩處標 `PAID` 之後各呼叫一次上面那支（只有一行接線） |
| `src/__tests__/notification_service.test.ts` | **先加** `jest.mock("@/repositories/resumable_job.repo")`（見 §7.1），再加四條活算來源的測試 |
| `src/__tests__/resumable_job_service.test.ts` | repo mock 補 `listPaymentBlockedByUser`；`releasePaymentBlockedJobs` 三條測試 |
| `src/__tests__/notification_bell_wiring.test.ts` | 掃描：TxTracker 標 PAID 之後真的呼叫了 `releasePaymentBlockedJobs` |
| `src/i18n/locales/{en,ja,ko,zh_cn,zh_tw}/notification.ts` | 五語系文案 |

---

## 9. 驗收判準

### 9.1 已由自動化測試涵蓋（20260828）

- [x] 可繼續的任務進待辦節，帶得出 `resourceKey` 與進度
- [x] 算進 `todoCount`、不算進 `completedCount`
- [x] 抵達時間取 `updatedAt`（**這一次翻面**）而不是 `createdAt`（開始匯入）
      —— 見 §12 的理由，這條單獨存在
- [x] 沒有可繼續的任務時，摘要與清單不受影響
- [x] `releasePaymentBlockedJobs`：沒有等付款的任務時回 0、不寫任何東西
- [x] 逐筆翻面，翻不動的（使用者已自行繼續或取消）不算進釋放數
- [x] TxTracker 標 `PAID` 之後呼叫了 `releasePaymentBlockedJobs`，且包在 `try` 裡（掃描）
- [x] `notification_service.test.ts` 有 mock `resumable_job.repo`（見 §7.1）

### 9.2 只有真的跑一次才算數

- [ ] 團隊額度補回後，下一輪掃描（最多 5 分鐘）鈴鐺出現那一則
- [ ] 個人付款確認後**立即**出現，不等 5 分鐘
- [ ] 與那個任務無關的加購點數也會觸發重查
- [ ] 使用者按「繼續」後（`status → RUNNING`），鈴鐺那則**同步消失**
- [ ] 取消任務後同樣消失
- [ ] 同一個任務暫停 → 繼續 → 再暫停 → 再補點數，第二次**仍然出現**
      （這條是「不要入庫」那個決定的判準）
- [ ] 通知點得下去，落在 `/user/carbon_chatbot`
- [ ] 摘要端點的 DB 往返次數：**現在是三趟**，量一次並記下數字

> **掃描測試證明不了的那一項**：真的付款時 TxTracker 到底有沒有走到
> `releasePaymentBlockedJobs`。那要在跑得動鏈上流程的環境真的付一次款 ——
> 與通知人工驗收清單的 `p1` 同一種形狀，不要用掃描的綠燈把它打勾。

> **原本列在這裡、現在不成立的兩條**：「只發一則」與「`markResumable` 回 `false`
> 時不發通知」。活算沒有「發」這個動作，那兩條是狀態的性質（見 §5.1 的修正）。

---

## 10. 已決定 / 待決定

**已決定**：範圍含團隊額度與個人點數（20260828）；型別為待辦型、活算；
去處先指向頁面層級。

**待決定**：

| 項目 | 說明 |
|---|---|
| 摘要多的那一趟 DB 要不要優化 | **已經是三趟了**（實作照原設計走）。見 §4；可能的替代是與現有查詢合併，或只在待辦計數非零時才查明細。**先量再決定** |
| 換裝置後要重新上傳檔案，通知要不要先講 | 伺服器不知道使用者的 ref 還在不在，講了可能是多餘的、不講則是「點進去才發現還要做別的事」 |
| 深連結到單一聊天室 | 需要 `/user/carbon_chatbot` 支援 searchParams |

---

## 11. 不要做的事（記下取捨，免得下次重提）

- **不要把 `PAYMENT_REQUIRED` 加進 `scanResumableJobs`** —— 見 §5.2 的兩層理由。
- **不要在翻面前查鏈上餘額** —— 一輪 50 筆 RPC，而且會製造「檢查說夠、扣款說不夠」。
- **不要入庫成事件型** —— 同一個任務會反覆暫停，永久 `dedupeKey` 擋掉第二次。
- **不要讓通知宣稱任務會自己繼續** —— 端到端加密，伺服器沒有金鑰，做不到。

---

## 12. 實作紀錄（2026-08-28）

`npm run test` 全綠。逐檔 tsc 與 ESLint 皆零。

### 12.1 兩處計劃修正

| 原本寫的 | 實際 |
|---|---|
| §5.1「`markResumable` 回 `true` 後發通知」 | **團隊路徑 0 行改動** —— 活算讓翻面本身就是通知 |
| §7.1「`resumable_job_service.test.ts` 會炸」 | **炸的是 `notification_service.test.ts`** —— 相依方向被活算搬走了 |

兩處都源於同一個思考習慣：把活算的來源當成事件型在想。
活算沒有「發射」這個動作，所以「誰要呼叫它」是個假問題；
真正該問的是**「誰 import 了新東西」**。

### 12.2 三個實作時的決定

**`updatedAt` 而不是 `createdAt`。** 任務的 `createdAt` 是開始匯入的時間，
在暫停與翻面之間不會變。用它的話，同一份匯入暫停 → 補點數 → 再暫停 → 再補點數，
兩次「可以繼續了」會算出同一個 `arrivalKey`，第二次**搖而不響、且此後永久靜音**
（`ChimeGate` 的 `seenKeys` 沒有 reset）—— 正是 D17 的形狀。

這一條單獨寫了一個測試，因為改成 `createdAt` 之後其他測試照樣綠。

**圖示用 `play`，不沿用 `check`。** `check` 說的是「做完了」，這一則說的是
「可以開始了」。16px 下如果長得一樣，使用者會以為匯入已經完成而不去按。
為此在 `ICON_BY_KEY` 與樣式型別各加了一格。

**TxTracker 的接線包在 `try/catch` 裡。** 訂單已經標成 `PAID` 了，
這一步失敗不該讓整輪追蹤中止 —— 那會讓後面的訂單也停在 `PENDING`。
下一次付款、或使用者自己回到頁面，仍然救得回來。

### 12.3 沒做的三件事（§10 待決定）

- 摘要的第三趟 DB：**沒有優化，先照原設計走**，等量過再決定
- 換裝置後要重新上傳檔案：文案沒有先講
- 深連結到單一聊天室：`NOTIFICATION_LINK_PATH` 仍是頁面層級。
  payload 已經帶 `resourceKey`，那一頁支援 searchParams 之後改一格就會生效
