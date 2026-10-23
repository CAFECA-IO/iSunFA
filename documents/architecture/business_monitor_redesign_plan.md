# 企業觀測站重新規劃 (Business Monitor Redesign Plan) v1.0

> **Author**: Luphia ｜ **Last Updated**: 2026-10-22
> **對象**：`/business_monitor` 頁面、`business_monitor.service`、企業觀測站背景管線（[07_company_observatory.md](async_workers/07_company_observatory.md)）
> **狀態**：§9 四項決策已定（2026-10-22）；第一期已實作（見 §10）；第二期的首頁與公司頁已實作（見 §11）；第三期已完成（財務數字與碳排見 §12；申報季排程、四季財報、歷史回補見 §13），對話化 AI（第四期）尚未開始。

---

## 1. 目標

讓一般使用者打開一家公司，**三十秒內**看懂三件事：

1. **它是誰**：登記資料、規模、產業、負責人、近期登記異動。
2. **它在做什麼**：主要業務與產品、營收從哪來、財務與碳排的大致樣貌。
3. **我想深問時**：用對話問 AI，回答附上**可點的出處**（哪份報告、第幾頁、官方來源網址），並能直接下載原始報告。

資料面兩條管線：

- **商業司**（`data.gcis.nat.gov.tw`）定期更新公司登記資訊。
- **公開資訊觀測站**（`mops.twse.com.tw`，實際檔案在 `doc.twse.com.tw` 與 `esggenplus.twse.com.tw`）定期下載財務報告書、股東會年報與永續報告書。

---

## 2. 現況盤點與問題

| #   | 問題                                                                                                                                                            | 位置                                                                 | 影響                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| P1  | 頁面以「報告」為單位，卡片欄位是查證機構、確信標準等 ESG 稽核欄位                                                                                               | `business_monitor_page_body.tsx`、`report_item.tsx`                  | 使用者看不到「這家公司在做什麼」，只看到一堆報告 |
| P2  | AI 諮詢與篩選共用同一個輸入框；問一次就把清單換成 AI 結果，沒有對話、不能追問                                                                                   | 同上                                                                 | 無法追問「那 2023 年呢？」                       |
| P3  | AI 回答的「下載報告」產生的是**假的 .txt**；`/download` API 是**模擬進度的 SSE**                                                                                | `ai_response_card.tsx`、`business_monitor.service.ts#downloadReport` | 違反零捏造；使用者以為下載了報告                 |
| P4  | 出處只列報告標題，沒有頁碼與官方網址，但切塊其實存了 `page_number` 與 `source_url`                                                                              | `IAIResponse` 只有 `sourceReportIds`                                 | 無法查核 AI 說法                                 |
| P5  | 結構化資料（溫室氣體範疇一～三、資本額、董監事）先渲染成文字再丟向量檢索；`nomic-embed-text` 對中文弱，「台泥 2024 範疇一」排第 9 名、只取前 3 名，於是答不出來 | `company_observatory.indexer.service.ts`、`LANCE_DB_CHAT_LIMIT = 3`  | 最容易答的數字題反而最常答不出來                 |
| P6  | LLM 直呼 Ollama `gemma4:e4b` 與 Gemini SDK，不經 `ChatService.invokeGuarded`                                                                                    | `business_monitor.service.ts`                                        | 沒有用量計費、沒有 key 缺失的統一處理            |
| P7  | `chat/route.ts` 直接解構 `req.json()`，沒有 Zod Validator；缺問題時回 `IS_DB_FAILED`                                                                            | `src/app/api/v1/business_monitor/chat/route.ts`                      | 違反 CLAUDE.md §2、錯誤碼錯誤                    |
| P8  | 產業選單寫死 5 個、年度寫死 2023–2025                                                                                                                           | `business_monitor_page_body.tsx`                                     | 其他產業與新年度永遠篩不到                       |
| P9  | 商業司 API **需寄送「資料介接使用告知書」並以來源 IP 白名單管控**；現行下載器逐家以統編查詢，未確認 worker 主機 IP 是否已申請                                   | `gcis_registration.downloader.ts`                                    | 部署到新主機時整條來源會靜默失敗                 |
| P10 | MOPS 只抓「第四季合併財報 PDF」兩年份；沒有股東會年報（最能說明「在做什麼」的文件），也沒有可直接計算的財務數字                                                 | `mops_financial_report.downloader.ts`                                | 財務問題只能靠 PDF 切塊碰運氣                    |

