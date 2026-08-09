# Bug: 運輸碳足跡報告匯出的 PDF 超過 20 MB(應在 100 KB 以下)

> **狀態**:🟡 程式碼已修,**待本機量測** `pixelRatio`。依據:`2026-08-04_retrospective.md`

**Labels**: bug, performance, transport-calculator, P1
**Branch**: `fix/transport_pdf_export_size`(自 **`feature/transport_multimodal_extension`** 切出,獨立 PR)

> 基底不是 develop:develop 上的 `pdf_export.ts` 是舊版(檔名還是 `route_1_...`,沒有方案代碼)。
> 匯出功能的現行程式碼在未合併的 `feature/transport_multimodal_extension`(領先 develop 8 個 commit),
> 從 develop 切會與它在 `pdf_export.ts`、`logistics.ts` 兩處必然衝突。

## 現象

`/transportation_carbon_footprint_calculator` 匯出單一方案的 PDF **> 20 MB**。批次匯出十條路線就是 200 MB 級的 zip,使用者實務上無法寄送。

## 根因:jsPDF 未開啟壓縮,PNG 被當成未壓縮的原始 RGB 存進 PDF

`captureElementToPdf` 目前這樣建立文件:

```ts
const pdf = new jsPDF("p", "mm", "a4");   // ← 沒有 compress
pdf.addImage(dataUrl, "PNG", ...);         // ← PNG dataURL
```

jsPDF 會把 PNG **解碼**後寫入影像串流。沒有 `compress` 就等於**逐像素原始 RGB**:

```
1600 × 4800 × 3 bytes = 23,040,000 bytes ≈ 22.5 MB
```

實測完全吻合(以一張模擬報告截圖,1600×4800,pixelRatio 2):

| 設定                        | 來源 PNG |      產出 PDF |
| :-------------------------- | -------: | ------------: |
| 現況(`compress` 未開)       |   126 KB | **22,504 KB** |
| **`compress: true`**        |   126 KB |    **138 KB** |
| JPEG q70(`compress` 無影響) | 1,195 KB |      1,198 KB |

三個結論:

1. **`compress: true` 就是修正**,同一張圖 22,504 KB → 138 KB(**163 倍**)。開了壓縮之後 PDF 大小約等於來源 PNG 大小(+9% PDF 結構開銷)。
2. **不要改用 JPEG。** JPEG 以 DCTDecode 原樣嵌入(PDF ≈ JPEG 大小),但報告是白底 + 文字 + 一塊地圖,PNG 的無損壓縮在這種內容上**遠優於** JPEG,而且不會讓文字邊緣產生振鈴。這是反直覺但可量測的:上表 JPEG 比 PNG 大了近 9 倍。
3. **多頁不是問題。** 現行程式碼在每一頁重複 `addImage` 同一張 dataURL,原本懷疑是 N 倍膨脹,實測 1 頁 22,503 KB / 8 頁 22,506 KB —— jsPDF 有影像快取,只嵌入一次。**這個懷疑是錯的,不必改。**

## 修正

- [x] `new jsPDF({ ..., compress: true })`
- [x] 截圖參數(`pixelRatio`、`quality`)抽成 `src/constants/logistics.ts` 的具名常數,附上「這兩個值直接決定檔案大小」的註解;原本是散在函式裡的裸數字
- [x] 匯出後量測實際大小,超出預算時 `console.warn` 明確報出(檔名 + 實際 KB + 預算 KB),不讓體積回歸再次無聲發生
- [x] `src/__tests__/pdf_export.test.ts`:以真實 jsPDF 產生文件,斷言未開壓縮的原始 RGB 體積推算、以及開啟後的實際落點
- [x] **消滅第三份複製貼上**:`page.tsx` 的單筆匯出自帶一份「截圖 + 分頁」邏輯(JPEG q0.8、同樣沒開 compress、且以硬編碼 `elWidth = 1024` 推算高度),改為呼叫共用的 `captureElementToPdf`。這是當初抽出共用函式時漏掉的一段,分歧的後果是批次與單筆的體積、畫質都不一致,修一邊不會修到另一邊
- [x] 截圖補 `backgroundColor: "#ffffff"`:PNG 保留透明區,原 JPEG 路徑本來就指定白底,換 PNG 後必須補回

## 為什麼加大小護欄而不只是修一行

這個 bug 之所以能長到 20 MB 沒被發現,是因為**沒有任何東西在看檔案大小**。修一行只解決今天這一張圖;體積是這個功能的品質指標,應該有斷言。預算設 `PDF_EXPORT_SIZE_BUDGET_BYTES = 100 * 1024`,超出即警告(不阻擋下載——寧可給出過大的檔案,也不要讓使用者拿不到報告)。

## 尚待本機驗證

`pixelRatio` 對最終大小的影響**無法在沙箱預測**:我用合成圖測出「縮小反而變大」,但那是因為合成圖的假文字是硬邊方塊,重採樣後反而增加熵;真實瀏覽器在 pixelRatio 1.5 下是**直接以該解析度渲染帶反鋸齒的文字**,不是把 2× 的圖縮下來。

所以請在本機匯出一次,看 console 的實際 KB:

- 若已 < 100 KB → 收工,`pixelRatio` 保持 2(清晰度優先)
- 若 100~300 KB → 把 `PDF_EXPORT_PIXEL_RATIO` 降到 1.5 再測(A4 上約 130 DPI,文字仍清晰)
- 若仍 > 300 KB → 代表報告頁很長或地圖佔比高,需要下一階段:**文字向量化**(見下)

## 下一階段(獨立 issue,先不做)

要**穩定**壓在 100 KB 以下,正解是不要把文字光柵化:文字走 PDF 向量字型,只有地圖是影像。兩條路都有代價,需先確認上面的量測結果是否真的需要走到這一步:

| 方案                                            | 代價                                                                                             |
| :---------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| jsPDF 文字 API                                  | 中日韓字型 jsPDF **不做子集化**,會嵌入整份 TTF(5–15 MB),反而更大                                 |
| pdf-lib + `embedFont(..., { subset: true })`    | 只嵌入用到的字符(數 KB),但前端要下載字型檔                                                       |
| 伺服端 puppeteer 列印(`puppeteer` 已是既有依賴) | Chrome 自動子集化、輸出向量,檔案通常數十 KB;代價是新增 API 與伺服器 CPU,且地圖仍須由前端截圖上傳 |
