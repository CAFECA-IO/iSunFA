# 從「可以繼續了」到真的按下去（修改計劃）

> 前情：`resumable_job_resume_notification.md` §13 的三個實測發現
> （13.2 加購那條出路不存在、13.3 暫停畫面沒說等到哪一天、13.5 落地後找不到按鈕）。
>
> **現況（20260828）**：決定一（深連結）與決定二（通知文案）**已實作**，
> `npm run test` 全綠；決定三（暫停畫面文案）**未做**。實作紀錄在 §10。

---

## 1. 為什麼合成一份

三個症狀看起來分屬三個地方（通知文案、匯入畫面文案、通知連結），但它們是**同一個形狀**：

> 畫面在告訴使用者一件系統做不到、或使用者找不到的事。

- 「補上點數後可以從這裡接著匯入」——**做不到**（加購不進判準，§13.2）
- 「點數已補回」——**沒發生**（翻面的原因是額度視窗重置或方案變更）
- 「回到智能溫盤按『繼續匯入』」——**找不到**（UI 裡沒有這五個字）

分開修會做兩次同樣的判斷（誰有資格說「可以繼續」、那句話要帶哪些事實），
而且兩處文案會再次分岔。合成一份的實質理由只有這個，不是為了整潔。

---

## 2. 決定一：去處要深到會話

### 2.1 先修兩個既有限制，否則這件事做不成

這一節是這份計劃裡**最容易被略過而失敗**的部分。直覺的做法是把

```ts
[NOTIFICATION_TYPE.JOB_RESUMABLE]: "/user/carbon_chatbot",
```

改成帶 token 的樣板就好。但**當時**的程式碼會讓它靜靜地壞掉，有兩道
（兩道都已連帶修掉，實測紀錄見 §10.1）：

**（a）型別層的去處根本不跑 token 代入。**
`notificationHrefOf()` 只有在 `ANALYSIS_COMPLETED` / `ANALYSIS_FAILED`
那條分支才呼叫 `resolvePathTokens`，其餘型別**直接回 `fallback` 字串**。
也就是說 `:sessionId` 會原封不動出現在 `href` 裡 ——
使用者點到 `/user/carbon_chatbot?session=:sessionId`，一條合法但錯的路徑。
**那正是 D43 的症狀**，而 D43 的修法自己會再製造一次。

**（b）`resolvePathTokens` 只認「整段就是 token」。**
它 `template.split("/")` 之後判斷 `segment.startsWith(":")`，
所以 `?session=:sessionId` 裡的 token 不會被代入（那一段以 `carbon_chatbot?` 開頭）。

兩道的修法（已實作）：

|     | 修法                                                                          | 為什麼不選另一種                                                                                        |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| a   | 把 `fallback` 也送進 `resolvePathTokens`，讓所有型別走同一條代入              | 「只有分析類需要 token」是今天的巧合，不是規則；留著它等於埋下第二次 D43                                |
| b   | 逐段改成 regex 取代段內的每個 `:token`，維持「任一個代不出來就整條回 `null`」 | 也可以改用路徑 `/user/carbon_chatbot/:sessionId`，但那要新開一個 route，而會話切換本來就是 query 的語意 |

**不變式不能動**：任一 token 代不出來 → 整條 `null` → 那一則不可點。
去處消失比錯誤去處好，理由見 D43。

### 2.2 `sessionId` 從哪裡來

payload 已經有 `resourceKey`，而它就是 `carbon-chat-{address}-{sessionId}`。
但**不要在 `notification_message.ts` 裡切字串**：那一層不該懂碳盤查的頻道格式，
今天懂了，下一個 `JOB_TYPE` 出現時它就要懂第二種。

做法（已實作）：在 `@/constants/carbon_chatbot` 加 `parseCarbonChatChannel()`，
與 `buildCarbonChatChannel()` **放在一起**——兩支互為反函數，
放在一起才測得出 round-trip（`parse(build(a, s))` 必須回得來）。
然後由 `notification.service.ts` 組 todo 時把 `sessionId` 放進 payload，
與既有的 `resourceKey`、`completedSteps` 同一層。

切不出來時**不要放**那個鍵——讓 `resolvePathTokens` 依 2.1 的不變式回 `null`，
而不是塞一個空字串進去。

