# ⚙️ 核心管線：07. 企業觀測站（外部公開報告下載與索引）

> **Date**: 2026-10-15
> **Author**: Luphia
> **Target**: `src/services/company_observatory/`, `src/services/cron/company_observatory.cron.ts`

背景 worker 定期下載上市櫃公司的四類公開報告，切塊後寫入 LanceDB，供依公司與報告類型檢索。
這條管線只處理「向外看」的公開資料：公司清單讀自唯讀字典 `Company`（CLAUDE.md §9），
狀態存在獨立的 `ObservatoryDocument`，不掛任何 `AccountBook` 租戶資料。

## 1. 資料來源

| 來源 (`OBSERVATORY_SOURCE`) | 實際端點                                                                                                                                                                                                   | 內容                                                                                                        | 年度       | 重新抓取         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- | ---------------- |
| `GCIS_REGISTRATION`         | `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6`（基本資料）<br>`https://data.gcis.nat.gov.tw/od/data/api/4E5F7653-1B91-4DDC-99D5-468530FAE396`（董監事），皆以統一編號查詢 | 經濟部商業司公司登記：資本額、代表人、所在地、董監事與持股                                                  | 今年快照   | 每 30 天比對一次 |
| `MOPS_FINANCIAL_REPORT`     | `https://doc.twse.com.tw/server-java/t57sb01`（`mtype=A`，Big5）                                                                                                                                           | 公開資訊觀測站電子書：第四季 IFRSs 合併財報 PDF（`YYYY04_代號_AI1.pdf`，無則個體 `AI3`）                    | 去年、前年 | 不重抓           |
| `ESG_REPORT`                | `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data`（清單）<br>`…/MopsSustainReport/data/FileStream?id=`（檔案）                                                                               | 證交所 ESG 數位平台：永續報告書 PDF（修正版優先）                                                           | 去年、前年 | 不重抓           |
| `GHG_INVENTORY`             | `https://esggenplus.twse.com.tw/api/api/mopsEsg/singleCompanyData`                                                                                                                                         | 公開資訊觀測站 ESG 資訊揭露中名稱含「溫室氣體」的項目：範疇一～三、資料邊界、確信機構／標準／意見、減量目標 | 去年、前年 | 不重抓           |

結構化來源（公司登記、溫室氣體）由下載器以固定格式渲染成「欄位：值」純文字；數值原樣照抄、不換算。
PDF 以既有的 `extractPdfTextLayer` 抽文字層（不送 OCR、不呼叫 LLM），並移除 CJK 字元間的空白。
整條管線沒有 LLM 生成步驟（CLAUDE.md §8）。

## 2. 狀態機

```
PENDING ──下載──▶ DOWNLOADED ──索引──▶ INDEXED
   │                  │ 索引失敗：留在 DOWNLOADED 並退避
   ├─來源查無─▶ NOT_AVAILABLE（7 天後重查，不計失敗）
   └─失敗─▶ FAILED（1h → 4h 退避）──第 3 次──▶ DEAD（死信）
```

- **冪等**：`@@unique([stockId, source, year])` 擋重複建列；狀態更新一律是「帶舊狀態的條件更新」；
  下載內容的 sha256 與 `indexedHash` 相同即回到 INDEXED，不寫檔、不重建索引；
  LanceDB 以文件為單位先刪後寫，列 id 為 `{documentId}_{chunkIndex}`。
- **死信**：失敗 3 次（`OBSERVATORY_MAX_ATTEMPTS`）進 `DEAD`，不再自動重試；
  掃描檔無文字層直接進 `DEAD`（`no_text_layer`）。由管理端 `POST /api/v1/admin/company_observatory/requeue` 重新排入。
- **不算這份文件的錯**：MOPS 回「查詢過繁」→ 本輪停止該來源；Ollama 或 LanceDB 資料表不可用 → 本輪停止索引。兩者皆不累計失敗次數。

## 3. 排程與速率

| 迴圈                        | 間隔       | 每輪工作量                                                                         |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `CompanyObservatoryPlanner` | 每日       | 補建所有追蹤中公司 × 來源 × 年度的 PENDING 列；公司登記逾 30 天排回刷新            |
| `CompanyObservatory`        | 每 10 分鐘 | 每個來源下載 5 份，再索引 5 份                                                     |
| `CompanyFinancialFacts`     | 每日       | 抓 24 支財務 OpenAPI，以「公司 × 期別 × 報表」覆寫 `CompanyFinancialFact`（見 §8） |

