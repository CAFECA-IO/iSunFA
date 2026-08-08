# Bug: PDF 文字層在 Next 執行環境抽不出來,靜默降級成視覺模型

> **狀態**:🟡 程式碼已修,**待本機驗證** `decision=text`。依據:`2026-08-04_retrospective.md`

**Labels**: bug, carbon, P1
**Branch**: `feature/esg_report_ingestion`(修正已含)

## 現象

匯入盤查報告時伺服端記到:

```
{"decision":"vision","reason":"text_layer_unavailable","charsPerPage":0}
```

品質閘門的預期裁決是 `text`(見 ADR 014 第四節實測表),實際卻走了視覺模型。

## 為什麼這是 P1 而不是效能問題

降級的代價不是多花 token,是**內容失真**:

| | 文字層 | 視覺降級 |
| :--- | :--- | :--- |
| 內容忠實度 | 逐字照抄 | AI 改寫(實測 1.1 節 23 條經營沿革**全數消失**) |
| 頁碼索引兩階段 | 生效 | **失效**(切片需要文字層的頁標記) |
| 表格欄位歸屬 | `cellSeparator` 保留 | 依賴模型自行判讀 |

而且原因被 `catch { return null }` 整個吞掉,只留下一句代碼字串——差異這麼大的分岔卻沒有可查的理由。

## 定位過程

`scripts/probe_pdf_text_layer.ts` 在 Next 之外逐段走同一條載入鏈。本機(darwin/arm64,node v22.13.1)結果:

```
✓ @napi-rs/canvas 載入成功,DOMMatrix 可用
✓ pdf-parse 模組載入
✓ extractPdfTextLayer  64 頁 / 53,234 字 / 832 字每頁 / 解碼失敗 0
✓ 品質閘門裁決  decision=text reason=text_layer_clean
✓ 頁標記  找到 64 個
```

**在 Next 之外一切正常** → 抽取邏輯與這份檔案都沒問題,問題出在 Next 打包:`pdf-parse` 動態載入 pdfjs 與原生 `.node`(`@napi-rs/canvas`),被 bundler 處理過即失效。

## 修正

- [x] `next.config.ts` 的 `serverExternalPackages` 加入 `pdf-parse`
- [x] `extractPdfTextLayer` 的 catch 改 `logger.error` + `describeError`,不再吞錯
- [x] 新增 `scripts/probe_pdf_text_layer.ts`(三種成因分流:原生綁定 / 打包 / 檔案本身)
- [ ] **重啟 dev server 後重新匯入,確認 `decision=text`**(需本機驗證)

## 驗收

匯入同一份報告時伺服端記到 `decision: "text"`、`charsPerPage` 約 832、64 個頁標記;1.1 節出現原文的 23 條沿革(而非 AI 改寫的公司簡介),且頁碼索引兩階段生效。

## 後續(獨立 issue)

降級發生時**使用者看不到**。匯入預覽應揭露來源模式與失真警告——見 ADR 014 待辦 #2。