### 2.3 到站要直接把預覽卡打開

深連結只解決了「哪一個會話」。第 2、3、4 層（切到聊天視圖、
輸入列上方的「檢視並匯入」、卡片裡的「接著匯入」）仍然要使用者自己走。

`/user/carbon_chatbot` 支援 `?openImport=1`（已實作）：載入該會話的 `pendingImport`
之後直接 `openImportPreview()`。那份紀錄本來就會從伺服器還原
（`fetchPendingImportRecord`，端到端加密、逐 channel），所以這一步不需要新的資料。

**這一步做完，通知文案才有資格不提按鈕**——見決定二。

---

## 3. 決定二：通知文案

原本：

```
點數已補回，「{{completed}}/{{total}}」的匯入可以繼續了 —— 回到智能溫盤按「繼續匯入」
```

三個問題，一句話裡：引號裡塞的是分數不是名稱（讀起來像有個東西叫「0/14」）、
「點數已補回」是假的、指名的按鈕不存在。

改後（五語系一起）：

| 情況                              | 文案                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `completed > 0`                   | 額度已恢復，還有 {{remaining}} 章沒有匯入，可以接著做了 |
| `completed === 0`／算不出剩餘章數 | 額度已恢復，報告的匯入可以開始了                        |

三個決定：

- **「額度已恢復」而不是「點數已補回」。** 觸發它的是視窗重置或方案變更，
  不是加購（§13.2）。文案指向一條不存在的出路，比不說更糟。
- **不指名按鈕。** 深連結（決定一）落地就是能動手的地方，
  通知不需要教路。指名按鈕是把 UI 的字串複製到另一個模組 ——
  改按鈕的人不會知道要回來改通知。
- **帶剩餘章數而不是分數。**「還有 14 章」是一個**決定**（現在值不值得回去），
  `0/14` 只是一個狀態，而且那對引號本來是留給名稱的位置。
  原本這裡還打算帶檔名，**沒有做** —— 理由見 §10.3。

---

## 4. 決定三：暫停畫面的文案（可平行進行）

`carbon_chatbot.import_paused_chapters` 今天是：

> 點數已用完，以下章節還沒開始解析：{{chapters}}。**補上點數後**可以從這裡接著匯入，已完成的部分不會重跑。

402 的 payload 已經備好全部事實（`exceeded`、兩個視窗的 `limit/used/resetAt`、
`exceedsWindowLimit`），丟掉它的是 `resolveCreditPauseReason()`——它只取 `errorCode`。

改法分兩步：

1. `resolveCreditPauseReason()` 從回傳 `JobPauseReason | null`
   改成回傳 `{ reason, quota } | null`，把 payload 一起帶下來。
   **不要另寫一支解析函式**：同一個錯誤被解析兩次，兩次的判準遲早分岔。
2. 文案依事實三選一：

| 事實                 | 文案                                                       |
| -------------------- | ---------------------------------------------------------- |
| 5 小時視窗卡住       | 今天的額度用完了，{{time}} 重置後可以接著匯入              |
| 週視窗卡住           | 本週的額度用完了，{{date}} 重置後可以接著匯入              |
| `exceedsWindowLimit` | 這份報告單次就超過方案上限，等重置不會有幫助，需要升級方案 |

第三種最重要：它是唯一一種「等下去永遠不會好」的情況，
而現在的文案請使用者去等（`buildQuotaExceededPayload` 的註解早就寫了這件事，
只是畫面沒接）。

---

## 5. 待決定：要不要記「是什麼讓它可以繼續」

文案若要分辨「額度回來了」與「款項已到帳」，讀 `pauseReason` 是行不通的
——`markResumable` 翻面時已經把它清成 `null`（那是刻意的：`null＝不是暫停狀態`）。
要分辨就得另存一個 `resumedBy`。

**建議先不做。** 兩條路的使用者接下來要做的事完全一樣（回去按接著匯入），
而通知的職責是「把人放在能動手的地方」，不是報告原因。
等到兩條路真的需要不同的下一步時再加，那時 `resumedBy` 才有承載的內容。

---

## 6. 落點清單

