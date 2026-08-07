# 🐛 [BUG] - 匯出選項與暗色模式:三組已上線的使用者可見缺陷

> **狀態**:✅ 已完成 2026-07-28(commit `e912fee6f`)

## Description

「不計算 CO2e」在主要匯出入口被忽略且拿不到可自算的 CSV、係數組選單實際不生效卻在畫面上宣稱會套用、暗色模式下 PDF 預覽與公開分享頁呈現白紙白字。

## Summary

三組缺陷共通點是**畫面或文件的宣稱與實際行為不符**,都已上線。

**① 「不計算二氧化碳當量」在單筆分析與歷史匯出無效。**
`handleExportConfirm` 把 `scope: "report"` 導向 `executeReportExport(options.plans)`,而該簽章只收方案集合;`buildReportPdfItem` 因此沒收到 `includeCo2e`,`buildLogisticsReportHtml` 的 `input.includeCo2e !== false` 把 undefined 判成 true。使用者取消勾選,拿到的仍是完整排放報告。批次路徑正確,只有這條漂移。

再者,即使旗標生效,該路徑**從不產生 `summary.csv`** —— 只打包 PDF。PDF 的距離是給人看的格式(千分位、2 位小數),無法拿去乘係數,「匯出後自己算」在最主要的入口是走不通的。批次路徑也有同樣的縮影:單檔捷徑在 CSV 產生前提前 return。

**② 係數組選單是空殼,且以文字明示了假陳述。**
`options.factorSet` 全庫無消費者(`resolveFactorSet` 無 production caller),`route.service` 與 `buildPlanLegs` 一律讀預設組,`ReportSchema` 也沒有這個欄位。使用者選 DEFRA、讀著我們給的 DEFRA 總量匯出,開啟的文件是環境部的數字與環境部的標籤。i18n 的 `factor_set_no_estimate` 更直接寫著「所選係數組仍會套用於計算」。

選單上的總量本身也是錯的:`factorSetImpacts` 把互斥方案(land/sea/air/seaLandAir)的段落攤平相加,起點→港的陸段被算兩次;它讀 `applicability` 而非使用者實際勾選的方案,並用頁面層的 `weightKg` 而非逐列的 `item.weightKg`。

同一個歸屬錯誤的高流量版本:`plan_section` 在三行 `EMISSION_FACTORS`(環境部的 0.131 / 0.0198 / 1.16)正下方印「來源: UK DEFRA 2025」。`1602a84ad` 修了 CSV 註解裡的同一處,漏了所有人都會看到的分析畫面。

**③ 暗色模式下 A4 紙張預覽白紙白字。**
語意色 token(`--text-primary: var(--t-900)` 等 39 個)只宣告在 `:root`,而 custom property 的 `var()` 是在**宣告它的元素**上就代入完成的 —— 子孫元素繼承到的是已定案的顏色值,紙張容器把 `--t-900` 翻回淺色因此無效。`.bg-white` 在元素上才解析所以正常,於是紙是白的、字也是白的。實測 `h1` 1.09:1、內文 1.37:1,表頭與行內 code 底變成黑色色塊。影響 PDF 編輯器預覽與 `/share/pdf/[token]` 公開分享頁。

同一區另兩個問題:cyan / lime / fuchsia 有文字提亮規則但沒有 tint 重映(`ACCOUNT_TYPE_COLORS` 的費用、現金流量、其他綜合損益三種科目,對比約 2.3–2.5:1);五個圖表元件都沒把節點傳給 `useChartPalette`,紙張裡的圖表套用暗色調色盤,匯出的 PNG 是淺底配深色模式線條。

## Tasks

