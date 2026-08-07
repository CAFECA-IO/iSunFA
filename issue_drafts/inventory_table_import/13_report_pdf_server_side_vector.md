# 溫盤報告改走伺服端向量列印(PDF 內文字可搜尋)

> **狀態**:📋 2026-08-07 開票,未排程

**Labels**: enhancement, carbon, pdf, P1
**開票**: 2026-08-07(Emily)
**前置**: `10_report_pdf_all_blank.md` 已以「護欄 + 分段快照」修掉 P0 的靜默空白;
本票處理它**沒有**解決的那一半

---

## 為什麼還需要這一票

10 那票選了選項 B(分段光柵化):153 頁的空白 PDF 不再出現,長報告印得出來了。
但產出仍是**光柵圖**,於是兩件事仍然不成立:

1. **PDF 內文字不可選取、不可搜尋。** 查證人員要能在 153 頁裡搜「表3.8」——
   10 那票自己寫了「對審計文件來說這不是加分項而是基本要求」。B 交不出這一項。
2. **檔案體積。** 7/31 運輸報告那票量過:一頁 A4 文字在可讀 DPI 下就是 60~150 KB,
   那是編碼下限。153 頁即十幾 MB,寄不出去也存不進附件。

換句話說:**B 讓功能可用,A 才讓它合格。** 這張票如果不排,B 會因為「能用了」而變成永久狀態。

## 已經有的基礎(不必從零開始)

7/31 為運輸報告建過同一條路,可直接沿用的部分:

- `src/services/logistics_report_pdf.service.ts`(330 行):puppeteer 單一實例批次列印、
  頁尾頁碼與來源代碼、`LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST` 節流
- `src/lib/utils/pdf_font_probe.ts` + `src/constants/pdf_font.ts`:
  CJK 字型覆蓋率探測與 `IS000022` fail fast(見 known_issues/pdf_cjk_font_missing.md)
- `/api/v1/transportation_carbon_footprint_calculator/report_pdf/route.ts`:
  純端口 + schema 拒絕時記錄違規欄位路徑的慣例

## 真正的工作在渲染管線,不在 puppeteer

溫盤報告與運輸報告的差別是**內容怎麼來的**:

| | 運輸報告 | 溫盤報告 |
|---|---|---|
| 內容來源 | 結構化資料 → `buildLogisticsReportHtml` | markdown → `MarkdownContent` 元件 |
| 樣式 | HTML builder 內嵌 | `PDF_PRINT_STYLE` + Tailwind class |
| 圖表 | 無(靜態地圖 base64) | mermaid 桑基圖/流程圖,**瀏覽器端才畫得出來** |

三件要處理的事:

1. **列印用 CSS**:目前樣式散在 `PDF_PRINT_STYLE` 與 Tailwind utility class 中,
   伺服端沒有 Tailwind runtime。需要一套自足的列印樣式表,
   且必須與畫面預覽**可對照** —— 兩條路徑產出長得不一樣的文件,
   比一份醜的更糟(查核者會問哪一份才算數)。
2. **mermaid 的伺服端渲染**:把 mermaid 載進 puppeteer 頁面、注入區塊、
   等 `mermaid.run()` 完成再 `page.pdf()`。要有明確的逾時與失敗行為 ——
   圖畫不出來時應該留下原始碼與原因,不是留一塊空白
   (與 `carbon_report_diagram` 的護欄同一哲學)。
3. **限流**:每份報告都要跑一次 Chrome 排版。依 `rate_limiting_guideline.md`,
   這屬於 `UPLOAD` 等級的成本,需選 bucket 並在 route 呼叫 `enforceCarbonRateLimit`。

## 維運前置條件(不是程式問題,但會擋上線)

每台產出 PDF 的主機都必須 `apt install fonts-noto-cjk` 並重啟。
缺字型時 Chrome 對所有中文使用 `.notdef`,報告會變成整片空心方框。
`IS000022` 的 fail fast 已經在,所以缺字型會是**明確失敗**而非破圖 ——
但那仍是一次上線失敗。見 `known_issues/pdf_cjk_font_missing.md`。

## 切換策略

不要一次砍掉 B。建議:

1. 伺服端端點先與現有下載並存,以參數或旗標選擇
2. 兩條路徑對同一份報告產出後逐頁比對(文字內容、頁數、表格分頁位置)
3. 確認一致後,溫盤報告的下載切到伺服端;`PdfEditor` 的分段路徑保留給
   任務板/文件工具那些沒有伺服端樣板的呼叫點

## 驗收

- [ ] 匯入完整報告後下載,PDF 內容與畫面預覽一致(逐節文字、原文表格、圖表都在)
- [ ] PDF 內文字可選取、可搜尋 —— 能搜到「表3.8」
- [ ] 153 頁報告的檔案大小低於 2 MB(對照:光柵版十幾 MB)
- [ ] mermaid 圖渲染失敗時留下原始碼與原因,不留空白
- [ ] 缺 CJK 字型的主機上以 `IS000022` 明確失敗,不產出方框檔
- [ ] 新端點有限流,且超限回應可被前端辨識(注意 `httpStatusOf()` 的已知缺陷)