已經做對、要保留的部分：`ObservatoryDocument` 狀態機（冪等、死信、逐主機限速）、`data/company_observatory/` 原始檔儲存、`Company` 字典與 `Company.abbreviation` 比對。

---

## 3. 設計原則

1. **以公司為中心，不以報告為中心。** 報告是公司頁裡的一個分頁。
2. **數字走結構化、文字走檢索。** 財務數字與碳排數字落成資料表（`Prisma.Decimal`），由 TypeScript 查詢與計算；只有敘述性內容才走向量檢索（CLAUDE.md §2、§8）。
3. **每一句 AI 說法都要能點回原文。** 引用以「文件 + 頁碼 + 官方網址」呈現；引用不在本輪檢索結果內的，伺服端直接丟棄。
4. **AI 不算數學。** 年增率、比率、加總都由工具函式算好再交給 LLM 敘述。
5. **沒有就說沒有。** 來源沒提供的欄位顯示「來源未揭露」，不補、不推估。

---

## 4. 資訊架構與畫面

### 4.1 `/business_monitor` — 搜尋入口

```
┌──────────────────────────────────────────────────────────┐
│ 企業觀測站                                                │
│ ┌──────────────────────────────────────────────┐          │
│ │ 🔍 輸入公司名稱、簡稱、股票代號或統一編號       │          │
│ └──────────────────────────────────────────────┘          │
│ 或直接問：「台積電去年營收多少？」「台泥的範疇一排放？」   │  ← 送出後開啟對話面板
│                                                          │
│ 依產業瀏覽：[水泥] [食品] [半導體] … （TWSE_INDUSTRY_NAME 全部） │
│ 最近更新：台泥 2025 永續報告書（10/20）、…                 │
│ 資料新鮮度：登記資料 10/22 · 財報 10/21 · 永續 10/19       │
└──────────────────────────────────────────────────────────┘
```

- 單一輸入框：輸入命中公司（代號／全名／簡稱／統編）→ 下拉建議 → 進公司頁；否則視為問題 → 開啟對話。
- 產業清單由 `TWSE_INDUSTRY_NAME` 產生，年度由資料庫實際有的年份產生（修 P8）。

### 4.2 `/business_monitor/company/[stockId]` — 公司頁（新）

```
┌ 1101 臺灣水泥股份有限公司（台泥）  上市 · 水泥工業 ─────────────┐
│ 代表人 ○○○ · 實收資本額 xx,xxx,xxx,xxx 元 · 設立 民國 xx 年     │
│ 來源：商業司公司登記，更新於 2026-10-22  [官方頁面 ↗]            │
├──────────────┬──────────────┬──────────────┬─────────────┤
│ 概覽          │ 財務          │ 永續與碳排     │ 報告庫        │
└──────────────┴──────────────┴──────────────┴─────────────┘
 概覽：
   它在做什麼   主要業務（年報「營運概況」萃取，每點附 [年報 p.45]）
                所營事業項目（商業司登記）
   一眼看數字   營收、稅後淨利、EPS（近 3 年，附年增率）／範疇一+二排放（近 2 年）
   近期異動     登記資料變更：代表人、資本額、地址（與前次快照比對）
 右側（手機為底部抽屜）：「問問這家公司」對話面板，預設範圍＝本公司
```

- **財務**分頁：損益、資產負債關鍵科目的年度表格；比率（毛利率、負債比）由 TS 以 `Prisma.Decimal` 計算，並註明公式。
- **永續與碳排**分頁：範疇一～三、資料邊界、確信機構／標準／意見、減量目標，全部原樣顯示來源值。
- **報告庫**分頁：依年度 × 類型的時間軸，每份顯示狀態（已下載／來源尚未公布／下載失敗）、取得日期、**下載原檔**與**官方來源 ↗**。

### 4.3 對話面板（入口頁與公司頁共用）

```
你：台泥 2024 年範疇一排放量多少？比前一年多還是少？
AI：2024 年範疇一排放量為 X 公噸 CO₂e [1]，2023 年為 Y [2]，
    減少 Z（-n.n%）。※ 差額與比例由系統計算
    ─ 出處 ───────────────────────────────
    [1] 2024 溫室氣體盤查資訊 · 公開資訊觀測站  [來源 ↗]
    [2] 2023 溫室氣體盤查資訊 · 公開資訊觀測站  [來源 ↗]
    [3] 2024 永續報告書 p.87                    [下載 PDF] [來源 ↗]
你：那跟亞泥比呢？    ← 追問，沿用上下文，範疇擴為兩家公司
```

