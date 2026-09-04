# 薪資單電子郵件寄送計畫（限帳本版）

- 撰寫：20260902 - Julian
- 相關：`salary_record_module_plan.md`、`salary_employee_profile_plan.md`、ADR 017（系統設定）、ADR 018（HR PII 分級）
- 前置：`feature/salary_calculator_employee` 需先 merge —— 收件信箱來自本次落地的 `SalaryCalculatorEmployee.email`

---

## 0. 既有基礎設施（已逐一確認，不是假設）

| 東西 | 位置 | 狀態 |
|---|---|---|
| `nodemailer` | `package.json` `^9.0.5` + `@types/nodemailer` | ✅ 已安裝 |
| 寄信入口 | `src/services/mail.service.ts`（96 行） | ✅ `sendMail({to, subject, html, text})` |
| SMTP 設定 | DB 系統設定（ADR 017）：`SMTP_HOST/PORT/USER/PASSWORD/FROM` | ✅ 後台可調、不需重啟 |
| 未設定的處置 | `MailNotConfiguredError`，**明確失敗不靜靜略過** | ✅ 現成的正確行為 |
| 既有消費者 | **只有一個**：`team_invitation.service.ts` | ⚠️ 見 §3.4 |
| **附件支援** | `IMailMessage` 只有 `to/subject/html/text` | ❌ **要擴充** |
| 伺服器端 PDF | `pdf_browser.ts`（共用 Chrome 實例）＋ `pdf_font_guard.ts`（CJK fail fast） | ✅ 兩個既有使用者（碳盤查、物流報告） |
| 寄送紀錄 model | 無 | ❌ **要新增** |
| 郵件錯誤碼 | `TW000018` 未設定 / `TW000019` 邀請信寄送失敗 | ✅ 可比照 |
| 限流前例 | `TEAM_INVITE_SEND`（10/分、100/日） | ✅ 可比照 |
| 現有寄送 UI | `sending_pay_slip_modal.tsx` 是 `console.log` stub | ❌ 要接真 API |
| 「已寄出」分頁 | `my_pay_slip_page_body.tsx` 讀 `dummySentData` | ❌ 要接真資料 |

**關於 `mail.service` 的 log**：它刻意只記收件者與主旨、不記內文（邀請信帶一次性 token）。
本功能會讓這個決定更重要 —— 薪資單的內容絕不能進 log，附件更不能。

---

## 1. 三個已拍板的決策

| # | 問題 | 決定 |
|---|---|---|
| **D1** | 信件形式 | **PDF 附件**。信件本文只寫「您的 X 月薪資單」，金額全在附件裡 |
| **D2** | 寄送紀錄 | **落地一張 `SalaryPaySlipDelivery`**，本次範圍內。同時解決重寄文案、已寄出分頁、稽核軌跡三件事 |
| **D3** | 收件信箱 | **固定用員工檔上的 `email`**，寄送前顯示但不可改；沒填 email 的員工直接擋下並指向員工列表 |

D3 與「到離職日唯讀」是同一個原則：**這個欄位的來源是員工檔，改它要去改員工檔。**
允許當場修改的話，薪資單可以被寄到任意地址，而改掉的那一次不會留在員工檔上 ——
事後查不出當初寄去哪。（`SalaryPaySlipDelivery` 仍會記下實際收件信箱，見 §2。）

---

## 2. 資料模型：`SalaryPaySlipDelivery`

