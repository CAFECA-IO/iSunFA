# 台積電 780 萬筆旗艦級 ESG 擬真數據 PoC 實作戰略 (TSMC PoC Blueprint)

> **Date**: 2026-05-22
> **Context**: 本藍圖定義了 iSunFA 針對大型半導體製造商 (以 2330 為標竿) 所展開的高逼真度、高吞吐量壓力測試。這是一次**「不含任何視覺雜訊的純資料庫火力測試」**，旨在驗證系統的 OOM 防禦力與會計恆等式零誤差引擎。

---

## 🏛️ 1. 半導體領域特化情境池 (Domain-Specific Scenarios)
過去的測試管線多為泛用型假資料，這次我們將針對台積電的真實碳排熱點進行「極致擬真」的逆向工程重構：
- **Scope 2 (最大宗)**：將大量水電費傳票映射至**「特高壓工業用電」**，並指定供應商為「台灣電力公司」，模擬 EUV 曝光機的巨量耗電。
- **Scope 1**：針對 `6213` 相關科目，設定排放源為**「含氟溫室氣體 (F-GHGs) 逸散與天然氣」**。
- **Scope 3 (供應鏈與資本支出)**：建立半導體專屬的進貨與採購情境，如向「信越化學」採購矽晶圓與光阻劑，或向「ASML」採購曝光機（對應 `1441` 機器設備）。

---

## 🚀 2. 巨量資料批次注入管線 (Big Data Batch Seeding) 

> **負責人**: Julian (管線測試優化)

為迎戰 780 萬筆級別的資料庫吞吐量，Julian 將負責徹底翻新測試腳本（如 `fast_verify.ts` 等）：
- **資料放大器 (Data Multiplier)**：在記憶體中將情境池的範本傳票複製並賦予新的 UUID，瞬間展開成百萬筆資料。
- **記憶體防崩潰 (Batch Chunking)**：實作 `Array.from` 每批 10,000 筆為一個 Batch，使用 Prisma 的 `createMany` 進行分批寫入，直到 780 萬筆安全入庫。
- **✅ 管線解耦 DoD (Definition of Done)**：Julian 只要成功將資料灌入 DB（或產生 `db_dump_vouchers.json`），她的任務即達成 100%，並應立即停止後續動作，**絕對不可**觸發 `cross_validator.ts` 或讀取報表以免干擾核心開發。

---

## ⚡ 3. 輕量化 SQL 聚合與引擎重構 (Raw SQL Aggregation)

> **負責人**: Tzuhan (核心業務引擎與架構守門員)

當 780 萬筆明細躺在資料庫後，傳統把資料全部倒進 Node.js 計算的作法會引發嚴重的 OOM 崩潰。
- **O(1) 效能聚合**：未來 Tzuhan 將在核心報表引擎中，利用 `AccountUtil.isDescendantOf` 展開會計科目代碼陣列，再透過 `prisma.voucherLine.aggregate({ where: { accountingCode: { in: codes } } })`，直接讓 PostgreSQL 發揮強大的算力進行 SUM，徹底拔除 OOM 地雷。
- **期初餘額快照 (Monthly Snapshot)**：作為終極架構解法，利用排程把過去每個月的資料結算成一筆「期初餘額」，查詢時只算當月變動。

---

## ⚖️ 4. 絕對零容忍的審計盲測 (Zero Tolerance Auditing)

當一切建置完畢，我們將啟動升級版的 `cross_validator.ts`，這將是展示給台積電顧問公司的終極 Presales 武器：
- **廢除容錯**：廢除過去因應 OCR 雜訊所設定的 20% 容差率。
- **零誤差要求**：在純資料庫注入的環境下，要求**「營業收入、營業費用、折舊」**以及**「Scope 1, 2, 3 碳排噸數」**都必須是 **絕對的 0 誤差** (`system.equals(golden)`)。
- **會計鐵律**：搭配絕對剛性的三表勾稽恆等式 (A=L+E, IS淨利=BS盈餘=CF起點)，只要有任何一毛錢或一公克的落差，系統將直接亮紅燈 (`FAILED`)。

---

這套藍圖完美結合了 **Julian 的大數據管線火力** 與 **Tzuhan 的底層 OOM 防禦技術**。確保系統不僅懂半導體碳盤查，還能扛住海量憑證且帳務分毫不差！
