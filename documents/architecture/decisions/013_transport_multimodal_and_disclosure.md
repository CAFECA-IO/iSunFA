# 架構決策紀錄 (ADR) 013: 運輸碳足跡 —— 方案適用性、多模式聯運與揭露誠實性

> **Date**: 2026-07-29
> **Author**: Tzuhan
> **Status**: Accepted (已接受)
> **Branches**: `feature/transport_carbon_route_optimization`(issues 01–09)、`feature/transport_multimodal_extension`(issues 10–11)
> **Context**: 物流碳足跡計算器的四項 UAT 需求(運輸工具判斷、匯出 PDF 拆分、總結報表透明化、歷史導覽)在實作過程中,連鎖挖出五個既存缺陷與兩項底層能力缺位。本文件記錄這些決策的脈絡與取捨,取代先前散落在 `issue_drafts/transport_calculator/` 的逐票草稿。

---

## 決策總覽

| # | 決策 | 取代的舊行為 | 核心理由 |
| :-- | :--- | :--- | :--- |
| 1 | 方案適用性收斂為單一決定論純函數 | 三處 UI 各自以 `success` 旗標推導 | 商業合理性判斷不可散落,且必須可單元測試 |
| 2 | 一份 PDF 一個方案,匯出範圍由勾選決定 | 所有方案合併單一 PDF,範圍隱含繼承畫面狀態 | 審計文件逐方案簽核;匯出是明確授權行為 |
| 3 | 排放係數單一來源 `EMISSION_FACTORS` | 三套硬編碼版本(含一組錯誤值) | 係數是事實資料;兩套並存等同系統自我捏造 |
| 4 | 估算值必須誠實標示 | `isFallback` 存在但從未呈現 | 寧可說「不知道」,不可給假確定值 |
| 5 | 每列重量端到端揭露 | 批次結果不回帶 `weightKg`,下游硬用 1000 | 「單看報表即可重算」的承諾必須成立 |
| 6 | 訂單關聯以 `context.json` 決定性寫入 | `mission contains taskId` 子字串反查 | 無聲寫錯帳是審計系統最高嚴重級缺陷 |
| 7 | 新增 `SEA_LAND_AIR` 串聯路徑方案 | 常數與 i18n 存在但引擎不產生 | 需求明列四種方案,底層卻只有三種 |
| 8 | 總結 CSV 改 long format | 寬表一列多方案,欄位隨方案膨脹 | 每列自我完備、欄位固定、可樞紐分析 |

---

## 1. 方案適用性:決定論規則引擎(issue 01)

**問題**:`calculateLogisticsPlan()` 對任何起訖點都無條件計算海運與空運方案,`success: true` 只代表「算得出來」而非「商業上合理」。台北→高雄也會產出繞港的海運方案。前端三處(分析頁、批次檢視、批次匯出)各自以 `success` 推導可選性,標準不一。

**決策**:規則收斂到純函數 `lib/utils/route_applicability.ts`:

1. 存在真實陸路(非直線 fallback)且陸運距離 ≤ 聯運方案總距離 → 該聯運不適用(繞港/繞機場純浪費)
2. 主運輸段低於商業門檻(`MIN_SEA_LEG_DISTANCE_KM` / `MIN_AIR_LEG_DISTANCE_KM`)→ 不適用(同港/同機場退化)
3. 後端於計算時寫入 `isApplicable` 為單一真實來源;歷史資料無旗標時前端以同一函數重推,新舊行為一致

**取捨**:採「距離比較」而非引入國界/陸塊資料。零外部依賴、可測試,且天然涵蓋「跨國但陸運可直達」(柏林→巴黎)與「同國但需跨海」(台灣本島→澎湖)。**已知限制見第 4 節。**

## 2. 匯出:一份 PDF 一個方案(issue 02)

**決策**:匯出入口一律先開勾選選單(只列適用方案),渲染單位從「路線」細化為「(路線, 方案)」,每個組合產出獨立 PDF,多檔打包 zip,檔名語意化 `route_{n}_{origin}-{dest}_{plan_type}.pdf`。