```prisma
/// Info: (20260902 - Julian) 一次薪資單寄送。成功與失敗都留一列。
model SalaryPaySlipDelivery {
  id String @id @default(uuid())

  // Info: (20260902 - Julian) 寄的是哪一筆薪資紀錄
  salaryRecordId String      @map("salary_record_id")
  salaryRecord   SalaryRecord @relation(fields: [salaryRecordId], references: [id])

  // Info: (20260902 - Julian) 租戶 Root Node，與薪資紀錄一致；查詢一律以它為第一個 where
  accountBookId String      @map("account_book_id")
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  /**
   * Info: (20260902 - Julian) **實際**收件信箱的快照，不是 join 員工檔取現值。
   *
   * 員工的 email 之後會被改。查「這封三月的薪資單當初寄到哪」時，
   * join 出來的是今天的信箱 —— 而那正是稽核最需要答案的那一格。
   * 收件人固定取自員工檔（D3），但取到的那個值要留在這裡。
   */
  recipientEmail String @map("recipient_email")

  // Info: (20260902 - Julian) DELIVERY_STATUS 常數：SENT / FAILED
  status String

  /**
   * Info: (20260902 - Julian) 失敗原因的摘要（截斷）。給診斷用，不對外顯示。
   * 不記信件內文與附件 —— 那等於把薪資單留在第二個地方。
   */
  failureReason String? @map("failure_reason")

  // Info: (20260902 - Julian) 誰按下的寄送。這一欄一定要有讀者（見 §6.3）
  sentByUserId String @map("sent_by_user_id")
  sentBy       User   @relation(fields: [sentByUserId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([accountBookId])
  @@index([salaryRecordId])
  @@map("salary_pay_slip_delivery")
}
```

### 2.1 為什麼失敗也留一列

「寄不出去就當作沒發生」會讓兩件事查不出來：**寄了幾次**（重試三次都失敗與從未寄過，
在畫面上長得一樣），以及**薪資資料曾經嘗試離開組織**。團隊邀請那一側的處置相反
（寄失敗就刪掉邀請），但那是因為邀請本身沒有寄出去就沒有意義；薪資紀錄不一樣，
它獨立存在，寄送只是它的一個事件。

### 2.2 為什麼不做狀態機

只有 `SENT` / `FAILED` 兩個終局，沒有 `PENDING`。理由：本次是**同步寄送**
（API 等 SMTP 回來才回應），不進佇列。加一個 `PENDING` 只會製造一種
「永遠停在 PENDING 而沒有人去收」的狀態 —— 那需要一支 reaper，而我們還沒有需要它的量。

若日後改成非同步（見 §10.4），這一欄再擴充。

### 2.3 沒有唯一鍵：重寄是合法的

同一筆薪資紀錄可以有多列 delivery。「已經寄過了，還要再寄嗎」是**前端問一句**，
不是資料庫約束 —— 補寄、改了信箱再寄、對方說沒收到，都是真實情境。

---

## 3. 後端流程

### 3.1 端點

```
POST /api/v1/user/account_book/[account_book_id]/salary_calculator/record/[record_id]/deliver
```

> **實作修正（20260904）**：實際落地的是**三支**，不是一支。
> 計畫寫這一段時漏掉了「§6.1 要接真資料的那兩個畫面得先讀得到資料」——
> 「已寄出」分頁與預覽彈窗都需要讀取端點，而寫的時候才發現沒有。
>
> ```
> POST   .../record/[record_id]/deliver     寄出（WRITE + SALARY_MAIL_SEND）
> GET    .../record/[record_id]/deliver     這一筆的寄送歷史（READ + READ）
> GET    .../salary_calculator/delivery     整本帳的寄送歷史（READ + READ）
> ```
>
> 兩支 GET 是 `READ` 而不是 `WRITE`：寄送把資料送出組織邊界，**看紀錄不會**。
> 整本帳那一支的 `limit` 由伺服器夾上限（預設 50、最多 200）。

掛在薪資紀錄底下而不是另開一個 `/pay_slip/send`：寄送的對象**就是**那一筆紀錄，
`record_id` 是它唯一需要的輸入。Body 為空 —— 收件人、金額、期間全部由伺服器從那一筆推導，
沒有任何一項可以由前端指定（D3 的落地形式）。

### 3.2 授權：`SalaryAccess.WRITE`

歸寫入而不是讀取，即使它不改薪資紀錄本身。理由：**它把薪資資料送出組織邊界**，
那件事的份量高於「看得到」。`VIEWER` 讀得到薪資單但寄不出去。

