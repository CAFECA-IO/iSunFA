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

| 元件                                                                                  | 狀態              |
| ------------------------------------------------------------------------------------- | ----------------- |
| `ResumableJob` 資料表（`@@unique([resourceKey, type])`、`@@index([userId, status])`） | ✅                |
| `PAUSED` / `RESUMABLE` 兩個狀態                                                       | ✅                |
| `scanResumableJobs`（每 5 分鐘、一輪 50 筆，已掛在 `run_worker.ts`）                  | ✅ 團隊額度那半邊 |
| `markResumable()`（條件更新，只有真的翻面才回 `true`）                                | ✅                |
| 個人點數的翻面                                                                        | ❌ 掃描明確跳過   |
| **告訴使用者**                                                                        | ❌                |

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

1. 回到那個聊天室 —— 20260828 起由通知的深連結代勞（§6）
2. 按「**接著匯入**」（畫面上的字就是這四個；通知不再指名它，理由見 §13.5）
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

|                              | 觸發                 | 落點                                                  | 現況               |
| ---------------------------- | -------------------- | ----------------------------------------------------- | ------------------ |
| 團隊額度 `CREDITS_EXHAUSTED` | 每 5 分鐘輪詢        | `scanResumableJobs` 裡 `markResumable` 回 `true` 之後 | 機制已有，只缺通知 |
| 個人點數 `PAYMENT_REQUIRED`  | `TxTracker` 確認付款 | **新增**：訂單轉 `PAID` 後查該 user 的暫停任務        | 機制要新做         |

### 5.1 團隊額度：**不用改任何程式碼**

> **20260828 再補。** 這一節（與 §2）把「等重置／加購點數／升級方案」並列成
> 三條出路，而**加購那條在今天是不存在的**。實測就是在這裡白等了一輪。
> 理由與落點見 §13.2。

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

**`/user/carbon_chatbot?session=<id>&openImport=1`**（20260828 起）。

> **這一節原本寫的是頁面層級的 `/user/carbon_chatbot`**，理由是那一頁
> 當時不吃任何 searchParams，而深連結被判斷成「不夠精準，另開一項」。
>
> 實測推翻了那個判斷：落地之後使用者要自己走四層才找得到能按的東西
> （見 §13.5），而通知說的那顆按鈕根本不存在。深連結因此不是精準度的優化，
> 是**這則通知能不能兌現的前提**。已於 20260828 補上。

當時做對的一件事是**payload 帶著 `resourceKey`**：深連結做起來時，
`sessionId` 直接從它切得出來，不必回頭改資料（與 D43 的 `:token` 同一個手法）。

與 D43 的情況仍然要分清楚：D43 的錯是把人帶到一個**結構上放不下那筆紀錄**的
頁面；這裡的頁面一直都是對的，只是把「是哪一份」丟回給使用者判斷。

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