逐主機最短請求間隔（`OBSERVATORY_HOST_MIN_INTERVAL_MS`）：GCIS 2 秒、MOPS 電子書 5 秒、ESG 平台 3 秒、證交所與櫃買中心 OpenAPI 各 2 秒
（報告書與溫室氣體共用同一主機與同一個限速器）。worker 租約保證同一個資料庫只有一個 worker 在下載。

## 4. 儲存

- 原始檔：`data/company_observatory/{stockId}/{year}/{source}.{pdf|txt}`（`data/` 已在 .gitignore），DB 只存相對路徑。
- 向量：LanceDB 資料表 `company_observatory_chunks`（與 `company_reports` 分開），
  欄位 `id, vector(1024), text, document_id, stock_id, company_name, source, year, source_url, page_number, chunk_index, content_hash`，
  `text` 上另有字元二元組（bigram）全文索引。
- 嵌入模型為本機 Ollama `bge-m3`（多語、1024 維，`OBSERVATORY_EMBED_*`），經 `/api/embed` 取 L2 正規化後的向量；
  `company_reports`、`scripts/import_pdfs.ts` 與 AI 諮詢的查詢向量共用同一個嵌入器（`src/lib/company_observatory/embedder.ts`）。
  兩張表的建立與重建邏輯在 `src/lib/company_observatory/lance_tables.ts`。
- 每輪索引完成後呼叫 `optimize()`，把新寫入的列併進索引；尚未併入的列全文檢索仍會掃描到。

## 5. 企業觀測站頁面（`/business_monitor`）

索引完成的文件會發布成一筆 `Report`，頁面的清單、詳情、篩選與 AI 諮詢因此讀得到它：

- `pdfPath = observatory/{stockId}/{year}/{source}`，以它 upsert，重跑只會覆寫同一列。
- 欄位來源（`src/lib/company_observatory/report_projection.ts`）：公司全名取自 `Company.name`；
  產業別由 `Company.industry` 的證交所代碼查表（`TWSE_INDUSTRY_NAME`）；資本額級距由 `Company.metadata`
  的實收資本額以 BigInt 比對門檻；揭露期間、確信／查證機構與標準由下載器從來源結構化欄位原樣取出
  （永續報告書：申報紀錄的 `reportingInterval`／`valiProvider`／`thirdStd`；溫室氣體：範疇一的確信機構與標準；
  財報：查詢頁標示「曆年制」才填全年期間）。來源沒有提供的欄位留空字串。
- AI 諮詢：手動匯入報告的切塊在 `company_reports`，觀測站的切塊在 `company_observatory_chunks`。
  混合檢索：`company_reports` 的向量結果、觀測站的向量結果、觀測站的全文（BM25）結果各取 30 筆候選
  （`OBSERVATORY_RETRIEVAL_CANDIDATES`），以倒數排名融合（RRF，`OBSERVATORY_RRF_K = 60`，`rank_fusion.ts`）合併後取前 3 筆。
  向量擅長語意相近的段落，全文檢索擅長「範疇一」「每股盈餘」這類必須字面命中的詞，兩者互補。
- 過濾（`buildObservatoryFilter`）：有指定公司時以公司代號過濾；問題提到的年度若該公司確實有那年的報告，再加上年度過濾
  （公司登記這類快照型來源 `OBSERVATORY_SNAPSHOT_SOURCES` 不受年度限制）。問到的年度一份報告都沒有時不過濾年度，
  沿用寬鬆檢索、由 LLM 依中繼資料的年度提醒作答。沒有指定公司時依報告類型（`OBSERVATORY_SOURCES_BY_REPORT_TYPE`）與年度過濾。
- 公司偵測：除了靜態別名，也比對 `Company.abbreviation`（證交所公布的簡稱）。觀測站報告用的是登記全名
  （「臺灣水泥股份有限公司」），靜態別名寫的是「台灣水泥…」，只靠別名時「台泥」對不上。