| 檔案                                   | 改什麼                                                                                      | 狀態               |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| `src/lib/notification_message.ts`      | `notificationHrefOf` 的 fallback 也走 `resolvePathTokens`；`resolvePathTokens` 認段內 token | 已做               |
| `src/constants/carbon_chatbot.ts`      | 新增 `parseCarbonChatChannel()`                                                             | 已做               |
| `src/services/notification.service.ts` | todo 的 payload 加 `sessionId`                                                              | 已做               |
| `src/constants/notification.ts`        | `NOTIFICATION_LINK_PATH[JOB_RESUMABLE]` 改成帶 token 的樣板                                 | 已做               |
| `src/app/user/carbon_chatbot/page.tsx` | 支援 `?session=` 與 `?openImport=1`                                                         | 已做               |
| `src/i18n/locales/*/notification.ts`   | `job_resumable` 拆兩句（五語系）                                                            | 已做               |
| `src/hooks/use_carbon_chat.ts`         | `resolveCreditPauseReason` 改回傳結構（帶下 402 payload）                                   | **未做**（決定三） |
| `src/i18n/locales/*/carbon_chatbot.ts` | `import_paused_chapters` 拆三句（五語系）                                                   | **未做**（決定三） |
| `prisma/schema.prisma` + 書籤          | 存一個給人看的標籤（原本寫的是「檔名」）                                                    | **未做**，見 §10.3 |

---

## 7. 測試落點

| 要釘的事                                                         | 檔案                                     | 狀態               |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------------ |
| `parse(build(address, sessionId))` round-trip；格式變了要紅      | `carbon_chat_channel.test.ts`（新增）    | 已做               |
| 型別層的去處也會代入 token（回歸：`:sessionId` 不得出現在 href） | `notification_message.test.ts`           | 已做               |
| 段內 token 代得進去；任一代不出來整條回 `null`                   | 同上                                     | 已做               |
| `JOB_RESUMABLE` 的 payload 有 `sessionId`，且深連結組得出來      | `notification_service.test.ts`           | 已做               |
| 五語系的新鍵齊全、placeholder 一致                               | `notification_i18n_placeholders.test.ts` | 已做               |
| 文案不得再提「點數」（中文兩語系）                               | 同上                                     | 已做               |
| 暫停文案依 402 的哪一格選句                                      | `carbon_import_pause.test.ts`            | **未做**（決定三） |

第二條是**回歸測試，先寫先跑**：改之前它是紅的（fallback 不跑代入），
那一步確認了 §2.1 (a) 是真的，不是讀錯。

---

## 8. 驗收判準

- [ ] 通知點下去，落在**正確的那個會話**，且預覽卡是開著的
      —— 程式碼完成，**待實機驗**（唯一還要用眼睛確認的一條）
- [x] `sessionId` 切不出來時，那一則**不可點**（不是點了去到 `:sessionId`）
      —— service 與 message 各一條測試
- [x] 文案沒有出現任何按鈕名稱
- [x] 文案沒有出現「補上點數」「點數已補回」—— 並由 i18n 測試釘住
- [ ] 暫停畫面三種情況各說各的話，`exceedsWindowLimit` 時不提「等重置」
      —— **未做**（決定三）
- [x] 五語系都改到 —— 鍵集合與插值由既有測試比對

---

## 9. 不要做的事

- **不要在 `notification_message.ts` 裡解析 `resourceKey`。** 那一層不該懂
  任何一種 `JOB_TYPE` 的資源格式（2.2）。
- **不要只改文案不做深連結。** 短期止血（把「繼續匯入」改成畫面上真的有的字）
  只是把四層路徑寫進一句話，使用者仍然要自己走完 ——
  而那句話會在按鈕改名時再次過期。
- **不要為了分辨兩條路而保留 `pauseReason`。** 見 §5，
  也見 `markResumable` 的註解：`null＝不是暫停狀態`是 schema 的定義。

---

## 10. 實作紀錄（20260828）

**決定一（深連結）與決定二（通知文案）已實作；決定三（暫停畫面文案）尚未動。**
`npm run test` 全綠；逐檔 prettier、ESLint、tsc 皆零（唯一的 tsc 錯誤是
`map_viewer.tsx` 對 `maplibre-gl.css` 的 side-effect import —— 既有問題，
與這批無關，`next build` 處理得了而裸 tsc 不行）。

