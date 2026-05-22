# 架構決策紀錄 (ADR) 005: Master Data Governance and Isolation Strategy (主檔資料治理與隔離策略)

> **Date**: 2026-05-21
> **Author**: Tzuhan
> **Status**: 🚫 Canceled (Superseded by ADR 006 Two-Turn RAG)
> **核心目標**: (本決策已被撤銷) 定義「外部映射雜訊 (Vendor MDM)」與「內部審計真理 (ESG Coefficients)」的物理儲存與治理邊界。其中 Vendor MDM SQLite 的構想因違背動態 RAG 精神，已被 ADR 006 動態兩回合檢索全面取代。

---

## 🛑 1. 當前架構挑戰 (Context)

系統即將面臨海量主檔資料的導入：
1. **財政部全國營業登記資料集**：高達 150 萬筆台灣廠商與其所屬行業代號。
2. **國際官方碳排係數庫**：來自環境部、US EPA、UK DEFRA 等總計數萬筆的碳排因子。

若將這兩類截然不同的資料全數塞進單一的 PostgreSQL 主資料庫，將引發災難：
- 150 萬筆廠商雜訊會撐爆連線池與 B-Tree 索引，拖垮日常交易的寫入效能。
- AI Worker 將被迫頻繁呼叫 DB，破壞「無狀態 (Stateless)」與「Zero DB I/O」的無限擴展性鐵律。
- 若為了解耦而將 ESG 係數移出關聯式資料庫，又會破壞審計要求的「外鍵完整性 (Referential Integrity)」，導致財務與碳排無法歷史溯源。

---

## 🎯 2. 決策一：Vendor MDM 定義為「外部映射雜訊」 (Local Static Reference Architecture) [🚫 Canceled]

**舊版構想 (現已廢棄)**：將 150 萬筆政府開放資料萃取為 `[branch_tax_id, industry_code]`，打包為唯讀 `tax_reference.sqlite`，執行期進行微秒級的本機檢索並強制對應行業代號。

**廢棄與更新原因 (Superseded by ADR 006)**：
1. **資料時效性痛點**：台灣公司登記資訊並非靜態不變，每個月會有上千筆的新增、註銷與變更。要維護這份 SQLite 字典會帶來無謂的 ETL 維運成本。
2. **大型集團的類型誤判 (Conglomerate Fallacy)**：單憑統編對應單一「行業代號」會引發嚴重的靜態誤判。例如「統一集團」若在 SQLite 內直接被判為「農業與食品」，但其旗下憑證可能涵蓋「包裝耗材」、「物流配送服務」等完全不同屬性的碳排活動。
3. **終極解決方案 (動態 RAG)**：理想做法已於 ADR 006 實作。系統不再依賴死板的政府行業代號降維，而是透過「已經分析好的日記帳內容 (交易明細)」，交由 AI 進行 Turn 1 分析：「這是什麼活動？」。由 AI 讀取交易脈絡來決定該套用什麼碳排類別，徹底消滅了靜態對應的謬誤。

---

## 🎯 3. 決策二：ESG Coefficients 定義為「確信審計真理」 (PostgreSQL Relational Core)

**決策：碳排係數是審計的法源依據，必須寫入 PostgreSQL 主庫，並強制實施外鍵約束與時空快照。**

- **外鍵鐵律 (Foreign Key Integrity)**：`EsgRecord` 必須關聯至 `Coefficient` 表。Big 4 審計員必須能透過 `JOIN` 重現當年的排碳真理。
- **Append-Only 時空快照**：嚴禁執行 `UPDATE`。歷史帳本透過 Immutable ID 鎖定當年的係數版本（如 `versionYear: "2024"`），即使官方參數調整，也不會污染歷史帳本。
- **實體隔離 (Tenant Isolation)**：官方標準係數強制標記 `accountBookId: null`，與租戶自訂係數（具備 UUID）完全實體隔離。

---

## 📊 4. 決策效益總結 (Consequences)

1. **極致效能**：Postgres 僅保留高價值的審計真理，免受百萬筆雜訊污染。
2. **無狀態擴展**：Worker 僅客觀萃取統編，複雜的行業降維交由後端 Backend Local SQLite 瞬間秒殺。
3. **絕對合規**：碳盤查四大地雷完全解除，完美符合 CPA 確信標準與系統自動控制 (ITAC)。