第九支端點，`salary_route_wiring.test.ts` 的 `ENDPOINTS` 表要跟著長一列 ——
那支測試已改成與 API 目錄走訪對拍，忘了登記會直接紅。

### 3.3 限流：新增 `SALARY_MAIL_SEND` 桶

比照 `TEAM_INVITE_SEND`，但更緊：**每分鐘 5、每日 50**。
寄薪資單是人工動作（一次一位員工），正常一個月一輪；
而它每一次都會啟動一次 PDF 列印與一次 SMTP 連線，兩者都比一般寫入昂貴得多。

不與 `SALARY_WRITE` 共用桶：儲存薪資紀錄是高頻的（試算過程中會存好幾次），
共用的話「今天存太多次紀錄」會把寄送額度吃光，而那兩件事的成本結構完全不同。

### 3.4 流程與失敗處置

```
1. 授權（WRITE）+ 限流
2. 讀薪資紀錄（租戶過濾）—— 找不到回 404
3. 讀員工檔取 email —— 空的回 422「這位員工沒有信箱」（不是 500）
4. 產生 PDF（§4）
5. sendMail（§5）
6. 落地 SalaryPaySlipDelivery（SENT）
7. 回傳這一列
```

**第 4、5 步失敗時，落地一列 `FAILED` 再把錯誤丟出去。** 順序不能倒：
先丟錯誤就永遠不會有那一列，而「寄失敗過」正是最需要被記下來的事。

**SMTP 未設定**（`MailNotConfiguredError`）**不落地 `FAILED`**：那是環境問題不是這一次寄送的事實，
記下來只會在管理員設好 SMTP 之後留一堆與員工無關的失敗紀錄。直接回 `TW000018`。

---

## 4. PDF 產生

### 4.1 不能重用現有的 `PaySlip` 元件

`pay_slip.tsx` 是 React + Tailwind（flex、CSS 變數、`text-text-*` token）。
產 PDF 走的是 headless Chrome 的 `page.setContent(html)` —— 那裡沒有 Tailwind 的建置產物，
也沒有 `globals.css` 的 token 定義。**要另寫一份自帶樣式的 HTML**，
比照 `logistics_report_html.ts`（630 行，同樣的處境）。

新增 `src/lib/utils/pay_slip_html.ts`：純函式，收 `ISalaryRecordDetail` 回一段完整 HTML
（含 `<style>`）。純函式意味著它有判準 —— 金額格式、月份、姓名逃逸都測得到，
不必啟動 Chrome。

### 4.2 **必須過 `assertCjkRenderable`**

`pdf_font_guard.ts` 的檔頭記著一次真實事故：伺服器沒有 CJK 字型時，Chrome 會靜默 fallback
到 `.notdef`，產出一份**地點名稱全是空心方框**的報告 —— **而流程回報「成功」**。

薪資單全是中文（姓名、項目名稱），這條路一模一樣，而後果更糟：
使用者收到一份看不懂的薪資單，但系統告訴發薪的人「已寄出」。
**這一步不是可選的**，`salary_pay_slip_pdf.service.ts` 一定要呼叫它。

### 4.3 效能

`pdf_browser.ts` 的共用 Chrome 實例：首次請求付冷啟動（實測 4.6s），之後重用。
一次寄一位員工的節奏下這是可接受的；批次寄送（§10.5）會讓它變成主要成本。

---

## 5. 擴充 `mail.service` 支援附件

```ts
export interface IMailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Info: (20260902 - Julian) 選填。nodemailer 的附件格式，只開放需要的三個欄位。
   *
   * 直接把 nodemailer 的 `Attachment` 型別露出去會讓呼叫端用得到
   * `path`（從磁碟讀檔）與 `href`（從網址抓）—— 兩者都是把「寄什麼」的控制權
   * 交給呼叫端的字串，而這支服務的收件者是由別處決定的。
   */
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}
```

