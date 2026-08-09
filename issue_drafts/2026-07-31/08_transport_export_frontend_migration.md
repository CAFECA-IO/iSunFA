# Refactor: 運輸報告匯出改走伺服端向量列印(前端遷移)

> **狀態**:🟡 步驟 1 完成(純函數 + API);**步驟 2/3/4 未做**,前端仍走光柵路徑。依據:`2026-08-04_retrospective.md`

**Labels**: refactor, transport-calculator, performance, P1
**Branch**: `fix/transport_pdf_export_size`(接續 issue 07)
**依賴**: issue 07 已完成伺服端管線(`de50f1b80`),本 issue 只處理前端接線

## 為什麼要改(不只是檔案大小)

issue 07 修掉 jsPDF 未開壓縮的 bug 後,單份 PDF 從 22.5 MB 降到 **500 KB**——但目標是 100 KB,而且降不下去了:**一頁 A4 的文字在可讀 DPI 下就是 60~150 KB,那是編碼下限,不是參數沒調好**。要穩定壓在 100 KB 以下,只能不把文字光柵化。

但「檔案變小」只是最表面的理由。真正的收益有四項:

|                     | 現況(前端光柵化)                  | 伺服端向量列印                    |
| :------------------ | :-------------------------------- | :-------------------------------- |
| 體積                | 500 KB / 份,27 份 12.9 MB         | 預估數十 KB / 份                  |
| **文字可選取/搜尋** | ❌ 整頁是一張圖                   | ✅ 查核者可複製數字回貼試算表     |
| 批次耗時            | **2~4 分鐘**(見下方計時)          | 預估 15~60 秒                     |
| 版面控制            | 螢幕版硬塞進 A4,靠覆寫寬度 1024px | CSS `mm` 直接對 A4,表頭可跨頁重複 |

**文字可選取這一項對審計文件而言比體積更重要。** 查核者拿到一張圖片,任何數字都得手動重打;拿到向量 PDF 可以直接複製、搜尋、也能被文件管理系統索引。

## 現況的實作代價(這是要刪掉的東西)

**單筆匯出**(`page.tsx` 約 660–830 行)

1. 抓 `#pdf-page-${routeType}`,強制寬度 1024px
2. **等 1500ms** —— 原註解寫得很明白:寬度改變觸發 MapLibre 的 ResizeObserver,會清空 WebGL buffer
3. `mapRefs[type].current.captureMap()` 取地圖 JPEG
4. **把 maplibre canvas 抽換成 `<img>`**(約 45 行 DOM 手術),因為 html-to-image 抓不到 WebGL
5. 等 100ms → 截圖 → PDF → 還原 DOM 與寬度

**批次匯出**(`page.tsx` 約 524–645 行)

1. 覆寫 viewport meta 為 `width=1024`
2. **等 1500ms** 讓 React 掛上隱藏元件
3. 逐個 (路線, 方案):設 state → 在 `absolute top-[-9999px]` 掛 `BatchExportRenderer` → **等 onReady(元件內固定 2000ms)或 8000ms fallback** → 截圖 → PDF
4. zip + summary.csv

**27 份的實際等待:每份至少 2 秒固定等待再加截圖時間,合計兩到四分鐘的轉圈。** 這些 sleep 不是隨便寫的,每一段都在補 WebGL 與 html-to-image 的落差——換掉截圖路徑,它們才有可能一起消失。

## 唯一的結構缺口:批次流程的地圖

MapLibre 是 WebGL 且需要 MapTiler key,**伺服端沒有**,所以地圖影像一定得由前端提供。

- **單筆**:`mapRefs` 與 `captureMap()`(回傳 JPEG q0.8 dataURL)都已存在 → 直接可用
- **批次**:`BatchExportRenderer` 內的 `PlanSection` **已經有 `mapRef` prop**,但 page.tsx 沒有往下傳 → 需多穿一層

三個選項:

| 選項                       | 代價                                             | 預估效益                             |
| :------------------------- | :----------------------------------------------- | :----------------------------------- |
| **1. 串 ref,批次仍附地圖** | 仍需離屏掛載(要有 WebGL 可截),每份保留約 2s 等待 | 27 份約 54s 取圖 + 一次請求;行為不變 |
| **2. 批次不附地圖**        | 批次報告沒有地圖(單筆仍有)                       | **27 份約 15 秒**,每份約 30 KB       |
| 3. 伺服端取靜態地圖        | MapTiler Static API key 上伺服端、額外請求成本   | 前端零等待,但引入外部依賴與費用      |

**建議:先做 1**(行為不變、可回退),把 2 做成使用者可選的「精簡模式」。若團隊認為批次報告的地圖價值不高,直接做 2 的效益大得多——四分鐘變十五秒。

## 三個前提(已查證)

**1. Chrome 在生產環境可用 ✅**

`src/app/api/v1/dpp/sku/[sku_id]/batch/[batch_number]/pdf/route.ts` 是**已上線的 API**,走 `dppService.generateBatchPdf` → `mdToPdf` → puppeteer。這條路已經在跑,本次不是新開一條。

兩個附帶限制要記錄:CI 設了 `PUPPETEER_SKIP_DOWNLOAD=true`,**新 API 無法在 CI 做整合測試**(這正是 issue 07 把 HTML builder 拆成純函數的原因);另外若 Vercel preview 部署在 serverless runtime,完整 `puppeteer` 不會動,需確認 preview 是否要求此功能可用。