- 多輪、串流回應；範疇晶片（「台泥」「2024」「永續」）可點掉。
- 引用編號可點：PDF 類開啟預覽到該頁（`#page=n`），結構化資料類開啟公司頁對應分頁。
- 回答中凡是**未出現在檢索結果或工具輸出裡的數字**，以灰底標記「未能對照出處」（見 §6.3）。

---

## 5. 資料管線調整

### 5.1 來源與排程

| 來源                         | 內容                                 | 排程                                                                     | 變更                                                                     |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `GCIS_REGISTRATION`          | 基本資料、董監事                     | 每日比對；有變更才寫新快照                                               | 新增快照表與異動比對；新增「所營事業項目」；部署前確認 IP 白名單（§9-3） |
| `MOPS_FINANCIAL_REPORT`      | 合併財報 PDF                         | 依法定申報期限前後加密（3/31、5/15、8/14、11/14 後兩週每日查，其餘每週） | 由「只抓 Q4」擴為四季                                                    |
| `MOPS_ANNUAL_REPORT`（新）   | 股東會年報 PDF（電子書 `mtype=F`）   | 5–7 月每日，其餘每月                                                     | 新來源；「它在做什麼」的主要依據                                         |
| `MOPS_FINANCIAL_FACTS`（新） | 結構化財務數字（綜合損益、資產負債） | 同財報                                                                   | 新來源；來源選擇見 §9-4                                                  |
| `ESG_REPORT`                 | 永續報告書 PDF                       | 6–9 月每日，其餘每月                                                     | 排程隨申報季調整                                                         |
| `GHG_INVENTORY`              | 溫室氣體揭露                         | 同上                                                                     | 除了索引文字，**另寫入結構化碳排表**                                     |

排程改為「申報季感知」：規劃器依來源的法定期限決定下次查詢時間，而不是固定 7 天重查。

### 5.2 資料模型（新增）

`Company` 仍是唯讀公開資料字典；以下新表全部只掛 `stockId`，**不掛 `AccountBook`**（CLAUDE.md §9）。

```prisma
model CompanyRegistrationSnapshot {   // 商業司快照，每次有變更才新增一列
  id String @id @default(uuid())
  stockId String; taxId String
  fields Json            // 原樣保存 GCIS 欄位
  contentHash String      // 與前一列相同則不寫
  businessItems Json?     // 所營事業項目
  sourceUrl String; fetchedAt DateTime
  @@index([stockId, fetchedAt])
}

model CompanyFinancialFact {          // 一個科目一列
  stockId String; year Int; quarter Int   // quarter = 4 代表全年
  itemCode String         // 會計科目代碼（常數表）
  value Decimal @db.Decimal(24, 4)
  unit String             // 來源單位原樣保存（仟元／元）
  documentId String       // 指向 ObservatoryDocument
  @@id([stockId, year, quarter, itemCode])
}

model CompanyEmissionFact {           // 範疇一～三
  stockId String; year Int; scope String
  value Decimal @db.Decimal(24, 4); unit String
  boundary String?; assuranceProvider String?; assuranceStandard String?
  documentId String
  @@id([stockId, year, scope])
}

model CompanyBusinessSummary {        // 年報「營運概況」萃取結果
  stockId String; year Int
  items Json              // [{ text, quote, pageNumber }]，quote 必為原文子字串
  documentId String; model String; promptVersion String
  @@id([stockId, year])
}
```

- `CompanyBusinessSummary` 由背景 worker 以 Temperature 0 + `responseSchema` 萃取（LLM 只做字串萃取）；
  入庫前以決定性規則驗證每個 `quote` 是該頁文字層的子字串，不是就丟棄。
- `Report` 表保留給手動匯入的舊報告；新頁面直接讀 `ObservatoryDocument`，不再擴充 `report_projection`。

### 5.3 檢索品質

1. 嵌入模型改為多語模型（候選：`bge-m3`），兩張向量表一起重建（現有文件 §5 已列為後續）。
2. 有指定公司時先以 `stock_id` 過濾再取前 8 名，不再只取全域前 3 名。
3. 數字題優先走 §6.2 的結構化工具，向量檢索只補敘述性內容。

---

## 6. AI 對話設計

### 6.1 流程