`sendMail` 把它原樣交給 `transporter.sendMail`。**log 那一行不動** ——
它只記收件者與主旨，附件連檔名都不記（檔名會帶員工姓名與月份）。

這是 `mail.service` 自二月以來的第一次擴充，而它目前只有一個消費者。
擴充成選填欄位，團隊邀請那一側完全不受影響。

---

## 6. 前端

### 6.1 寄送入口

| 位置 | 變更 |
|---|---|
| `salary_result_section.tsx` | 「寄出薪資單」按鈕：公開版維持隱藏，帳本版且**已儲存**才啟用（沒有 `record_id` 就無從寄起） |
| `sending_pay_slip_modal.tsx` | 移除 `console.log` stub，接真 API。收件信箱**唯讀顯示**（D3），旁邊標「來自員工資料」 |
| `view_pay_slip_modal.tsx` | 薪資紀錄頁的預覽彈窗加「寄送」；已寄過的顯示 `ResendingPaySlipModal` |
| `resending_pay_slip_modal.tsx` | 「您已經將 X 月的薪資單寄送給 Y」改由最近一筆 delivery 提供，不再是寫死的文案 |
| `my_pay_slip_page_body.tsx` | 「已寄出」分頁改讀真 API，`dummySentData` 移除 |

### 6.2 沒有信箱的員工

`SalaryCalculatorEmployee.email` 可空（那是刻意的：不少帳本不替員工建信箱）。
寄送按鈕在這種情況下**停用並說明原因**，而不是按下去才回 422 ——
比照員工表單分頁那一組「紅點 + 原因」的處置：停用的按鈕一定要說得出為什麼。

### 6.3 `sentByUserId` 要有讀者

母計畫 §13.2 記著一個未解的問題：`SalaryRecord.createdByUserId` **沒有任何讀者**，
稽核價值等於零。這次不要重蹈覆轍 —— 「已寄出」分頁的每一列都顯示寄送者，
API 回應帶 `sentBy.name`。加一個欄位就要同時決定誰看得到它。

---

## 7. 錯誤碼

| 代碼 | 情境 |
|---|---|
| `NF_SALARY_RECORD` | 既有，紀錄不存在或不屬於這本帳 |
| `VA_SALARY_EMPLOYEE_NO_EMAIL`（`VA000084`，新增） | 員工檔沒有信箱。**400 不是 500** —— 這是資料狀態，不是故障 |
| `TW_MAIL_NOT_CONFIGURED` | 既有 `TW000018` |
| `TW_SALARY_PAY_SLIP_MAIL_FAILED`（`TW000034`，新增） | SMTP 或 PDF 失敗 |
| `IS_PDF_FONT_UNAVAILABLE` | 既有（`pdf_font_guard` 丟的），伺服器缺 CJK 字型 |

> **實作修正（20260904）**：上表有三處與計畫原文不同。
>
> 1. **`VA_SALARY_EMPLOYEE_NO_EMAIL` 是 400，不是計畫寫的 422。**
>    本專案的 `ApiCode` 沒有 422 這一格（`HTTP_MAP` 只有
>    400/401/402/403/404/409/429/499/500）。為一支端點在共用的狀態碼表上
>    新增一格，會影響每一支 route 的對應表 —— 而 400 已經滿足這一列真正
>    在意的那句「不是 500」。
> 2. **`TW_SALARY_PAY_SLIP_MAIL_FAILED` 是 `TW000034`。** 順號的 `TW000020`
>    早已被佔用（寫計畫時沒查，現有最大是 `TW000033`）。
> 3. **`IS_PDF_FONT_MISSING` 這個代碼不存在**，正確名稱是
>    `IS_PDF_FONT_UNAVAILABLE`。照計畫的名字寫會編譯失敗 —— 這一項無害，
>    但它提醒：計畫裡的既有代碼名同樣要查過再寫。

---

## 8. 測試計畫