**取捨**:逐組合序列渲染使匯出時間線性成長,以進度提示(第 x / y 份)換取「一份文件一個方案」的審計要求。既有的 WebGL 截圖 workaround(viewport 欺騙、canvas 替換、MapLibre ResizeObserver 等待)原樣保留——那是踩坑成果,重構時只搬移不改寫。

## 3. 係數單一來源與精度(issue 03)

**問題**:排放係數存在三套版本——`route.service.ts`(SEA 0.01045 / AIR 0.6023)、`plan_section.tsx`(同值但重複硬編碼)、`page.tsx` 歷史 fallback(**SEA 0.01614 / AIR 0.50422**,來源不明)。同一條路線由後端計算與由前端 fallback 重算會得出**不同碳排**。前端 fallback 另以原生浮點運算,違反高精度鐵律。

**決策**:係數收斂至 `constants/logistics.ts` 的 `EMISSION_FACTORS`(字串保存,計算時轉 Decimal);刪除錯誤係數;legacy 重建改用 `MoneyUtil.toDecimal`。

**後果**:重載歷史紀錄顯示的數字會改變。這是**修正錯誤**而非破壞相容,PR 明確標注。

## 4. 揭露誠實性:估算值標示(issue 07)

**問題**:本地 OSRM 僅載入台灣圖資,範圍外陸路查詢一律退直線 ×1.2 fallback,skill 據此判定「陸運不可達」→ 一律選 SEA_LAND。巴黎→柏林(實際純陸運約 1,050km)被判海陸聯運 2,550km;12 條全球測試路線中,台灣路線 geometry 47 點(真實路網),其餘 11 條皆 4 點(直線)。

**決策(已實作)**:`isFallback` 貫穿呈現層——PlanSection 掛「估算值」徽章(畫面與 PDF 同步)、CSV 以 `Estimated?` 欄標示。

**決策(刻意暫緩)**:陸塊連通性判斷。評估過三種不需外部資料的替代方案皆不可靠:凸包會把台灣算進歐亞大陸;以最近港口的國家推斷會把夏威夷算進美洲本土;手繪粗略多邊形本身即是新的不確定來源。**結論:此項需先完成資料決策(Natural Earth 授權/體積,或改用 OSRM 涵蓋範圍宣告),不為了「一起做完」而硬上。** 在此之前,非台灣區域的適用性判斷品質受圖資限制,系統以估算標示誠實揭露此限制。

## 5. 每列重量與標頭碳排(issues 08、09)

- **重量**:批次 skill 原本回帶 origin/dest/waypoints 卻不回帶 `weightKg`,CSV 與批次檢視只能硬用預設 1000。後端計算正確(各列用自己的重量),但報表宣稱的重量與實際不符,重算對不上(宣稱 1000kg 得 26.34 vs 實際 3000kg 的 79.03)。決策:skill 回帶每列重量,下游一律使用,舊資料 fallback。
- **標頭碳排**:批次清單徽章原本只讀 `custom || landOnly` 總計,聯運路線的 `landOnly.co2eKg` 為 `"0"` → 所有 SEA_LAND 路線顯示 0 kg。決策:`getHeadlineCo2e()` 依 `item.mode` 取對應方案總計(無 mode 時依適用性引擎推導),含 fallback 段時加 `~` 前綴。

## 6. Worker 訂單關聯(issues 05、06)

**問題**:`issue.service.ts` 發單前刻意 `delete missionData.orderId`(mission.json 會上傳 IPFS 給外部 AI 節點,計價資料不得外流——**此隱私決策正確**),但 `context.json` 僅憑證分析會寫。運輸分析因此只剩 `orderRepo.findFirst({ mission: { contains: taskId } })` 子字串反查;taskId 為鏈上流水號,本地鏈重置後重複編號,`findFirst` 無排序 → 撈到舊輪開發的 Order,把結果寫進舊 analysis,真正的 Order 永遠 EXECUTING 且 `analysis.result` 為空(UI 顯示 executing,手動改 COMPLETED 也打不開,因為內容在別筆)。