```
問題 + 對話歷史
  → ① 範疇解析（決定性）：公司（代號／全名／簡稱／統編字典比對）、年度（正規式）、主題（關鍵字表）
       字典對不到才讓 LLM 萃取公司名，再回字典比對；對不到的名字不使用
  → ② 取證：結構化工具（§6.2）＋ 向量檢索（依範疇過濾）
  → ③ 生成：LLM 只能根據 ②；輸出 { answer, citations: [evidenceId] }（responseSchema）
  → ④ 護欄（決定性）：丟棄不在 ② 的 evidenceId；比對 answer 內的數字是否出現在證據中
  → ⑤ 串流回前端：答案、引用卡（文件、頁碼、下載、官方網址）、未對照數字標記
```

### 6.2 結構化工具（TypeScript，非 LLM）

| 工具                                            | 回傳                 | 說明                                |
| ----------------------------------------------- | -------------------- | ----------------------------------- |
| `getCompanyProfile(stockId)`                    | 最新登記快照         | 資本額、代表人、地址、設立日        |
| `getFinancialFacts(stockId, items, years)`      | 科目值與來源文件     | 原值與單位                          |
| `compareFinancial(stockId, item, yearA, yearB)` | 差額、成長率         | `Prisma.Decimal` 計算，回傳公式字串 |
| `getEmissions(stockId, years)`                  | 範疇一～三與確信資訊 | 原值                                |
| `listReports(stockId, type?, year?)`            | 文件清單             | 供「有哪些報告可以下載」            |

工具輸出各帶一個 `evidenceId`，與向量切塊一起編號，LLM 只能引用這些編號。

### 6.3 數字對照護欄

從 `answer` 抽出所有數字（正規式），逐一比對是否出現在證據文字或工具輸出中（容許千分位與單位寫法差異）。
對不到的數字不刪除、不改寫，但在前端標記「未能對照出處」，並寫入 log 供回頭檢查 prompt。

### 6.4 LLM 呼叫、計費與保存

- 以 `runWithUsageCapture` 包住整次生成（修 P6）。模型是本機 gemma4（§9-2），不經 `ChatService.invokeGuarded`（它只包得住 Gemini SDK），改由 `ollamaGenerate` 以 Ollama 回報的 token 數記用量。
- 登入使用者的對話存成 `BusinessMonitorConversation` / `Message`（含引用），可回看；未登入只保留在瀏覽器分頁內。

---

## 7. API 規劃

| 端點                                                      | 方法 | 說明                                                                                            |
| --------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| `/api/v1/business_monitor/companies?q=&industry=&page=`   | GET  | 公司搜尋（代號／名稱／簡稱／統編）                                                              |
| `/api/v1/business_monitor/companies/{stockId}`            | GET  | 公司頁：登記快照、業務摘要、關鍵數字、近期異動                                                  |
| `/api/v1/business_monitor/companies/{stockId}/financials` | GET  | 財務分頁                                                                                        |
| `/api/v1/business_monitor/companies/{stockId}/emissions`  | GET  | 永續與碳排分頁                                                                                  |
| `/api/v1/business_monitor/companies/{stockId}/documents`  | GET  | 報告庫                                                                                          |
| `/api/v1/business_monitor/documents/{documentId}/file`    | GET  | **串流原始檔**（取代模擬的 `/download`），`Content-Disposition` 檔名 `{代號}_{年度}_{類型}.pdf` |
| `/api/v1/business_monitor/chat`                           | POST | 多輪對話，SSE 串流；body 經 `businessMonitorChatSchema` 驗證                                    |

所有 Zod Schema 放 `src/validators/business_monitor.ts`，由 `src/validators/index.ts` 導出；
`/download`（模擬）與 `ai_response_card.tsx` 的假 Blob 一併移除。

---

## 8. 分期

| 期                 | 內容                                                                                                    | 解決           | 驗收                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- |
| **一：可信度底線** | 真實檔案下載端點；引用帶頁碼與官方網址；chat Validator 與正確錯誤碼；登入、計費與用量回報；移除模擬下載 | P3、P4、P6、P7 | 點任何「下載」拿到的都是原始 PDF；AI 回答每個出處都能點回 |
| **二：公司頁**     | 公司搜尋與公司頁（概覽、報告庫）；GCIS 快照與異動；產業與年度選單資料化                                 | P1、P8、P9     | 從搜尋到看懂一家公司不需要讀任何一份 PDF                  |
| **三：結構化事實** | `CompanyFinancialFact`、`CompanyEmissionFact`；財務與碳排分頁；申報季感知排程；四季財報                 | P5、P10        | 「台泥 2024 範疇一」由結構化工具直接答對                  |
| **四：對話化 AI**  | 多輪串流對話面板、結構化工具、數字對照護欄、對話保存                                                    | P2             | 追問可沿用上下文；回答中的數字都能對照                    |
| **五：它在做什麼** | 股東會年報來源、業務摘要萃取、多語嵌入重建                                                              | P10、P5        | 公司頁「它在做什麼」每點都有年報頁碼                      |