| 測試檔 | 型別 | 釘住什麼 |
|---|---|---|
| `salary_pay_slip_html.test.ts` | 純函式 | HTML 產生：金額千分位、期間、**姓名的 HTML 逃逸**（員工姓名由使用者輸入，直接插進 HTML 等於把信件版面交給對方）、免稅與應稅分項齊全 |
| `salary_delivery_service.test.ts` | service（手寫假 repo） | 沒有 email 回 422 而非 500；PDF 失敗與 SMTP 失敗都**落地 FAILED 再丟錯**；`MailNotConfiguredError` **不**落地；`recipientEmail` 存的是當下的值不是 join |
| `salary_route_wiring.test.ts` | route（擴充） | 第九支端點：401、`SalaryAccess.WRITE`、限流 429 成對。`ENDPOINTS` 表與目錄走訪對拍，忘了登記就紅 |
| `salary_delivery_repo.e2e.test.ts` | e2e（真 DB） | 租戶過濾、失敗列真的落地、`recipientEmail` 快照在員工改信箱之後**不跟著變** |
| `mail_attachments.test.ts` | 純函式 | `sendMail` 把 `attachments` 原樣交給 transporter；**沒有附件時不送出該欄位**（nodemailer 對空陣列與 undefined 的處理不同）；log 不含附件檔名 |
| `salary_pdf_font_guard.test.ts` | 掃描 | `salary_pay_slip_pdf.service.ts` 真的呼叫了 `assertCjkRenderable` —— §4.2 那個缺陷完全靜默，只有掃描守得住 |

**必跑的 mutation**：

1. 拿掉 `assertCjkRenderable` → 掃描測試要紅
2. 失敗時先 throw 再落地（順序倒過來）→ service 測試要紅
3. `recipientEmail` 改成查詢時 join 員工檔 → e2e 要紅
4. 端點的 `SalaryAccess` 改成 `READ` → wiring 要紅

---

## 9. PR 切法

| PR | 內容 | 可獨立 merge |
|---|---|---|
| **A：能力層** | `mail.service` 支援附件 + `pay_slip_html.ts` + `salary_pay_slip_pdf.service.ts` + 其測試 | ✅ 沒有入口，行為零變化 |
| **B：資料層與端點** | `SalaryPaySlipDelivery` schema + repo + service + 第九支端點 + 錯誤碼 + e2e | 依賴 A |
| **C：前端** | 四個彈窗接真 API、已寄出分頁接真資料、`dummySentData` 移除 | 依賴 B |

A 可以先驗證「這台伺服器產得出中文 PDF」——**那是整個功能最大的環境風險**，
而它與資料模型無關，值得先單獨落地確認。

---

## 10. 風險與待決事項

1. **⚠️ 這是薪資資料第一次離開組織邊界，而分級決策仍未拍板。**
   `salary_employee_profile_plan.md` §9.1 與母計畫 §13 都記著同一件事：
   ADR 018 未涵蓋薪資，需要補一段分級決策。
   在此之前，明文 PDF 經由明文 SMTP 寄出是一個**尚未被授權的動作**。
   **建議：本功能的上線與那個決策綁在一起，不要各自為政。**

2. **收件人無法驗證。** `SalaryCalculatorEmployee` 不是 `User`，沒有信箱驗證流程。
   員工檔上的 email 打錯一個字，薪資單就寄給陌生人，而系統回報「已寄出」。
   D3 把「當場改」擋掉了，但擋不掉「員工檔上本來就打錯」。
   可考慮的緩解：寄送前的確認對話框把完整信箱大字顯示（不是一行小字）。

3. **附件不加密。** 密碼保護的 PDF 是一個選項，但「密碼怎麼給員工」會把問題推到另一個管道
   （簡訊？口頭？），而那個管道也要設計。**本次不做，登記在此。**

4. **同步寄送的時間成本。** PDF 冷啟動 4.6s + SMTP 往返，單次請求可能超過 10 秒。
   Next 的 serverless 逾時要確認。若成為問題，`ResumableJob` 已存在但形狀不合
   （它是客戶端驅動的續傳），需要的是一個真正的伺服器端佇列 —— 那是另一個決策。