- `company_reports` 打不開（從未匯入或資料夾殘缺）時只記 log，仍會檢索觀測站資料。
- 檢索評估：`npx tsx scripts/eval_observatory_retrieval.ts [--mode hybrid|dense|lexical] [--no-year-filter]`，
  題組在 `scripts/fixtures/observatory_retrieval_eval_cases.json`（1101 台泥 12 題：溫室氣體、永續報告書、財報、公司登記）。
  正確切塊以「來源 + 年度 + 必含字串」判定，不經 LLM，結果是決定性的。以本機 1101 的 7 份文件（1,473 個切塊）實測：

  | 設定                                                        | hit@1 | hit@3     | hit@5     | MRR@10 |
  | ----------------------------------------------------------- | ----- | --------- | --------- | ------ |
  | 舊：nomic-embed-text 向量、只限公司                         | 1/12  | 1/12      | 1/12      | 0.083  |
  | nomic-embed-text + `search_query:`／`search_document:` 前綴 | 0/12  | 1/12      | 1/12      | 0.028  |
  | bge-m3 向量、限公司與年度                                   | 4/12  | 5/12      | 8/12      | 0.433  |
  | 二元組 BM25、限公司與年度                                   | 9/12  | 10/12     | 10/12     | 0.788  |
  | **新：bge-m3 + BM25（RRF）、限公司與年度**                  | 6/12  | **10/12** | **11/12** | 0.668  |

  只用 BM25 的 hit@1 較高，但遇到用字不同的問題會整個漏掉（「董事長是誰」排到 10 名外）；混合檢索每題都在前 10 名內，
  AI 諮詢取的前 3 筆命中率與 BM25 相同。nomic 的前綴對中文沒有幫助。舊設定下「台泥 2024 年範疇一排放量」
  真正含數字的切塊排在第 274 名，新設定排第 1 名。

- 原始檔下載（2026-10-22）：`GET /api/v1/business_monitor/reports/{id}/file` 依 `pdfPath` 找回 `ObservatoryDocument.filePath`，
  直接串流 `data/company_observatory/` 下的檔案；PDF 來源回 `application/pdf`，公司登記與溫室氣體回純文字。
  AI 諮詢的出處帶切塊的 `page_number`（僅 PDF 來源）與 `source_url`。詳見 [企業觀測站重新規劃](../business_monitor_redesign_plan.md) §10。
- 產業篩選：選單送的是 `SEMICONDUCTOR` 這類鍵，改為對應成「半導體業」後以包含比對（原本直接比對鍵，永遠查不到）。

## 6. 管理端 API（ADMIN / SUPER_ADMIN）

- `GET /api/v1/admin/company_observatory?stockId=&source=&status=&year=&page=&pageSize=`：各來源 × 狀態筆數與文件清單。
- `GET /api/v1/admin/company_observatory/search?q=&stockId=&source=&year=&limit=`：依公司／類型／年度過濾的混合檢索（向量 + 全文，RRF）。
- `POST /api/v1/admin/company_observatory/requeue`：`{ "ids": [...] }` 或 `{ "allDead": true, "source"?: "..." }`。

## 7. 部署

0. **企業觀測站預設隱藏（2026-10-28 起）**：系統設定 `BUSINESS_MONITOR_ENABLED`（後台「系統設定 → 功能開關」）
   未設為「開啟」時，頁面、導覽與 API 都不提供，背景 worker 也不對外抓任何資料。要啟用請由超級管理員在後台改為「開啟」並簽章，
   10 分鐘內生效（見 §13）。以下步驟在開啟前做好即可。

1. `npx prisma db push`（新增 `observatory_document` 表）。
   2026-10-23 起另新增 `company_financial_fact` 表與其 `market` 欄位，同樣以 `npx prisma db push` 建立（只新增，不動既有表）。
2. `npx tsx scripts/sync_companies.ts`：`Company` 是空的就沒有任何東西可下載。
3. `npm run initial_lance_db`（建立兩張切塊表與全文索引；`npm run build`／`npm run dev` 也會自動執行，已存在則跳過）。
   表的維度與目前嵌入模型不同時只印提醒、不自動刪表。
4. worker 主機需有 Ollama 並已 `ollama pull bge-m3`；沒有時下載照常進行，索引會暫停等待。
5. 從 `nomic-embed-text`（768 維）升級：先 `ollama pull bge-m3`，再執行 `npm run reindex_lance_db`。
   腳本把已索引的 `ObservatoryDocument` 排回 `DOWNLOADED`（清掉 `indexedHash`），再以 1024 維重建兩張表；
   worker 讀本機原始檔重新切塊與嵌入，不會重新下載。`company_reports` 重建後是空的，手動匯入的報告要重跑
   `scripts/import_pdfs.ts`。在重建之前，寫入時的維度檢查會讓索引暫停（不計失敗次數），AI 諮詢的向量檢索失敗則降級為只用全文檢索。

