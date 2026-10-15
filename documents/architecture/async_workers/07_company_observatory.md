# ⚙️ 核心管線：07. 企業觀測站（外部公開報告下載與索引）

> **Date**: 2026-10-15
> **Author**: Luphia
> **Target**: `src/services/company_observatory/`, `src/services/cron/company_observatory.cron.ts`

背景 worker 定期下載上市櫃公司的四類公開報告，切塊後寫入 LanceDB，供依公司與報告類型檢索。
這條管線只處理「向外看」的公開資料：公司清單讀自唯讀字典 `Company`（CLAUDE.md §9），
狀態存在獨立的 `ObservatoryDocument`，不掛任何 `AccountBook` 租戶資料。

## 1. 資料來源

| 來源 (`OBSERVATORY_SOURCE`) | 實際端點 | 內容 | 年度 | 重新抓取 |
| --- | --- | --- | --- | --- |
| `GCIS_REGISTRATION` | `https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6`（基本資料）<br>`https://data.gcis.nat.gov.tw/od/data/api/4E5F7653-1B91-4DDC-99D5-468530FAE396`（董監事），皆以統一編號查詢 | 經濟部商業司公司登記：資本額、代表人、所在地、董監事與持股 | 今年快照 | 每 30 天比對一次 |
| `MOPS_FINANCIAL_REPORT` | `https://doc.twse.com.tw/server-java/t57sb01`（`mtype=A`，Big5） | 公開資訊觀測站電子書：第四季 IFRSs 合併財報 PDF（`YYYY04_代號_AI1.pdf`，無則個體 `AI3`） | 去年、前年 | 不重抓 |
| `ESG_REPORT` | `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data`（清單）<br>`…/MopsSustainReport/data/FileStream?id=`（檔案） | 證交所 ESG 數位平台：永續報告書 PDF（修正版優先） | 去年、前年 | 不重抓 |
| `GHG_INVENTORY` | `https://esggenplus.twse.com.tw/api/api/mopsEsg/singleCompanyData` | 公開資訊觀測站 ESG 資訊揭露中名稱含「溫室氣體」的項目：範疇一～三、資料邊界、確信機構／標準／意見、減量目標 | 去年、前年 | 不重抓 |

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

| 迴圈 | 間隔 | 每輪工作量 |
| --- | --- | --- |
| `CompanyObservatoryPlanner` | 每日 | 補建所有追蹤中公司 × 來源 × 年度的 PENDING 列；公司登記逾 30 天排回刷新 |
| `CompanyObservatory` | 每 10 分鐘 | 每個來源下載 5 份，再索引 5 份 |

逐主機最短請求間隔（`OBSERVATORY_HOST_MIN_INTERVAL_MS`）：GCIS 2 秒、MOPS 電子書 5 秒、ESG 平台 3 秒
（報告書與溫室氣體共用同一主機與同一個限速器）。worker 租約保證同一個資料庫只有一個 worker 在下載。

## 4. 儲存

- 原始檔：`data/company_observatory/{stockId}/{year}/{source}.{pdf|txt}`（`data/` 已在 .gitignore），DB 只存相對路徑。
- 向量：LanceDB 資料表 `company_observatory_chunks`（與 `company_reports` 分開），
  欄位 `id, vector(768), text, document_id, stock_id, company_name, source, year, source_url, page_number, chunk_index, content_hash`。
  嵌入模型為本機 Ollama `nomic-embed-text`，與既有企業觀測站相同。

## 5. 企業觀測站頁面（`/business_monitor`）

索引完成的文件會發布成一筆 `Report`，頁面的清單、詳情、篩選與 AI 諮詢因此讀得到它：

- `pdfPath = observatory/{stockId}/{year}/{source}`，以它 upsert，重跑只會覆寫同一列。
- 欄位來源（`src/lib/company_observatory/report_projection.ts`）：公司全名取自 `Company.name`；
  產業別由 `Company.industry` 的證交所代碼查表（`TWSE_INDUSTRY_NAME`）；資本額級距由 `Company.metadata`
  的實收資本額以 BigInt 比對門檻；揭露期間、確信／查證機構與標準由下載器從來源結構化欄位原樣取出
  （永續報告書：申報紀錄的 `reportingInterval`／`valiProvider`／`thirdStd`；溫室氣體：範疇一的確信機構與標準；
  財報：查詢頁標示「曆年制」才填全年期間）。來源沒有提供的欄位留空字串。
- AI 諮詢：手動匯入報告的切塊在 `company_reports`，觀測站的切塊在 `company_observatory_chunks`；
  兩張表各自檢索後依距離合併取前 3 筆。有指定公司時以公司代號過濾，否則依報告類型（`OBSERVATORY_SOURCES_BY_REPORT_TYPE`）與年度過濾。
- 產業篩選：選單送的是 `SEMICONDUCTOR` 這類鍵，改為對應成「半導體業」後以包含比對（原本直接比對鍵，永遠查不到）。

## 6. 管理端 API（ADMIN / SUPER_ADMIN）

- `GET /api/v1/admin/company_observatory?stockId=&source=&status=&year=&page=&pageSize=`：各來源 × 狀態筆數與文件清單。
- `GET /api/v1/admin/company_observatory/search?q=&stockId=&source=&year=&limit=`：依公司／類型／年度過濾的向量檢索。
- `POST /api/v1/admin/company_observatory/requeue`：`{ "ids": [...] }` 或 `{ "allDead": true, "source"?: "..." }`。

## 7. 部署

1. `npx prisma db push`（新增 `observatory_document` 表）。
2. `npx tsx scripts/sync_companies.ts`：`Company` 是空的就沒有任何東西可下載。
3. `npm run initial_lance_db`（建立 `company_observatory_chunks`；`npm run build`／`npm run dev` 也會自動執行，已存在則跳過）。
4. worker 主機需有 Ollama 並已 `ollama pull nomic-embed-text`；沒有時下載照常進行，索引會暫停等待。