5. **批次寄送（一次寄整個月的所有員工）不在本次範圍。**
   它會讓 §4.3 的 Chrome 冷啟動與 §3.3 的限流都變成主要限制，
   而且「30 封裡有 3 封失敗」的 UI 與單筆寄送完全不同。

6. **`dummyReceivedData`（已收到分頁）本次不動。** 員工不是本站使用者，
   「收到的薪資單」要成立需要先有員工登入的概念 —— 那是比本功能大得多的題目。
   本次只讓「已寄出」那一半接上真資料，並在文件裡註明另一半仍是假資料。

---

## 11. 實作後的實況（20260904）

> 這一節在三個 PR 都落地之後補寫。上面第 0–10 節保留成**當初的計畫**不改寫
> （§3.1 與 §7 的三處事實錯誤除外，那些照原樣留著會誤導人），
> 這一節記的是**實際長成什麼樣**，以及計畫沒說到的部分。

### 11.1 比計畫多做的

**薪資紀錄列表的寄出狀態欄與列上寄出鈕。** 計畫的 §6.1 只讓寄送入口出現在
計算機頁與預覽彈窗裡，於是「這個月哪些人還沒寄」這個問題只能一筆一筆點開。
列表因此多了一欄狀態（帶日期與當初的收件信箱）與一顆寄出鈕。

支撐它的是 `ISalaryRecordSummary` 上的 `lastSentAt` / `lastSentTo`，
**由伺服器用關聯的 `take: 1` 算**。看似可以拿整本帳的寄送清單在前端 index
起來比對 —— 但那一支有 200 筆上限且是全帳本新的在前，於是一本累積久了的帳，
**舊紀錄會靜靜地顯示成「未寄出」**，使用者看到那個字會再寄一次而對方已經收過。
錯的答案長得跟對的一樣，只能在有完整資料的那一側算。

`salary_record.repo.ts` 的三個 include 站點都要帶上那個關聯。少帶一個的話，
那條路徑回來的 `lastSentAt` 是 `null` —— 而 `null` 的意思是「從未寄出」，
不是「這次沒問」。兩者在型別上長得一模一樣，而畫面會照著它寫字。

### 11.2 計畫沒提、但落地時必須決定的

**`SalaryPaySlipDelivery.salaryRecordId` 用 `onDelete: Cascade`。**
`SalaryRecord` 刻意不做 soft delete，不串接的話，刪一筆已寄過的薪資紀錄會撞上
外鍵而失敗 —— 也就是既有的 DELETE 端點會在「寄過的紀錄」上壞掉。

代價要講明：**刪掉薪資紀錄，它的寄送軌跡會跟著消失**，這與 §2.1
「薪資資料曾經嘗試離開組織要留得下來」是有張力的。本次接受它，理由是薪資紀錄
本來就沒有「刪了還看得到」的設計，而讓寄送紀錄單獨活下來會產生一堆指不到紀錄
的孤兒列。真要保留跨刪除的軌跡，該做的是 `AuditLog`，不是把這張表變成半個歷史表。

### 11.3 測試檔的實際清單

§8 的表少了一支：`salary_delivery_ui_contract.test.ts`（前端契約）。
本專案的測試不 render React，所以前端那一段是「錯誤分類的純函式測試 ＋ 原始碼掃描」。
掃描一律先剝註解再比對 —— 這幾支檔案的註解裡就寫著 `console.log`、`dummySentData`
（說明上一版做錯了什麼），不剝的話那些條會永遠紅然後被人刪掉。

`salary_route_wiring.test.ts` 的 `ENDPOINTS` 表最終是 **11 列**（五讀六寫）。

### 11.4 §10 各項風險的現況