## 8. 財務數字（證交所／櫃買中心 OpenAPI，2026-10-23）

- **來源**：上市 `openapi.twse.com.tw/v1/opendata/t187ap0{6,7}_L_{form}`、上櫃 `www.tpex.org.tw/openapi/v1/mopsfin_t187ap0{6,7}_O_{form}`，
  `form` 為 ci（一般業）、basi（金融業）、bd（證券期貨業）、fh（金控業）、ins（保險業）、mim（異業），共 24 支（`FINANCIAL_OPENAPI_ENDPOINTS`）。
  每支一次回傳該市場全部公司的**最新一期**；首次同步實測 1,978 家、66,540 個科目、0 支失敗。
- **儲存**：`CompanyFinancialFact`，一個科目一列（`@@id([stockId, year, quarter, statement, item])`），值為 `Decimal(24,4)`，
  科目名稱與出表日期原樣保留。以「公司 × 期別 × 報表」先刪後寫包在同一個交易：重跑冪等、來源重編不殘留，不同期別互不影響——
  **OpenAPI 不給歷史，歷史靠每日同步累積**。某支端點失敗只記 log，隔天再抓。
- **來源事實**（20261023 實測）：
  - 金額單位為仟元（台泥「股本 77,231,817」對上商業司「實收資本額 77,231,817,420 元」）；「（元）」與「每股」開頭的是每股金額，「股數」是股。
  - 損益表是年初累計至該季（台積電第 2 季營業收入 2.4 兆、EPS 49.33）。
  - 上櫃端點的中繼欄位混用英文鍵（`SecuritiesCompanyCode`、`Year`、`Season`、`Date`），同一支端點兩種都可能出現。
  - **金控業（fh）欄位疑似錯位**：富邦金「淨收益」54 億小於「利息淨收益」1,121 億、「稅前損益」小於「稅後淨利」。原值照存，
    但公司頁不把「淨收益」當營收，淨利率只在科目是「營業收入」時計算。
- **公司頁**：關鍵科目依各格式的候選名稱取第一個有值的（`FINANCIAL_KEY_ITEM_SOURCES`），顯示來源原本的科目名稱；
  負債比、淨利率以 `Prisma.Decimal` 計算並寫明公式。不做跨季比較（累計數不能直接相減）。

## 9. 溫室氣體範疇（公司頁，2026-10-23）

- 不另建資料表：讀已下載的 `GHG_INVENTORY` 純文字（`renderGhgInventoryText` 的輸出）取回範疇一～三的數據、資料邊界、確信機構／標準／意見，
  原樣顯示。溫室氣體文件「不重抓」，既有年度只有這份文字；解析器與渲染器以來回測試綁在一起。
- 年增減只比較相鄰揭露年度、同範疇、**資料邊界文字完全相同**的數字（`Prisma.Decimal`）；邊界不同就標示不比較——
  台泥範疇三 2024 只算母公司、2025 涵蓋多家子公司，數字從 1,934 萬降到 246 萬並不是減排。

## 10. 申報季感知排程（2026-10-23）

「查無報告」之後多久再查，改依法定申報期限決定（`OBSERVATORY_FILING_SCHEDULE`、`nextRecheckAt`）：

| 時段                                 | 下次查詢                 |
| ------------------------------------ | ------------------------ |
| 期間還沒結束（例：五月時的第三季）   | 期間結束隔天（台灣時間） |
| 期間結束～申報期限後 14 天（申報季） | 每天                     |
| 其餘（早已過期限的補件、更正）       | 每 30 天                 |
| 公司登記（快照，無申報期限）         | 固定 7 天                |

期限取自公開資訊觀測站彙總報表頁的註 1，不分業別取最晚者：第一季 5/30（金控業）、第二季 8/31（金控、銀行、保險業）、
第三季 11/29（金控業）、年度 3/31（次年）；永續報告書與溫室氣體為次年 8/31。新建的待下載列也以同一規則決定第一次查詢時間
（`firstCheckAt`），一月建立的第三季列不會先白查一次。