### 10.1 §2.1 的兩道確認為真

回歸測試先寫、先跑，確認不是我讀錯：改之前 `notificationHrefOf` 對
`JOB_RESUMABLE` 回的是 `"/user/carbon_chatbot"` —— 帶不帶 `sessionId` 都一樣，
也就是說 token 完全沒有被代入。修完同一組輸入回
`"/user/carbon_chatbot?session=sess-1&openImport=1"` 與 `null`。

`resolvePathTokens` 從「逐段」改成「逐 token」之後，既有的五種去處
（憑證帶／不帶 `accountBookId`、AI 諮詢的 encode、邀請、分析類退回）行為不變。

### 10.2 三個實作時的決定

**`ImportDeepLink` 是一個只回 `null` 的子元件。** `useSearchParams()` 需要
Suspense 邊界，而頁面元件包不住自己（同 `(landing)/analysis/page.tsx` 的做法）。

**用完就把 query 清掉，並用 ref 記「這組參數處理過了」。** 這是一次*指令*
不是狀態：留著的話重新整理會再開一次卡，而任何依 `searchParams` 重跑的 effect
會在使用者手動切會話時把他拉回來。`router.replace` 是非同步的，
所以光靠清 query 不夠，還要 ref。

**文案分兩句而不是一句帶分數。** `0/14` 那一格是主因（一步都沒跑，
「繼續」會讓人以為做過一半）。另外 `remaining <= 0` 也退回「還沒開始」那句 ——
「還有 0 章沒有匯入，可以接著做了」是一句自相矛盾的話。

### 10.3 沒做的一件事：書籤不存檔名

§3 原本打算讓文案帶檔名，**沒有做**，所以它說的是
「還有 11 章沒有匯入」而不是「『某某報告』還有 11 章」。

理由是它需要一個 schema 欄位（`ResumableJob` 沒有可放的地方），
而深連結已經回答了「是哪一份」這個問題 —— 落地就在那個會話裡。
檔名剩下的價值是「同時有兩份暫停的匯入時，通知列上分得出來」，
那是一個還沒發生的情境。

**要做的時候**：加一個 nullable 的 `resource_label`（不要叫 `file_name`——
下一種 `JOB_TYPE` 的標籤未必是檔案），由 `saveImportJobBookmark` 帶上來，
`listNotifications` 放進 payload，文案再加一格插值。

### 10.5 實機第一次就沒過：清單「非空」不等於「載好了」

實測結果：點通知之後人落在**預設會話**上，待匯入的卡沒有打開。

根因在 `ImportDeepLink` 的一行守衛。原本寫的是

```ts
if (sessionIds.length === 0) return; // 清單還沒載進來，等下一輪
```

而會話清單是**非同步**問伺服器的（`GET /api/v1/chat/carbon/sessions`）。
在它回來之前 `sessionsData` 裡已經有預設會話 —— **非空，但不完整**。
於是這個守衛放行，下一行的 `sessionIds.includes(sessionParam)` 得到 false，
判定「查無此會話」而放棄，順手把 query 清掉。使用者看到的就是
「什麼也沒發生，而且網址裡的參數不見了」。

**這是一個典型的「兩種狀態被壓成同一個觀察值」**：
「還沒問到」與「問過了，沒有」在 `sessionIds` 這個陣列上長得一樣
（都是「裡面沒有那個 id」），而它們的正確處置相反 —— 一個要等，一個要放棄。

修法是讓那兩件事分開：`use_carbon_chat` 多回一個 `sessionsIndexSettled`，
在那支 request 的 `.finally()` 設成 true（成功或失敗都算問完 ——
失敗時清單不會再補了，繼續等就變成永遠不動作）。深連結改成等這個旗標。

**不要用 `sessionsIndexLoadedRef`**：它是「請求發過了」的去重旗標，
在 `request()` 之前就設成 true，拿它當「載好了」會犯一模一樣的錯。

順帶記下另一個實機才看得到的細節：E2EE 的會話落地時是**鎖著的**，
`pendingImport` 要等使用者解鎖之後才還原得出來。深連結的 effect 本來就會等
（`hasPendingImport` 在相依裡），所以解鎖後才開卡是預期行為 ——
前提是它沒有在那之前就放棄。