| | 現況 |
|---|---|
| 10.1 薪資資料分級決策 | **仍未拍板。** ADR 018 未涵蓋薪資，而這是薪資資料第一次離開組織邊界。明文 PDF 經明文 SMTP 寄出目前仍是一個尚未被授權的動作 —— 建議上線與那個決策綁在一起 |
| 10.2 收件人無法驗證 | 已做計畫所說的緩解：寄送前的確認彈窗用等寬字、獨立一行放大顯示完整信箱。**擋不掉員工檔上本來就打錯** |
| 10.3 附件不加密 | 本次未做，維持登記 |
| 10.4 同步寄送的時間成本 | 開發機實測可完成（20260904）。**但 serverless 逾時仍未驗證** —— dev server 沒有那個限制，這一項要到部署環境才問得出答案 |
| 10.5 批次寄送 | 不在範圍，未做 |
| 10.6 已收到分頁 | 維持假資料，`pay_slip.ts` 與頁面註解都寫明了，並有測試釘住「它還是假的」 |

### 11.5 端到端實測（20260904）

**在開發機上真的寄出過一封，內容與附件都正確。** 這一段記下它驗到了什麼、
以及**沒有**驗到什麼 —— 兩者一樣重要。

已驗證：`prisma db push` 建表、POST 端點、PDF 產生、SMTP 寄出、
`SalaryPaySlipDelivery` 落地、列表的寄出狀態由「未寄出」變成日期。

**沒有驗到的**：

- **正式機產不產得出中文 PDF。** §9 說「A 可以先驗證這台伺服器產得出中文 PDF，
  那是整個功能最大的環境風險」—— 這次驗的是 **macOS 開發機**，它本來就有中文字型。
  `pdf_font_guard.ts` 檔頭記的那次事故正是發生在**伺服器**上
  （`fc-list :lang=zh` 只有 X11 點陣字）。那個風險原封不動。
- **serverless 逾時。** dev server 沒有那個限制，見 §11.4 的 10.4 那一列。
- **失敗路徑。** 這次是成功路徑。「PDF 失敗 / SMTP 失敗要先落地 FAILED 再丟錯」
  只有單元測試覆蓋，沒有在真環境上發生過。

### 11.6 設定寄信服務的位置（20260904 實際踩過）

**填 `.env` 不一定會生效。** 只要 `/admin/setup` 或 `/admin/settings` 曾經存過
任何一項設定並簽章，設定快照就是 `TRUSTED`，而 `systemSettingService.get()`
在那個狀態下**完全不讀 `process.env`**（那是刻意的：否則一次驗簽失敗就能讓系統
改用 .env 裡輪替前的舊憑證）。

症狀是照 `.env.example` 填完五項，寄送仍回報 `TW000018`「尚未設定寄信服務」。

當時 `/admin/settings` 還會把這種情況顯示成 `source: ENV` ＋「僅存在於環境變數，
儲存後才會受保護」—— 讀起來像「現在能用，之後再搬」，實際上**當下就已經失效**。
那是設定頁自己的缺陷，已於同日修正（`resolveSettingVisibility()` 與
`envValueShadowed`，`system_setting_write_guard.test.ts` 有測試），
`get()` 也會在這個狀態下寫一行 warn。

**已簽章的部署，寄信設定要填在 `/admin/settings` 的 MAIL 群組並用 passkey 簽章。**

### 11.7 仍未完成

- **`salary_delivery_repo.e2e.test.ts` 仍未執行。** 先前這裡寫「開發機沒有資料庫」
  是錯的 —— 資料庫就在 `127.0.0.1:20021`（寄送實測已證明），
  是**協作用的隔離 VM 連不到它**，不是機器上沒有。也就是說這支 e2e
  現在在開發機上跑得起來，而它是唯一驗得到「員工改信箱之後既有的列不跟著變」
  與 `lastSentAt` 真的算得出來的東西，連同 §8 必跑 mutation 的第 3 條
  （`recipientEmail` 改成 join）。**該跑了。**
- 上面 §11.5 列的三項未驗證事項。
- §10.1 的薪資資料分級決策（見 §11.4）。