**2. 請求體積 ✅**

`dockerfiles/gateway/nginx.conf` 有 `client_max_body_size 20M`。27 份 × 地圖 60 KB × base64 膨脹 1.37 ≈ **2.2 MB**,遠低於上限;不附地圖時約 50 KB。

**3. 時間 ✅,但進度條會失去粒度 ⚠️**

27 份 × 每份 setContent + print 約 300~800ms ≈ **10~25 秒**,在 `chore/gateway_proxy_timeout` 放寬後的 300s 內。但改成單一請求後,現有的 `exportProgress`(第 j/N 份)沒有東西可更新。

→ **分批送**,每批 5~10 份:進度條保留、單次體積更小、失敗重試成本低。service 端已有 `LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST = 60` 的上限,分批只是前端迴圈。

## 步驟二的實測結果(2026-07-31,單筆陸運)

|            | 光柵路徑(修 compress 後) |                                      **伺服端向量** |
| :--------- | -----------------------: | --------------------------------------------------: |
| 檔案       |                   296 KB |                                          **154 KB** |
| Producer   |              jsPDF 4.2.1 |                               Skia/PDF m149(Chrome) |
| 可抽出文字 |               **1 byte** | **542 bytes**(方案代碼、座標、排放量、表頭皆可搜尋) |
| 影像       | 2048×2896,佔檔案 **99%** |                             700×526 JPEG,佔 **20%** |
| 伺服端耗時 |                        — |                                          4.6s(單份) |

核心目標達成:**可選取、可搜尋**,且體積少了一半。

三個要記錄的發現:

**1. 中文字是點陣字(Type 3),不是向量。** `pdffonts` 顯示拉丁字走 CID TrueType 子集,但樣板內 19 個相異中文字各自成為一個 Type 3 字型物件——Chrome 找不到可嵌入的中文字型時會把字符光柵化,約佔檔案 60 KB,放大會模糊。**搜尋與複製仍然可用**(ToUnicode 對照表有保留),故不影響本次目標。正解是提供可嵌入的中文字型(執行環境安裝 Noto Sans TC,或以 `@font-face` 內嵌字型檔讓 Chrome 自行子集化)→ **列為後續 issue**。

**2. 地圖偏軟。** 嵌入的是 700×526 @93 ppi;A4 寬度要紮實約需 175 ppi。原本 60 KB 的上限是在「整份 100 KB」的前提下推算的,預算放寬後它反而成了品質瓶頸(Retina 截下的兩倍圖會超過 60 KB 被前端丟掉)→ 上限放寬到 200 KB。

**3. Chrome 啟動時間主導單次請求。** 單份 4.6s 遠高於原估的 300~800ms,絕大部分是冷啟動。分批 8 份表示 27 份要付 4 次啟動成本(約 16s)+ 排版時間。若之後嫌慢,方向是**常駐一個 browser 實例**而非加大批量(加大批量會犧牲進度條粒度)。

**體積預算調整**:100 KB → **500 KB**(Emily 確認)。依據是真實落點 154 KB / 296 KB 都在其內;把預算訂在落點之下會讓每次匯出都跳警告,而**警告一旦成為常態就等於沒有警告**。

**待觀察**:dev log 出現 `Error: Invalid type: 'container' must be a String or HTMLElement.`(MapLibre 建構錯誤)。匯出仍成功且地圖有出現,推測是匯出期間 re-render 導致某個地圖容器短暫消失。尚未確認是否為本次改動造成,批次流程接線時一併釐清。

## 實作步驟(每一步可獨立驗收)

1. **`lib/utils/logistics_report_request.ts`(純函數)**:`IMileageBatchResult` + planKey → API payload。逐段資料取自既有的 `buildPlanLegs`,只做 `IPlanLeg` → `IReportLeg` 的映射。**可單元測試,不需瀏覽器。**
2. **接單筆流程**(map ref 已存在),舊路徑保留在常數開關之後 → 本機比對兩者的體積與版面
3. **接批次流程**(串 ref),同時刪掉 canvas→img 那 45 行與相關 sleep
4. **移除** `captureElementToPdf` 的匯出用途、html-to-image / jspdf 的匯出相依

**不動的東西**:`buildExportFileName`、`buildExportId`、`buildBatchSummaryCsv`、zip 打包邏輯。檔名與 CSV 的方案代碼交叉索引(R01-SEA)完全保留——那是使用者對照報告的唯一線索,不該因為換渲染路徑而改變。

## 驗收

- 單筆與批次匯出的 PDF 皆 < 500 KB,且**可用 Cmd+F 在 PDF 內搜尋到地點名稱與排放數字**(單筆已驗:154 KB / 可搜尋)
- 檔名、CSV 的 Code 欄、PDF 標頭三者的方案代碼一致(與現況相同)
- 逐段距離、係數、排放量與畫面顯示逐格相符(伺服端不重算,只照抄)
- 推估段仍標示 est.,不適用方案仍不產生檔案
- 批次 27 份的總耗時明顯低於現況的 2~4 分鐘

## 風險與回退

改動集中在 `page.tsx` 的匯出流程(約 250 行 DOM 操作)。**沙箱無法執行瀏覽器流程**,因此:

- 步驟 1 先落地並附測試(純函數,可驗)
- 步驟 2 起必須本機實跑;舊路徑保留於開關後,出問題可即刻切回
- 不在同一個 commit 內同時改單筆與批次,避免一次壞兩條路