**決策**:發單時無條件寫入 `context.json`(orderId + analysisId)——該檔僅存本地 worker 目錄、不進 IPFS payload,隱私隔離不變;Recorder 查找優先序改為 `analysis.orderId → context.json → mission.json → contains 反查`,反查加 `orderBy createdAt desc` 與多筆匹配警告。

**架構相容性**:逐條對照 `async_workers/00_async_worker_overview.md`——context.json 是文件既有的「本機檔案目錄接力」機制;Issuer/Recorder 本為文件明載的具寫庫權限內部節點;Recorder 仍是 Dumb Writer,只修「定址」不碰資料內容。文件承諾 Recorder 將「**原本的訂單**」標記 COMPLETED,現行反查恰恰無法保證這點——**本修改是把實作拉回文件語義,而非偏離**。

**替代方案評估**:「重置本地鏈時同步清空 DB orders」的 SOP(紀律解)覆蓋不到 production 鏈遷移,且遺忘一次即無聲寫錯帳。採程式解為主、SOP 為輔。

## 7. `SEA_LAND_AIR` 串聯路徑(issue 10)

**問題**:需求明列四種方案(純陸運/海陸/空陸/**海陸空**),但引擎只產出三種;`ROUTE_MODE.SEA_LAND_AIR` 與五語系文案存在卻無實作,匯出選單與 CSV 因此無從提供該方案。

**決策**:語意確認為**串聯路徑**——單一貨批依序經 陸(起點→出口港)→ 海(港→港)→ 陸(進口港→中轉機場)→ 空(機場→機場)→ 陸(機場→迄站);中轉機場取進口港的最近機場。「海運與空運分批運送」屬 split shipment,**不在此範圍**。

**實作要點**:重用海運方案前兩段避免重複 OSRM 呼叫;適用性規則要求海運段與空運段皆達門檻、且真實陸路不比本方案短(避免產出三段繞路的無意義方案)。

## 8. 總結 CSV:long format(issue 11)

**問題**:寬表設計(一路線一列、方案分欄組)已達 22 欄,加入海陸空聯運將破 30 欄;不適用方案留下大量 `N/A`;且**每段缺少端點經緯度**,查核者無法驗證「這一段究竟從哪到哪」;係數僅於檔頭統一揭露,未逐段標注。

**決策**:改 long format,一段一列,每列含 `Route # / Origin / Destination / Weight / Plan / Leg # / Mode / From Name+Lat+Lng / To Name+Lat+Lng / Distance / Estimated? / Factor / Factor Source / Leg CO2e / Plan Total / Report Files`。方案總計與檔名於該方案末段填值(維持「各段相加 = 方案總計」勾稽);不適用方案**不產列**。

**效益**:欄位固定,新增方案自動成列——issue 10 因此無需任何欄位改動。**代價**:CSV 結構與列數改變,下游消費者需同步調整(破壞性變更,PR 標注)。

---

## 未完項目

| 項目 | 狀態 | 卡點 |
| :--- | :--- | :--- |
| 陸塊連通性判斷 | 未實作 | 資料決策(見第 4 節) |
| 歷史清單篩選/搜尋 | 未實作 | 需求原文要求「保留篩選條件」,但清單目前無此功能;需確認是保留機制或新建功能 |
| 真機驗收 | 待執行 | 見 `documents/architecture/transport_calculator_uat_checklist.md` |

## 附註

- 一次性資料修復工具 `scripts/repair_analysis_order_link.ts` 已於本地救回四筆卡住的紀錄(以 `order.data.timestamp ↔ mission.json.timestamp` 決定性配對),屬 run-once ops 工具,不納入 PR。
- **ops 鐵律**:worker(`npm run worker`)是長駐程序,啟動時載入的程式碼即固定。改動 issuer / recorder / skill 後**必須重啟**,dev server 的熱重載不適用於 daemon。此坑在開發期踩過兩次。
