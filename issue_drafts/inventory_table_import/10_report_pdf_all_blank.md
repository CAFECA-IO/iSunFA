# 下載報告:153 頁 PDF 全部空白

> **狀態**:🔵 2026-08-07 實作完成,**待 Emily 驗證且尚未提交**。分段光柵化 + 空白偵測;實測推翻過三版(座標語意、降採樣、貼圖取整)

**Labels**: bug, carbon, pdf, P0
**回報**: 2026-08-06 UAT(Emily)
**影響範圍**: 溫盤報告的「下載 PDF」;`PdfEditor` 為共用元件,任務板/文件工具的下載走同一條路

---

## 症狀

匯入整份盤查報告書(33 節逐字內容 + 原文表格)之後按「下載 PDF」,
**檔案下載成功、頁數 153 頁,每一頁都是空白**。

這是本輪最嚴重的一個:**「輸出成功」與「輸出正確」在畫面上完全同形**。
使用者拿到的是一份看起來完整的 153 頁檔案 —— 在審計場景裡,
一份 153 頁的空白 PDF 比一個明確的失敗訊息危險得多。

## 為什麼是現在才壞

匯入功能上線前,報告只有骨架(33 個標題 + 少量內容),PDF 大約十幾頁。
匯入之後整份 64 頁報告書的逐字內容進到同一份文件,輸出膨脹到 153 頁 ——
**這個 bug 極可能一直都在,只是先前沒有大到觸發它。**

## 根因假設(依可能性排序)

### 假設 1:canvas 尺寸超過瀏覽器上限(最可能)

`src/components/pdf_tool/pdf_editor.tsx` 的 `handleDownloadPDF` 用 `html2pdf.js@0.14`
(內部 `html2canvas@1.4.1`)把**整份文件一次**光柵化成一張 canvas,再切頁貼進 jsPDF。

設定是 `html2canvas: { scale: 2 }`,而 153 頁 A4 的高度:

```
153 頁 × 約 1123 px/頁(96dpi A4)× scale 2 ≈ 343,000 px
```

Chrome 的單張 canvas 高度上限 65,535 px、總面積上限約 2.68 億 px²
(Safari 更低)。超過上限時 `getContext('2d')` 並不會拋錯 ——
**它給你一張尺寸正確但完全空白的 canvas**。頁數正確、內容全空,正是這個形狀。

**一分鐘可證實**:在 `handleDownloadPDF` 內把 `scale` 改成 `1` 或 `0.5` 再下載一次。
若頁面開始出現內容(即使模糊),假設 1 成立。
或在 html2canvas 的 `onclone` / 產出後印 `canvas.width × canvas.height` 與
`canvas.toDataURL().length`(空白 canvas 的 dataURL 會極短)。

### 假設 2:oklch 色彩讓所有文字被畫成透明

8/2 的深色模式把整套 palette 換成 Tailwind v4 的 `oklch()`
(`src/app/globals.css` 有 28 處)。`pdf_editor.tsx` 有一段
`getComputedStyle` 的 Proxy 專門把 `lab/lch/color()` 換成安全值,
但它只攔 **`getPropertyValue`** 這個方法;html2canvas 內部也有直接讀屬性
(`styles.color`)的路徑,那些讀取拿到的仍是原始 `oklch(...)`,
而 1.4.1 的色彩 parser 不認識 oklch → 解析為 `transparent`。

若成立,症狀會是「版面在、文字不在」。**與假設 1 的區別**:
假設 2 的頁面會留下有色區塊(表格線、橘色標籤),假設 1 是**純白**。
Emily 描述「全部空白」偏向假設 1,但兩者可能同時存在。

### 假設 3:快照抓到的容器是被 `hidden` 的那一半

8/5 把 `PdfEditor` 從 `layout="split"` 改成 `layout="toggle"`
(`carbon_report_preview.tsx`),而預覽容器在抽屜開啟時帶 `hidden xl:block`。
若下載時 `#pdf-content` 位於 `display: none` 的子樹內,html2canvas 會得到
高度 0 或未排版的內容。**這條的反證很簡單**:頁數是 153 而不是 1 頁,
說明高度算得出來 —— 可能性最低,但要排除。

## 修法選項

### 選項 A:改走既有的伺服端向量列印(建議)

專案在 7/31 已經為運輸報告建好這條路:
`src/services/logistics_report_pdf.service.ts` + `/api/v1/…/report_pdf`,
用 puppeteer 驅動 Chrome 列印。當時的動機與現在完全同一個
(見該檔頭:「前端光柵化的 PDF 開了壓縮仍 500 KB,一頁 A4 文字在可讀 DPI 下就是
60~150 KB,那是編碼下限」)。

改走這條路一次解決三件事:沒有 canvas 尺寸上限、文字可選取可搜尋、檔案小一個數量級。
**對審計文件來說「PDF 內的文字可搜尋」不是加分項而是基本要求** ——
查證人員要能在 153 頁裡搜「表3.8」。

代價:溫盤報告的樣式要能在 server 端重建(目前 PDF 樣式來自
`PDF_PRINT_STYLE` 與 Tailwind class),需要一套列印用 CSS。工作量中等。

### 選項 B:分段快照後逐頁拼接

保留 html2pdf,但改為每 N 個段落各自 `html2canvas` 一次,再 `addImage` 逐頁貼。
繞開單張 canvas 上限,改動集中在 `handleDownloadPDF`。
代價:仍是光柵圖(文字不可搜尋、檔案大),且跨段落的表格分頁要自己處理。

### 選項 C:先加護欄(不論選 A 或 B 都該做)

**現在最不能接受的不是輸出不了,是靜靜地輸出 153 張白紙。**
產出後檢查 canvas 是否為空(尺寸超限或 dataURL 過短)→ 明確報錯,
並在 UI 說出「報告太長,請改用 X」。這條可以獨立於根因先上。

## 驗收

- [ ] 匯入完整報告後下載,PDF 內容與畫面預覽一致(逐節文字、原文表格都在)
- [ ] PDF 內文字可選取、可搜尋(若採選項 A)
- [ ] 頁數與內容量相符,無空白頁
- [ ] 極長報告(> 150 頁)不再靜默輸出空白:要嘛成功,要嘛明確報錯
- [ ] 深色模式下下載的 PDF 仍是淺色可讀版面(oklch 那條路順便驗)

## 待收集

- 下載時 DevTools console 的完整輸出(是否有 html2canvas 的警告)
- 產出 canvas 的 `width × height`
- `scale: 1` 時是否恢復(這一項幾乎就能定案)