限流以**主機**為單位：MOPS 電子書回「查詢過繁」時，同一輪內年報與第一～三季（同一台主機）一起跳過（`OBSERVATORY_SOURCE_HOST`）。

## 11. 第一～三季財務報告（2026-10-23）

- 三個新來源 `MOPS_FINANCIAL_REPORT_Q1/Q2/Q3`，與年報共用 MOPS 電子書流程（`createMopsFinancialReportDownloader`），
  只差檔名季別（`202601_2330_AI1.pdf`）、標題與期間（曆年制：年初累計至季末，如 `2026/01/01~2026/06/30`）。
- **只追蹤今年**：上一年度的第一～三季由年度報告涵蓋，避免檔案量倍增。實測平均 1.4 MB／份，
  全部約 2,000 家 × 3 季 ≈ 8.4 GB／年（年報 2.4 MB × 2 年 ≈ 9.6 GB）。

## 12. 財務數字歷史回補（2026-10-23）

- OpenAPI 只給最新一期；每日同步完 OpenAPI 後，改向公開資訊觀測站彙總報表（`ajax_t163sb04` 損益表、`ajax_t163sb05` 資產負債表）
  回補近 3 年缺少的期別（`planFinancialBackfill`），每次最多 12 支查詢（主機限速 5 秒）。申報季中的期別每天重查（陸續有公司申報），
  OpenAPI 當天給的期別跳過（避免兩個來源互相覆寫）。首次實測每天約補 2 期，約 2 週補完 3 年。
- 彙總報表的欄位名稱與 OpenAPI 相同，寫進同一張表；表格依報表格式分開但沒有標示，以只有該格式才有的欄位辨識
  （`FINANCIAL_FORM_SIGNATURES`），認不出時標為 `unknown`。數值去千分位、`--` 略過；沒有出表日期，`reportedAt` 留空。
- 來源 HTML 的「每股參考淨值」表頭寫成 `<th>…</td>`，解析時兩種結尾都收（測試 fixture 保留這個寫法）。
- 新增 `market` 欄位（`sii`／`otc`），用來判斷某市場某期是否已回補；舊列是空字串，隔日 OpenAPI 同步覆寫時補上。
- 彙總報表的金控業數字是自洽的（華南金「淨收益」= 利息淨收益 + 利息以外淨收益），§8 提到的錯位只出現在 OpenAPI。
- 公司頁改為並排「最新一季與往年同一季」，每個科目附與去年同期的增減（`Prisma.Decimal`；去年同期不是正數時不算）。

## 13. 功能開關：預設隱藏、不收集（2026-10-28）

產品決定：系統預設隱藏企業觀測站，隱藏時不主動收集任何企業資料。

- **開關**：系統設定 `BUSINESS_MONITOR_ENABLED`，只接受 `true`／`false`（設定頁為下拉選單，寫入時 Schema 擋下其他值），
  保底值 `false`。和其他系統設定一樣存 DB、由超級管理員以 passkey 簽章（ADR 017）。
- **失效保護（fail closed）**：只有值完全等於 `true` 才算開啟。未設定、資料庫讀不到、設定簽章驗不過（UNTRUSTED）
  一律視為關閉——開錯的代價是 worker 開始對外抓資料，關錯只是功能暫時看不到。2026-10-28 本機實測：資料庫容器停止時三支排程全部跳過。
- **背景收集**：`CompanyObservatoryPlanner`、`CompanyObservatory`、`CompanyFinancialFacts` 每次執行前讀開關，關閉就直接返回，
  不規劃、不下載、不索引、不同步財務數字。規劃與財務同步原本每 24 小時才醒一次，改為每 10 分鐘檢查、到期（24 小時）才做，
  所以開關改了 10 分鐘內生效；開關狀態改變時記一筆 log。
- **對外**：關閉時 `/business_monitor` 三個頁面回 404（伺服器元件於渲染前檢查）、7 支 `/api/v1/business_monitor/*` 回 `NF000034`（404）、
  導覽列與小工具選單不顯示入口（`GET /api/v1/features`；讀回之前與讀取失敗都先隱藏）、sitemap 不列出。
  管理端 `/api/v1/admin/company_observatory/*` 仍可使用（只讀狀態與重排死信，不會觸發收集）。
- **關閉不會刪資料**：已下載的檔案、切塊與財務數字保留在原處，重新開啟後接續（排程與回補都是冪等的）。
