# ADR 012: Laria 真實 Reed-Solomon Erasure Code(純 TS 零依賴)

- 狀態:Accepted
- 日期:2026-07-15
- 作者:Emily
- 關聯:GitHub issue #6514;`src/lib/laria.ts` 既有 ToDo(20251028 - Luphia)

## 背景

Laria 分片儲存(5 data + 3 parity)自 2025-10 起使用佔位的模擬 `ReedSolomonErasure`:`encode` 將 parity 切片直接填零、`reconstruct` 將遺失切片填零。實際冗餘能力為 **0** — 任一資料切片遺失,恢復流程會**靜默回傳零填充的損毀資料**。企業附件(能源帳單、BOM 表等稽核佐證)倚賴此假冗餘,屬上市紅線。

## 決策

**自建純 TypeScript GF(2^8) Reed-Solomon,不引入外部庫**,落地於 Luphia 預留的模組路徑 `src/lib/reed_solomon_erasure.ts`。

### 演算法

- GF(2^8),不可約多項式 `0x11d`,log/exp 表 + 完整 64KB 乘法查表(熱路徑單次查表)
- 系統生成矩陣 `[I(k); Cauchy(m×k)]`,`C[j][i] = 1/((k+j) ⊕ i)`;Cauchy 矩陣任意方子陣非奇異 → 任取 k 列必可逆,數學上保證任意 ≤ m 個切片遺失皆可精確重建
- 重建:對存活切片對應之 k 列做 GF Gauss-Jordan 求逆,矩陣乘回原始資料切片,再重算遺失 parity

### Spike benchmark(選型依據,Node v22 / arm64)

| 操作(5+3、4MB 切片 = 20MB stripe) | spike 原型 | 生產模組實測 |
|---|---|---|
| encode(算 3 個 parity) | ~73 ms | ~112 ms |
| reconstruct(最壞:3 個資料切片全失) | ~75 ms | ~139 ms |
| 正確性 | 200 回合隨機抹除 bit-perfect | 100 回合 bit-perfect;抹 4 個正確報錯 |

50MB 檔案(上限)≈ 3 stripes ≈ 350ms 總 CPU,stripe 間有檔案 I/O 天然讓出 event loop,另在 encode/reconstruct 前主動 `setImmediate` 讓出。**不需要 worker_threads,也不需要 WASM/native 庫**。

### 為何不用外部庫

1. 效能已達標,庫的邊際效益為零(瓶頸在網路上傳,不在編碼)。
2. N-API native binding 的 segfault 會帶走整個 Node process(穩定性紅線);WASM 候選庫多屬低維護狀態(供應鏈風險)。
3. 零依賴:PR checklist 維持 new Library: 0;演算法 ~200 行,含 property-based 測試,可完全自主審計 — 符合本專案「決定論防護」哲學。

## 舊檔相容策略(無資料遷移)

metadata 新增 `rsVersion: 2` 與全檔 `sha256`:

| 檔案 | 資料切片齊全 | 缺資料切片 |
|---|---|---|
| v2(真 parity) | 直讀 + sha256 驗證 | RS 重建 + sha256 驗證 |
| 舊檔(無 rsVersion,parity 為零) | 直讀(行為不變) | **顯式失敗**,要求重新上傳 |

舊檔缺片從「靜默回傳損毀資料」變為「明確報錯」,本身即是修復。sha256 補足 RS 的盲點(RS 只能補遺失,無法偵測內容竄改);`storage.service.recoverLaria` 同步改為容忍 ≤3 個切片下載失敗(過去任一下載失敗即整體中止,冗餘形同虛設)。

## 後果

- `laria.ts` 介面不變;`encodeFile` 改為 Fail Fast(錯誤不再吞噬);`storage.service.ts` 切片數改引 `TOTAL_SHARDS` 常數
- 前端若有對應切片實作(「與前端同步」註解),需另行對齊 v2 編碼 — 追蹤於後續 issue
- FHE 攔截點(fhe_privacy_preserving.md)仍在 laria 寫入前,本變更不影響其規劃