每期各自一個 `feature/` 分支與 MR。第一期不依賴其他期，可以先做。

---

## 9. 決策（2026-10-22 定案）

1. **AI 對話要登入並扣額度。** 企業觀測站沒有帳本可綁，走 `runBilledCarbonTask` 的無帳本路徑：個人點數「建單 → 402 → 付款 → 以同一個 `clientMessageId` 重送」，預估一次收足、失敗退款。功能代碼 `BUSINESS_MONITOR_CHAT`。檢索不到資料時直接回「找不到」，不收費。
2. **LLM 用本機 Ollama `gemma4:e4b`。** Temperature 0；用量取 Ollama 的 `prompt_eval_count` + `eval_count`。
3. **商業司 IP 白名單已核准。** 第二期的每日比對可直接沿用 `gcis_registration.downloader.ts` 的 API 查詢。
4. **財務數字從證交所 OpenAPI 抓。** OpenAPI 只提供最新一期，因此第三期的排程必須在每期公布後把當期數字寫進 `CompanyFinancialFact` 累積歷史；上市與上櫃（櫃買中心 OpenAPI）是兩個端點，要各接一次。

---

## 10. 第一期實作紀錄（2026-10-22）

| 項目                                                                                                                  | 位置                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 原始檔下載 `GET /api/v1/business_monitor/reports/{id}/file`（取代模擬 SSE 的 `/download`，已刪除）                    | `reports/[report_id]/file/route.ts`、`businessMonitorService.getReportFile`        |
| 觀測站報告讀 `ObservatoryDocument.filePath`；手動匯入報告讀 `pdfs/`；檔案未備妥回 `NF000032`、報告不存在回 `NF000031` | 同上、`observatoryDocumentRepo.findByKey`                                          |
| AI 諮詢需登入（DeWT）、LLM 限流、Zod 驗證（`businessMonitorChatSchema`）                                              | `chat/route.ts`、`src/validators/business_monitor.ts`                              |
| 證據編號 [n]、出處帶頁碼與官方網址；對不上的編號從回答移除                                                            | `src/lib/business_monitor/citations.ts`                                            |
| 本機模型呼叫與用量回報；Ollama 不可用回 `IS000024`                                                                    | `src/lib/llm/ollama_generate.ts`                                                   |
| 移除 `/reports?query=` 的 AI 篩選分支：未登入可呼叫、不計費，且提示詞要求模型「利用既有知識」回答數據                 | `businessMonitorService.getReports`                                                |
| 前端：卡片、詳情頁、AI 出處的「下載」改為真實檔案；未登入提問顯示登入按鈕；402 付款後重送                             | `use_report_download.ts`、`ai_response_card.tsx`、`business_monitor_page_body.tsx` |

已知限制：公司偵測的 LLM 萃取在計費範圍之外（檢索階段，每題最多一次短呼叫）；回答中的數字對照護欄屬第四期。

---

## 11. 介面改版：首頁、公司頁與範疇（2026-10-22）

### 11.1 為什麼拿掉產業與年份篩選

- **產業**：選單寫死 5 個電子類產業，追蹤中的公司卻有 1,989 家、35 個產業；篩的是報告而不是公司。
- **年份**：同一個數字在不同來源意義不同——財報是會計年度、永續與溫室氣體是揭露年度、公司登記只是抓取當年的快照（「2026 年公司登記資料」）。選單又寫死 2023–2025。
- 輸入 AI 問題時，三個篩選全部被忽略，畫面上看不出來。

### 11.2 改成什麼