- [x] `executeReportExport` 改收 `IExportOptions`,把 `includeCo2e` 傳進 `buildReportPdfItem`　`3edf70272`
- [x] 單筆路徑補上 `summary.csv`;兩條路徑在 `includeCo2e === false` 時不走單檔捷徑　`3edf70272`
- [x] 距離版 CSV 補上換算約定 `Leg CO2e = Distance x (Weight / 1000) x YourFactor`,並註明繞行係數已乘進 Distance 欄　`3edf70272`
- [x] `exportId` 改用區域變數 —— `setExportId` 為非同步,同一 closure 讀到的永遠是 null,單筆匯出從來沒有 Export ID　`3edf70272`
- [x] 移除係數組 radio、`IExportOptions.factorSet`、`factorSetImpacts`,改為靜態揭露(版本標籤 + 三個係數值,由常數內插)　`76d4f9169`
- [x] 五語系刪除 `factor_set_moenv` / `factor_set_defra` / `factor_set_default` / `factor_set_no_estimate`;`factor_set_hint` 改寫為指向自算路徑　`76d4f9169`
- [x] `plan_section` 的「UK DEFRA 2025」改為由 `DEFAULT_FACTOR_SET` 推導,與匯出文件的抬頭一致　`76d4f9169`
- [x] 語意 token 區塊的選擇器納入主題不變區;56 個色相 tint 在深色的兩個入口內重算(刻意不動淺色,避免既有正確的預覽產生色差)　`fca8977bd`
- [x] cyan / lime / fuchsia 補上 tint 重映,四個區塊各 12 條　`fca8977bd`
- [x] `theme_css_blocks.test.ts` 的 `usedUtilities` 改掃 `.ts`(原本只掃 `.tsx`,看不到定義在 constants 的 `bg-lime-50`,因此漏掉它自己要防的 bug)　`fca8977bd`
- [x] 五個圖表元件改以 state 回呼 ref 把自身節點傳給 `useChartPalette`　`fca8977bd`

## Verification

- ESLint / Prettier 全綠;`tsc --noEmit` 錯誤數與父 commit `1602a84ad` 相同(8,皆為 Prisma client 未重產所致的既有檔案)
- Jest 751 passed / 68 suites;失敗的 `emission_factor_db` 與 `core_pipeline.e2e` 需連 DB
- 紙張預覽對比以解析 `globals.css` 模擬 CSS 變數解析鏈實測:`h1` 1.09 → 17.75,內文 1.37 → 10.30
- 距離版 CSV 以 node 直接執行 `buildBatchSummaryCsv` 驗證:17 欄對齊、檔頭無逗號、換算公式在
- UI 實測已完成(見 `reports/ui_test_plan.md`),兩組 PDF + CSV 已比對:est. 佔比會依情境換分母(距離版用距離、CO2e 版用排放,四個百分比皆正確),捨入勾稽正確揭露

## Additional Notes

- cyan / lime / fuchsia 的對比值**未實測** —— `--color-*-500` / `-700` 屬 Tailwind 自身色盤、不在 `globals.css`,僅驗證新增宣告與既有 14 個色相結構相同、兩個深色入口一致。合併後請於暗色下目視科目選單
- `compareFactorSetTotals` / `factorSetDeltaRatio` / `FACTOR_SET_ORDER` 現無 caller 但保留:`logistics_factor_sets.test.ts` 以 `coefficientId` 回查 `true_esg_coefficients.ts` 核對值、名稱與單位,是目前唯一守著那三個係數的機制
- 真正接通係數組選擇需把 set 串進 `buildPlanLegs`、`getPlanTotalCo2e`、PDF payload、HTML builder 與 `route.service` 的重算,屬新功能,另開票
- 空運接駁選到松山(TSA)而非桃園(TPE),為 `logistics.ts` 已記載的限制(IATA 只證明有商業運作,不證明有貨運能力)首次出現在真實產出上,另開票
- `mermaid_chart` 內嵌 `<style>` 的 `!important` 蓋掉 palette 驅動的 `themeVariables`,暗色下流程圖仍為白盒藍字,`.cluster-label` 3.68:1,另開票

## Dependencies

- Branch `fix/maplibre_v6_runtime_regression`,commits `fca8977bd`、`3edf70272`、`76d4f9169`
- 已隨 PR #6587 併入 `develop`(merge commit `c958c8e6c`)
- **後續**:UI 實測比對兩組產出時另發現 6 項匯出文件的可重算性與識別性缺陷,見 issue 10
  (`10_export_artifact_recomputability.md`)。與本票同一區域但性質不同(本票是「宣稱與行為不符」,
  後者是「文件無法自我驗證」),故分票處理。
