# 知識庫文章 02: 自動沖銷架構：從「應計基礎」到「現金流」的完整閉環

> **Date**: 2026-05-20
> **Author**: Tzuhan
> **Category**: 數位審計知識庫 (Digital Audit Knowledge Base)
> **Tags**: `Reconciliation`, `Accrual Basis`, `Web3 Audit Trail`

## 1. 兩階段憑證流轉（應計對齊）與 Double-Counting 陷阱

在複式簿記 (Double-Entry Bookkeeping) 中，最致命的錯誤之一就是「重複加總 (Double-counting)」。
當系統收到一張「AWS 雲端主機繳費通知單」，隨後又收到一張「信用卡扣款收據」時，如果系統只是單純將兩者都解析為費用，就會導致費用被認列兩次，淨利被嚴重低估。

**我們的解法：Enum 強制約束與階段流轉**
1. **應付階段**：系統將尚未發生現金流的合約、未繳費通知單，在 Schema 層級強制鎖死為 `DocumentType.ACCRUAL_NOTICE`。此時 AI 無法將其認定為現金流出，貸方被鎖定在負債科目（如 `2200 其他應付款`），且交易類型必為 `TRANSFER`。
2. **支付階段**：當實際的現金流收據抵達，系統將其標記為 `DocumentType.PAYMENT_RECEIPT`。

## 2. Eventual Consistency 批次 FIFO 沖銷與時序悖論 (Temporal Paradox)

為了解決這兩張憑證的關聯，我們實作了強大的 `ReconciliationService`。

### 時序悖論 (Temporal Paradox) 與解法
在去中心化的非同步架構中，多個任務執行器 (Executor) 平行處理單據時，極易引發「時序悖論」：
如果我們在寫入單張 `PAYMENT_RECEIPT` 時「同步阻斷」去尋找 `ACCRUAL_NOTICE`，當同一個供應商的多筆收據同時湧入時，會導致資料庫嚴重的鎖爭用 (Lock Contention) 與 Race Condition，導致同一張未付帳單被重複沖銷。

因此，我們將沖銷機制升級為**「延遲綁定與最終一致性 (Late Binding & Eventual Consistency)」**：
1. **雙向等待 (Bi-directional Wait)**：收據進入資料庫時，不立即執行同步沖銷，而是先安全地記錄。
2. **池化配對 (Pool Matching)**：系統在背景批次 (Batch) 或事件驅動下，針對同一個 `vendorTaxId` 拉出所有未付應付帳款與未沖銷收據。
3. **依據實體交易日重新排序**：完全摒棄不穩定的網路抵達時間，改為嚴格按照發票上的 `tradingDate ASC` 進行記憶體內雙指標配對 (Two-Pointer Matching)。

### 密碼學綁定
- 一旦在池化中配對成功，系統將產生沖銷分錄（借：其他應付款，貸：銀行存款）。
- 雙向綁定：將原本未付傳票的狀態改為 `PAID`，並寫入 `clearedByVoucherId = <當前收據傳票ID>`，完美實現應計基礎到現金流的閉環。

## 3. 鏈上與鏈下狀態同步 (Web3 ITAC)

在 iSunFA 系統中，資料庫的寫入只是防護的第一步。為了符合 Web3 級別的去中心化信託標準，我們實作了更深層的狀態同步。

當 `ReconciliationService` 完成 `clearedByVoucherId` 的關聯綁定後：
1. 任務執行器 (Executor) 會將這筆經過核銷的最終結果（包含雙向綁定的 ID 陣列），進行 Hash 運算。
2. 透過呼叫智能合約 `mission_board.sol` 的 `submitResult` 方法，將這個 Result CID 錨定至區塊鏈上。

**合規效益**：
這在鏈上留下了一道「無法被 DBA 或特權帳號竄改」的沖銷內控軌跡（ITAC）。未來的審計人員可以完全信任這筆費用並未被重複認列，因為它的生命週期與核銷軌跡已經受到以太坊等級的安全背書。