| 檔案                                                      | 改什麼                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/constants/notification.ts`                           | 新增 `JOB_RESUMABLE` 型別；加進 `TODO_NOTIFICATION_TYPES`；`NOTIFICATION_TYPE_STYLE` 與 `NOTIFICATION_LINK_PATH` 各補一格 |
| `src/lib/notification_message.ts`                         | 文案分支（帶 `completed/total` 進度）                                                                                     |
| `src/components/notification/notification_row.tsx`        | `ICON_BY_KEY` 加 `play`（見 §12 的理由）                                                                                  |
| `src/constants/resumable_job.ts`                          | 新增 `JOB_RESUMABLE_NOTICE_LIMIT`                                                                                         |
| `src/repositories/resumable_job.repo.ts`                  | 新增「某使用者的 `RESUMABLE` 任務」（活算來源）與「某使用者 `PAYMENT_REQUIRED` 的 `PAUSED` 任務」                         |
| `src/services/notification.service.ts`                    | `listNotifications` / `getNotificationSummary` 加第三個活算來源                                                           |
| `src/services/resumable_job.service.ts`                   | **新增** `releasePaymentBlockedJobs()` —— 個人付款後的翻面與通知，可測                                                    |
| `src/services/order.tracker.service.ts`                   | 兩處標 `PAID` 之後各呼叫一次上面那支（只有一行接線）                                                                      |
| `src/__tests__/notification_service.test.ts`              | **先加** `jest.mock("@/repositories/resumable_job.repo")`（見 §7.1），再加四條活算來源的測試                              |
| `src/__tests__/resumable_job_service.test.ts`             | repo mock 補 `listPaymentBlockedByUser`；`releasePaymentBlockedJobs` 三條測試                                             |
| `src/__tests__/notification_bell_wiring.test.ts`          | 掃描：TxTracker 標 PAID 之後真的呼叫了 `releasePaymentBlockedJobs`                                                        |
| `src/i18n/locales/{en,ja,ko,zh_cn,zh_tw}/notification.ts` | 五語系文案                                                                                                                |

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

- [x] 團隊額度**視窗重置或方案升級**後，下一輪掃描（最多 5 分鐘）鈴鐺出現那一則
      —— 20260828 實測通過（調 `subscription_plan_quota` → `released:1` → 鈴鐺待辦節出現）
      —— **不是「加購點數後」**，加購改變不了判準裡的任何一個數（§13.2）
- [ ] 個人付款確認後**立即**出現，不等 5 分鐘
- [ ] 與那個任務無關的加購點數也會觸發重查
- [ ] 使用者按「繼續」後（`status → RUNNING`），鈴鐺那則**同步消失**
- [ ] 取消任務後同樣消失
- [ ] 同一個任務暫停 → 繼續 → 再暫停 → 再補點數，第二次**仍然出現**
      （這條是「不要入庫」那個決定的判準）
- [ ] 通知點得下去，落在**那一個會話**且待匯入的卡是開著的
      —— 深連結已於 20260828 實作（`resumable_job_resume_landing_and_copy.md`），待實機驗
- [ ] 摘要端點的 DB 往返次數：**現在是三趟**，量一次並記下數字

> **掃描測試證明不了的那一項**：真的付款時 TxTracker 到底有沒有走到
> `releasePaymentBlockedJobs`。那要在跑得動鏈上流程的環境真的付一次款 ——
> 與通知人工驗收清單的 `p1` 同一種形狀，不要用掃描的綠燈把它打勾。

> **原本列在這裡、現在不成立的兩條**：「只發一則」與「`markResumable` 回 `false`
> 時不發通知」。活算沒有「發」這個動作，那兩條是狀態的性質（見 §5.1 的修正）。

---

## 10. 已決定 / 待決定

**已決定**：範圍含團隊額度與個人點數（20260828）；型別為待辦型、活算；
去處**深連結到單一會話**（20260828 實作；原本是頁面層級，理由見 §13.5）。

**待決定**：

| 項目                                   | 說明                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 摘要多的那一趟 DB 要不要優化           | **已經是三趟了**（實作照原設計走）。見 §4；可能的替代是與現有查詢合併，或只在待辦計數非零時才查明細。**先量再決定** |
| 換裝置後要重新上傳檔案，通知要不要先講 | 伺服器不知道使用者的 ref 還在不在，講了可能是多餘的、不講則是「點進去才發現還要做別的事」                           |

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

| 原本寫的                                     | 實際                                                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| §5.1「`markResumable` 回 `true` 後發通知」   | **團隊路徑 0 行改動** —— 活算讓翻面本身就是通知                   |
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

### 12.3 §10 的三件待決定，這一輪都沒做

- 摘要的第三趟 DB：**沒有優化，先照原設計走**，等量過再決定
- 換裝置後要重新上傳檔案：文案沒有先講
- 深連結到單一聊天室：**後來做了**（20260828，見 §13.5）。
  當時把它當成可有可無的優化，實測之後才知道它是**這則通知能不能兌現的前提**

---

## 13. 實測發現（20260828）

實測沒有走完 —— 卡在「補了點數卻沒有通知」。追下去發現接線是好的，
壞的是這份計劃書對「點數補回」的理解。三件事，各有落點。

### 13.1 那一次 `stillShort` 的追查

測試帳號的書籤：免費方案、全隊共用池、`0/14`、`CREDITS_EXHAUSTED`、
`next_step_cost` 為 null（因此 `cost` 取 fallback 的 1）。掃描摘要是

```
resumable job scan finished {"scanned":1,"released":0,"stillShort":1,"unknown":0}
```

`stillShort` 這一格本身就排掉了一半的可能：能走到它，代表那一列存在、
`pauseReason` 是 `CREDITS_EXHAUSTED`、`teamId` 不是 null、`type` 查得到扣點模式 ——
它一路走到 `canResumeNow()` 才被判否。實際的數字是：

|            | limit | used | remaining |
| ---------- | ----- | ---- | --------- |
| 5 小時視窗 | 10    | 47   | 0         |
| 每週視窗   | 40    | 47   | 0         |

`resolveQuotaAvailable` 取的是兩者的**較小值**，所以 5 小時視窗重置之後
`quotaAvailable` 仍然是 0 —— 這一列要等三天後的週視窗重置才會自己翻面。

追查時我一度只看 5 小時那一格就要下結論，那會給出一個錯的等待時間。
**「等重置」不是一個時刻，是兩個視窗中較晚的那一個**，而 402 的 payload
早就把兩個都算好了（`quota5h.resetAt` / `quotaWeek.resetAt`，見 §13.3）。

（`used 47 > limit 40` 不是資料錯亂：預扣封頂之後實耗大於預扣，差額按設計
記回額度，額度是軟上限。免費方案又是全隊共用一份，那 47 點是整隊所有功能的
用量，不只這次匯入 —— 這一列的 `steps` 是 `0/14`，它一步都還沒跑。）

### 13.2 缺陷 A：「加購點數」是一條不存在的出路

§2 與 §5.1 把「等重置／加購點數／升級方案」並列，說三條最後都收斂成
「現在的餘額夠不夠做下一步」。前後兩條成立，中間那條不成立：

- `canResumeNow()` 的 `chainCredits` 是**字面量 0**；
- 加購的點數在 ADR 015 之後鑄到成員錢包，正是 `isChainCreditSpendable()`
  回 false 時扣不動、一律讀成 0 的那一筆；
- 加購也不會改變 `per5h` / `perWeek` —— 那兩個值只來自方案。

也就是說，加購改變不了判準裡的**任何一個數**。

**不要單獨修 `canResumeNow`。** 讓它把鏈上餘額算進去，任務會翻成「可以繼續」，
而使用者按下去撞的是 `spendCredits` 的同一道 402 —— 那正是兩邊共用判準
要防的「說可以繼續、按下去又撞牆」。兩邊必須同時改，而那件事的前提是
第二層扣款恢復（走 `ensurePersonalCreditCharge()` 的持有人簽章路徑，
不是已停用的平台側 burn）。

落點分兩層：

| 時機                     | 做什麼                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 現在（**通知文案已做**） | 通知的 `job_resumable` 已改成「額度已恢復」，並由 i18n 測試釘住中文兩語系不得出現「點數」（20260828）                                            |
| 現在（**尚未做**）       | `carbon_chatbot.import_paused_chapters` 那句「補上點數後可以從這裡接著匯入」（五語系，見 §13.3）。今天的出路只有「等視窗重置」與「升級方案」兩條 |
| 第二層恢復時             | `canResumeNow` 的 `chainCredits: BigInt(0)` 與 `spendCredits` 的 `chainCredits` **同一次**改                                                     |

**一個現在就能釘的釘子（尚未做）。** 兩邊今天一致，是因為**都是 0**，不是因為有什麼
機制保證它們一致 —— 那是巧合，而巧合不會在它失效的那天發出聲音。
`spend_second_layer_inert.test.ts` 的職責正好是「旗標翻回 true 時，
以下每一條都要紅」，把這條加進那一檔：

> 旗標為 true 時，`resumable_job.service.ts` 不得再把字面量 `BigInt(0)`
> 傳給 `canAffordSpend` 的 `chainCredits`。

成本是一個 `it`，換掉的是「第二層恢復了、掃描卻還當它不存在」這種無聲的分岔。

### 13.3 缺陷 B：暫停畫面沒有說要等到哪一天

伺服器那邊事實是齊的。`buildQuotaExceededPayload` 回的 402 payload 已經帶著：

- `exceeded`：哪一個視窗先卡；
- `quota5h` / `quotaWeek`：各自的 `limit` / `used` / `resetAt`；
- `exceedsWindowLimit`：單筆金額就超過視窗上限時，**等重置永遠不會好**；
- `allocationBalance`：第二層停用後誠實讀成 0。

丟掉它的是前端：`resolveCreditPauseReason()` 只取 `errorCode`，其餘整包不看；
`import_preview.tsx` 連 `pauseReason` 那個 prop 都宣告了卻沒讀。

具體的落點是一個字串 —— 匯入預覽卡（`import_preview.tsx`，`pausedChapters`
非空時的那塊藍色提示）用的 `carbon_chatbot.import_paused_chapters`：

> 點數已用完，以下章節還沒開始解析：{{chapters}}。**補上點數後**可以從這裡
> 接著匯入，已完成的部分不會重跑。

這一句同時踩到本節與 §13.2 兩個缺陷：它沒說重置時間，而且「補上點數後」
正是那條不存在的出路 —— 使用者照著做（我們實測時就是照著做的）會完全沒有反應。
五個語系都要一起改。

於是三種處置完全不同的情況，使用者看到的是同一句「點數不足」：

| 事實                 | 該說的話                                                   |
| -------------------- | ---------------------------------------------------------- |
| 5 小時視窗卡住       | 「今天的額度用完了，◯◯:◯◯ 重置」                           |
| 週視窗卡住           | 「本週額度已用完，X 月 X 日重置」                          |
| `exceedsWindowLimit` | 「這份檔案單次就超過方案上限，等重置不會有幫助」→ 只給升級 |

落點在碳盤查匯入畫面，不在通知模組，建議另開 issue。但它與本文同源：
**暫停不是失敗，而不是失敗的東西必須說得出怎麼繼續。**

### 13.4 附帶發現

- `subscriptionPlanQuotaRepo.upsertQuota()` **沒有任何呼叫端**。註解寫「後台調整
  額度用」，但 `src/app` 與 `src/components` 都搜不到 —— 今天要調方案額度只能
  直接下 SQL。是要補後台介面還是刪掉這支，需要產品決定。
- 實測環境要製造「額度回來了」，最實際的做法是把 `subscription_plan_quota`
  的那一列調大（等同 `upsertQuota`），而不是等視窗重置或加購。
  走的仍然是完整的真實路徑：掃描 → `canResumeNow` → `markResumable` → 活算通知。

### 13.5 缺陷 C：通知落地之後，那顆按鈕找不到

通知說「回到智能溫盤按『繼續匯入』」。實測的結果是：**那五個字在整個 UI 裡
不存在**，而且從落地到能按下去，使用者要自己走四層：

| 層  | 使用者要做的事                         | 畫面上的字       |
| --- | -------------------------------------- | ---------------- |
| 1   | 從側欄的數個盤查會話裡挑出正確的那一個 | （沒有任何提示） |
| 2   | 切到聊天視圖（不是報告編輯／PDF 預覽） | —                |
| 3   | 輸入列上方的橘色條                     | 「檢視並匯入」   |
| 4   | 預覽卡裡的藍色區塊                     | 「接著匯入」     |

三個名字，沒有一個是通知說的那個。

第 1 層才是根因：`NOTIFICATION_LINK_PATH[JOB_RESUMABLE]` 是頁面層級的
`/user/carbon_chatbot`，而 payload **已經帶著 `resourceKey`** ——
它就是 `carbon-chat-{address}-{sessionId}`（`buildCarbonChatChannel`），
位址是固定長度的 hex，`sessionId` 直接切得出來。

也就是說 §12.3 記為「待決定」的深連結，不是優化，而是**這則通知能不能
兌現的前提**。一則說「回去按 X」的通知，如果落地的地方沒有 X，它就不是通知，
是一道謎題。

**已於 20260828 修掉**（三條落點全部實作，`npm run test` 全綠）：
`/user/carbon_chatbot` 支援 `?session=` 與 `?openImport=1`、
`NOTIFICATION_LINK_PATH` 改成帶 token 的樣板、文案不再指名任何按鈕。
過程中發現型別層的去處根本不跑 token 代入（會靜靜地送出一條
`?session=:sessionId`，正是 D43 的形狀），那一道是連帶修的。

完整的取捨與實作紀錄見 `resumable_job_resume_landing_and_copy.md`。
