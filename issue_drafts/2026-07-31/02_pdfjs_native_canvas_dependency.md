# Tech debt: 純文字抽取被原生繪圖綁定綁架(pdf-parse → @napi-rs/canvas)

> **狀態**:🔴 完全未動 —— `pdf-parse` 仍在依賴樹,`unpdf` 未評估。依據:`2026-08-04_retrospective.md`

**Labels**: tech-debt, carbon, P2

## 事實

pdfjs 的 Node 分支**無條件** `require("@napi-rs/canvas")`,而且是在檢查 `globalThis.DOMMatrix` **之前**(原始碼:`pdfjs-dist/legacy/build/pdf.mjs` 的 `node_utils.js` 區段):

```js
if (isNodeJS) {
  let canvas;
  try { canvas = require("@napi-rs/canvas"); } catch (ex) { warn(...); }
  if (!globalThis.DOMMatrix) { ... }   // ← 檢查在 require 之後
}
```

沙箱實測(linux/x64)的四種組合:

| 條件 | 結果 |
| :--- | :--- |
| 單獨 `import("@napi-rs/canvas")` | **SIGBUS(core dump)** |
| pdfjs + canvas 可解析 | SIGBUS |
| pdfjs + canvas 不存在 | `ReferenceError: DOMMatrix is not defined`(模組頂層 `new DOMMatrix()`) |
| pdfjs + 無 canvas + 自備 10 行 DOMMatrix/ImageData/Path2D stub | **成功:64 頁 / 52,148 字 / 815 字每頁** |

## 為什麼要處理

1. **抽文字不需要繪圖。** 我們只呼叫 `getText` / `getTextContent`,canvas 純粹是為了補 DOM 幾何型別。最後一列證明繞開它完全可行,結果與 `pdftotext` 交叉驗證一致。
2. **原生 `.node` 是部署面的單點故障。** 平台/架構/libc 任一不符就整條管線失效,而且失敗形式可能是**不可 try/catch 攔截的 SIGBUS**——降級邏輯根本沒有機會執行。本機目前正常(darwin/arm64 有預編譯),但這是運氣,不是設計。
3. 它與 Vercel 部署疊加風險:`serverExternalPackages` 讓套件不被打包,代價是必須在執行環境真的存在可用的原生二進位。

## 選項

| 方案 | 代價 |
| :--- | :--- |
| **`unpdf`**(建議評估):專為 serverless 打包的無原生依賴 pdfjs,直接提供 `extractText` | +1 library;需驗證 `cellSeparator` 等價能力(表格儲存格結構是我們的硬需求) |
| 自備 DOMMatrix stub + 直接用 pdfjs-dist | 只要 `@napi-rs/canvas` 仍在依賴樹中就會被 require,除非能移除 pdf-parse |
| 維持現狀 | 每個新部署環境都要賭原生二進位可用 |

## 驗收

抽取路徑不再依賴任何原生綁定;對高興昌那份報告的抽取結果(頁數、字數、頁標記、`cellSeparator` 的表格結構)與現況等價,`src/__tests__/pdf_text_layer.test.ts` 全綠。

## 註

ADR 014 先前記載「pdfjs legacy build 會 core dump」是歸因錯誤,已於 `cc9ee712f` 更正為本 issue 的內容。