| 原本                                      | 現在                                                                   | 位置                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| AI 諮詢框＋選擇企業＋產業＋年份＋搜尋報告 | 一個輸入框：找公司（代號／全名／簡稱／統編，台臺互通）或按 Enter 問 AI | `company_search_box.tsx`                                                                      |
| 產業下拉（5 個）                          | 依產業瀏覽：35 個產業由資料產生、附公司數，點進去是公司清單            | `industry_browser.tsx`、`GET /business_monitor/industries`、`GET /business_monitor/companies` |
| 報告卡片清單                              | 公司頁：基本資料、最新公司登記、依資料年度分組的報告庫、問問這家公司   | `/business_monitor/company/[stock_id]`、`GET /business_monitor/companies/{stockId}`           |
| 年份下拉                                  | 報告庫依「資料所屬年度」分組；AI 範疇標籤（從問題偵測、送出前可取消）  | `report_library.tsx`、`scope_chips.tsx`                                                       |
| 「2026 年公司登記資料」                   | 「最新登記資料・更新於 YYYY-MM-DD」（最後一次向商業司取得的日期）      | `registration_card.tsx`；報告標題改為「最新公司登記資料」                                     |

### 11.3 範疇的語意

- `POST /business_monitor/chat` 新增 `scope: { stockId?, years? }`。公司頁帶 `stockId`，不再從問題猜公司；`years` 有帶（含空陣列）就照用。
- 回應帶回實際查詢的 `scope: { companies, years }`，畫面顯示「本次查閱」。
- **有指定公司時年度也生效**（原本「寬鬆模式」會忽略年度，範疇標籤就名不副實）；公司登記不屬於任何年度，照樣納入（LanceDB 條件 `year IN (...) OR source IN ('GCIS_REGISTRATION')`）。
- 年度偵測前後不能緊接數字：「營收 120245 元」裡的 2024 不算年份。

### 11.4 已知限制

- 既有的公司登記 `Report` 列與向量切塊仍是舊標題「2026 年公司登記資料」，下一次內容變動重新索引時才會改成新標題。
- 報告庫標示的是本系統「取得於」的日期，不是來源的公布日：來源沒提供公布日，不推估。
- 舊的報告詳情頁 `/business_monitor/[report_id]` 仍保留（外部連結與 sitemap），首頁不再連到它。

---

## 12. 第三期：財務數字與碳排（2026-10-23）

| 項目                                                                        | 位置                                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `CompanyFinancialFact` 資料表（一個科目一列，`Decimal(24,4)`）              | `prisma/schema.prisma`、`company_financial_fact.repo.ts`                                              |
| 每日同步 24 支 OpenAPI（上市＋上櫃 × 損益表＋資產負債表 × 6 種報表格式）    | `financial_facts.sync.service.ts`、`runCompanyFinancialFactSync`、worker 迴圈 `CompanyFinancialFacts` |
| 解析：中文／英文中繼鍵、民國年轉西元、單位判定、只收十進位數字              | `src/lib/company_observatory/financial_facts.ts`                                                      |
| 公司頁「財務數字」：關鍵科目（來源原名）、負債比與淨利率（Decimal，附公式） | `financial_summary.ts`、`financial_card.tsx`                                                          |
| 公司頁「溫室氣體排放」：範疇一～三、邊界、確信；邊界相同才算年增減          | `ghg_inventory_text.ts`、`emission_summary.ts`、`emission_card.tsx`                                   |

與 §5.2 的差異：

- **沒有建 `CompanyEmissionFact`**：溫室氣體本來就按揭露年度存成文件，直接讀已下載的文字即可，不必再複製一份；
  第四期的 AI 結構化工具需要時，可以同一個解析器讀取。
- **財務數字只存 OpenAPI 給的科目**：OpenAPI 是精簡報表（約 20～60 個科目），沒有附註與明細。

第三期後半見 §13。

---

## 13. 第三期後半：申報季排程、四季財報、歷史回補（2026-10-23）

| 項目                                                                       | 位置                                                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 依法定申報期限決定重查間隔（期間未結束→結束隔天；申報季→每天；其餘→30 天） | `retry_policy.ts`（`nextRecheckAt`、`firstCheckAt`）、`OBSERVATORY_FILING_SCHEDULE` |
| 限流改以主機為單位（MOPS 年報與季報同一台主機一起暫停）                    | `OBSERVATORY_SOURCE_HOST`、`company_observatory.service.ts`                         |
| 第一～三季財報 PDF（只追蹤今年）                                           | `MOPS_FINANCIAL_REPORT_Q1/Q2/Q3`、`createMopsFinancialReportDownloader`             |
| 歷史財務數字回補（MOPS 彙總報表，近 3 年）                                 | `mops_financial_summary.ts`、`financial_facts.sync.service.ts`                      |
| 公司頁並排同一季、附年增率                                                 | `financial_summary.ts`、`financial_card.tsx`                                        |

細節與實測見 `async_workers/07_company_observatory.md` §10～§12。
