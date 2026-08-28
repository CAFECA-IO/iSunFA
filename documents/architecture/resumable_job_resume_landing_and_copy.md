# 從「可以繼續了」到真的按下去（修改計劃）

> 前情：`resumable_job_resume_notification.md` §13 的三個實測發現
> （13.2 加購那條出路不存在、13.3 暫停畫面沒說等到哪一天、13.5 落地後找不到按鈕）。

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

改成帶 token 的樣板就好。但今天的程式碼會讓它**靜靜地壞掉**，有兩道：

**（a）型別層的去處根本不跑 token 代入。**
`notificationHrefOf()` 只有在 `ANALYSIS_COMPLETED` / `ANALYSIS_FAILED`
那條分支才呼叫 `resolvePathTokens`，其餘型別**直接回 `fallback` 字串**。
也就是說 `:sessionId` 會原封不動出現在 `href` 裡 ——
使用者點到 `/user/carbon_chatbot?session=:sessionId`，一條合法但錯的路徑。
**那正是 D43 的症狀**，而 D43 的修法自己會再製造一次。

**（b）`resolvePathTokens` 只認「整段就是 token」。**
它 `template.split("/")` 之後判斷 `segment.startsWith(":")`，
所以 `?session=:sessionId` 裡的 token 不會被代入（那一段以 `carbon_chatbot?` 開頭）。

兩道的修法：

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

落點：在 `@/constants/carbon_chatbot` 加 `parseCarbonChatChannel()`，
與 `buildCarbonChatChannel()` **放在一起**——兩支互為反函數，
放在一起才測得出 round-trip（`parse(build(a, s))` 必須回得來）。
然後由 `notification.service.ts` 組 todo 時把 `sessionId` 放進 payload，
與既有的 `resourceKey`、`completedSteps` 同一層。

切不出來時**不要放**那個鍵——讓 `resolvePathTokens` 依 2.1 的不變式回 `null`，
而不是塞一個空字串進去。

### 2.3 到站要直接把預覽卡打開

深連結只解決了「哪一個會話」。第 2、3、4 層（切到聊天視圖、
輸入列上方的「檢視並匯入」、卡片裡的「接著匯入」）仍然要使用者自己走。

`/user/carbon_chatbot` 支援 `?openImport=1`：載入該會話的 `pendingImport`
之後直接 `openImportPreview()`。那份紀錄本來就會從伺服器還原
（`fetchPendingImportRecord`，端到端加密、逐 channel），所以這一步不需要新的資料。

**這一步做完，通知文案才有資格不提按鈕**——見決定二。

---

## 3. 決定二：通知文案

現在：

```
點數已補回，「{{completed}}/{{total}}」的匯入可以繼續了 —— 回到智能溫盤按「繼續匯入」
```

三個問題，一句話裡：引號裡塞的是分數不是名稱（讀起來像有個東西叫「0/14」）、
「點數已補回」是假的、指名的按鈕不存在。

改後（五語系一起）：

| 情況              | 文案                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `completed > 0`   | 額度已恢復，「{{name}}」還有 {{remaining}} 章沒匯入，可以接著做了 |
| `completed === 0` | 額度已恢復，「{{name}}」的匯入可以開始了                          |

三個決定：

- **「額度已恢復」而不是「點數已補回」。** 觸發它的是視窗重置或方案變更，
  不是加購（§13.2）。文案指向一條不存在的出路，比不說更糟。
- **不指名按鈕。** 深連結（決定一）落地就是能動手的地方，
  通知不需要教路。指名按鈕是把 UI 的字串複製到另一個模組 ——
  改按鈕的人不會知道要回來改通知。
- **帶檔名而不是分數。** `{{name}}` 讓使用者認得出是哪一份；
  剩幾章用 `{{remaining}}`（`total - completed`）比 `0/14` 直觀
  ——「還有 14 章」是決定，「0/14」是狀態。
  檔名要進 payload（書籤目前沒存，見落點表）。

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

| 檔案                                   | 改什麼                                                                                      | 屬於                |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| `src/lib/notification_message.ts`      | `notificationHrefOf` 的 fallback 也走 `resolvePathTokens`；`resolvePathTokens` 認段內 token | 決定一 (a)(b)       |
| `src/constants/carbon_chatbot.ts`      | 新增 `parseCarbonChatChannel()`                                                             | 決定一 2.2          |
| `src/services/notification.service.ts` | todo 的 payload 加 `sessionId`、`fileName`                                                  | 決定一 2.2 / 決定二 |
| `src/constants/notification.ts`        | `NOTIFICATION_LINK_PATH[JOB_RESUMABLE]` 改成帶 token 的樣板                                 | 決定一              |
| `src/app/user/carbon_chatbot/page.tsx` | 支援 `?session=` 與 `?openImport=1`                                                         | 決定一 2.3          |
| `src/hooks/use_carbon_chat.ts`         | 書籤多存檔名；`resolveCreditPauseReason` 改回傳結構                                         | 決定二 / 三         |
| `src/i18n/locales/*/notification.ts`   | `job_resumable` 拆兩句（五語系）                                                            | 決定二              |
| `src/i18n/locales/*/carbon_chatbot.ts` | `import_paused_chapters` 拆三句（五語系）                                                   | 決定三              |

**書籤要多存檔名**是這份計劃唯一的資料改動（`ResumableJob` 加一欄，或塞進
既有的 JSON 欄位）。沒有它，通知只能說「那份報告」而不是名字，
而使用者側欄裡有數個會話——那正是 §13.5 第 1 層的問題再來一次。

---

## 7. 測試落點

| 要釘的事                                                         | 檔案                                     |
| ---------------------------------------------------------------- | ---------------------------------------- |
| `parse(build(address, sessionId))` round-trip；格式變了要紅      | 新增或併入既有的 carbon channel 測試     |
| 型別層的去處也會代入 token（回歸：`:sessionId` 不得出現在 href） | `notification_message.test.ts`           |
| 段內 token 代得進去；任一代不出來整條回 `null`                   | 同上                                     |
| `JOB_RESUMABLE` 的 payload 有 `sessionId` 與 `fileName`          | `notification_service.test.ts`           |
| 五語系的新鍵齊全、placeholder 一致                               | `notification_i18n_placeholders.test.ts` |
| 暫停文案依 402 的哪一格選句                                      | `carbon_import_pause.test.ts`            |

其中第二條是**回歸測試**：它今天就會紅（因為 fallback 不跑代入），
所以先寫它，再改 `notification_message.ts`。

---

## 8. 驗收判準

- [ ] 通知點下去，落在**正確的那個會話**，且預覽卡是開著的
- [ ] `sessionId` 切不出來時，那一則**不可點**（不是點了去到 `:sessionId`）
- [ ] 文案沒有出現任何按鈕名稱
- [ ] 文案沒有出現「補上點數」「點數已補回」
- [ ] 暫停畫面三種情況各說各的話，`exceedsWindowLimit` 時不提「等重置」
- [ ] 五語系都改到

---

## 9. 不要做的事

- **不要在 `notification_message.ts` 裡解析 `resourceKey`。** 那一層不該懂
  任何一種 `JOB_TYPE` 的資源格式（2.2）。
- **不要只改文案不做深連結。** 短期止血（把「繼續匯入」改成畫面上真的有的字）
  只是把四層路徑寫進一句話，使用者仍然要自己走完 ——
  而那句話會在按鈕改名時再次過期。
- **不要為了分辨兩條路而保留 `pauseReason`。** 見 §5，
  也見 `markResumable` 的註解：`null＝不是暫停狀態`是 schema 的定義。
