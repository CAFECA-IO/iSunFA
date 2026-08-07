# 重整之後報告裡的桑基圖全部不見

> **狀態**:🔵 2026-08-07 實作完成(自動保存 in-flight 保護 + 本機快取回寫修正),**待 Emily 驗證且尚未提交**

**Labels**: bug, carbon, P1
**回報**: 2026-08-07 UAT(Emily)
**分支**: 於 `feature/carbon_long_call_resilience` 上實測(圖表本身已可正確產出)

---

## 症狀

匯入報告後 3.6 的兩張桑基圖正常出現;**重新整理頁面之後圖全部消失**,
其餘段落內容還在。也就是說:不是「圖畫錯了」,是**圖沒有被保存下來**。

這與 8/6 那一輪修掉的問題是同一個家族 —— 畫面上看得到的東西,不代表它存在。
差別在這次遺失的是**已經產出的成果**:那些圖是 LLM 跑完 + 決定性引擎算完的產物。

## 這個模組有兩份「報告內容」,而圖只寫進其中一份的可能

報告預覽的渲染來源是(`carbon_report_preview.tsx:255`):

```ts
const markdownContent = reportData?.rawMarkdown ?? generateMarkdownFromParagraphs(...)
```

`rawMarkdown` 優先,沒有才由 `paragraphs` 組稿。而插入圖表時
(`use_carbon_chat.ts` 的 `insertChartIntoParagraph`)兩邊都寫:

```ts
const nextContent = insertCarbonChartBlock(target.content, templateId, block);
const nextRaw = reportData.rawMarkdown
  ? patchMarkdownSection(reportData.rawMarkdown, target.title, nextContent)
  : reportData.rawMarkdown;   // ← rawMarkdown 不存在時維持 undefined
```

兩份資料、一個渲染優先序,任何一份漏掉就會出現「重整前有、重整後沒有」。

## 根因假設(依可能性排序)

### 假設 1:草稿存不進去,因為密文超過 schema 的 2,000,000 字元上限

`CarbonReportDraftPutSchema` 的 `encryptedContent` 是
`z.string().min(1).max(2_000_000)`,而 `CarbonReportDataSchema.rawMarkdown`
也是 `max(2_000_000)`。

匯入整份盤查報告書之後,報告內容是 33 節逐字原文 + 原文表格
(下載出來 **153 頁**,見 `10_report_pdf_all_blank.md`)。
序列化 + ECIES/base64 之後極可能超過 2,000,000 字元 → PUT 被
`VL_SCHEMA_ERROR` 擋下 → 保存失敗。

而**圖表是流程最後才加上去的**(匯入落地 → 算 ledger → 插圖),
所以「最後那幾次保存失敗」的外顯症狀恰好就是「圖不見了,其他都在」。

同一個上限也可能讓本機快取失效:`saveLocalDraftBackup` 寫 localStorage
(配額約 5 MB),超出時丟 `QuotaExceededError` —— 那裡有 try/catch 只記 log,
所以**兩層保存都靜靜失敗**,而畫面上只有一個「保存異常」的狀態圖示。

**如何證實(最快)**:重整後開「編輯 Markdown」搜 `carbon-chart:` ——
- 找不到錨點 → 內容真的沒存進去,走假設 1/2。
- 找得到錨點但畫面沒圖 → 是渲染路徑,跳到假設 3。

再看 DevTools:PUT `/api/v1/chat/carbon/report` 的回應是否為 400 `VL_SCHEMA_ERROR`,
以及 console 是否有 `save local draft backup failed`。

### 假設 2:`patchMarkdownSection` 把圖附加到文末而不是 3.6

`patchMarkdownSection` 在**找不到標題時會把內容附加到文末**
(`use_carbon_chat.helpers.ts:311`),而它比對的是 `### ${paragraph.title}`。
匯入之後段落標題來自報告原文,若與 `rawMarkdown` 裡的標題有任何差異
(全形空白、編號寫法),圖就會被接到文件最後面而不是 3.6 —— 重整後
使用者在 3.6 看不到圖,而它其實在文末。

**如何證實**:重整後捲到 markdown 最末端,看有沒有孤立的 `### 3.6 …` + 圖。

### 假設 3:`MermaidChart` 在重整後的首次渲染沒有跑起來

圖由 `MarkdownContent` → `MermaidChart` 渲染。若渲染依賴 mermaid 的動態載入
與一個 effect,而重整後的內容是**一次性大量注入**(整份 153 頁),
可能出現渲染失敗或超時(每張 sankey 都要 layout)。
這條的特徵是:錨點與 mermaid 原始碼都在,但圖區空白或只剩程式碼。

**如何證實**:console 是否有 mermaid 的 parse/render 錯誤;
把該區塊單獨貼進 mermaid live editor 是否畫得出來。

## 修法方向(視根因)

- **假設 1**:上限不是拍板數字而是**設計問題** —— 一份完整的盤查報告書本來就會超過。
  兩個方向:(a) 把上限提高並同步 DB 欄位與前端(`@db.Text` 沒有 2MB 限制,
  那個數字是 schema 自己加的);(b) 內容分塊保存(逐節一筆,而非整份一筆)。
  **無論選哪個,保存失敗都必須讓使用者看得懂** ——
  現在的表現是一個小圖示,而代價是幾分鐘的 LLM 成果消失。
- **假設 2**:插圖改以 `paragraphId` 對位而不是標題字串比對;
  找不到目標時**拒絕並報錯**,不要靜靜接到文末(那是「看起來成功了」的又一例)。
- **假設 3**:圖表區塊改為逐一延遲渲染,或在渲染失敗時顯示原始碼與原因。

## 驗收

- [ ] 匯入 → 產圖 → 重整,3.6 的兩張圖仍在原位
- [ ] 保存失敗時使用者看得到明確訊息(不是只有一個圖示),且說得出「哪一段沒存進去」
- [ ] 內容超過上限時有明確行為(切塊或明確拒絕),不會靜默丟失
- [ ] 本機快取超出配額時同樣不靜默
- [ ] 加一條回歸測試:含圖表區塊的 reportData 存檔 → 讀回 → 錨點與 mermaid 區塊完整

## 備註

這一票與 `10_report_pdf_all_blank.md` 很可能是**同一個根**:
匯入之後報告的體積跨過了好幾個當初沒有預期的門檻
(canvas 高度上限、schema 2MB、localStorage 配額)。
建議一起查,並在該票確認之後補上一句共同結論。
