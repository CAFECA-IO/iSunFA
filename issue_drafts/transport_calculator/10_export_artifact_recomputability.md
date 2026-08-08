# 🐛 [BUG] - 匯出的 CSV 無法用自身欄位重算,PDF 與檔名也缺少辨識依據

## Description

`summary.csv` 的 `Distance` 已捨入而 `Leg CO2e` 未捨入,兩者相乘對不起來,加上 `PDF` 欄指向錯誤、距離版 PDF 未給換算公式、兩種匯出檔名相同,使匯出文件既無法自我驗證也無法互相對照。

## Summary

Issue 09 讓「不計算 CO2e」真的生效並補上了 `summary.csv`。實際比對同一條路線的兩組產出(距離版 `20260803-1138`、CO2e 版 `20260803-1139`,各 2 份 PDF + 1 份 CSV)後,發現這些文件在**可重算性**與**可辨識性**上還有缺口。這批的性質與 issue 09 不同:09 是「畫面宣稱與行為不符」,這裡是「文件無法自我驗證」。

**① CSV 對不起自己。** 檔頭印著 `# Formula: Leg CO2e = Distance x (Weight / 1000) x Factor`,等於邀請讀者重算,但 `Distance` 是四捨五入到 2 位、`Leg CO2e` 卻以未捨入的距離計算:

| 段 | CSV Distance | 用 CSV 欄位重算 | CSV 的 Leg CO2e | 反推真實距離 |
|---|---|---|---|---|
| SEA L1 LAND | 27.69 | 18.13695 | 18.135378 | 27.6876 |
| SEA L2 SEA | 18932.06 | 1874.273940 | 1874.273850459089937 | 18932.059096 |
| AIR L2 AIR | 9759.85 | 56607.1300 | 56607.1549234536092 | 9759.854297 |

差異量級不大(AIR L2 為 0.025 kg / 56,607 kg),但**永遠無法歸零**,而檔案裡沒有任何一行解釋為什麼。CO2e 版 PDF 的頁尾寫「完整精度見同批匯出的 summary.csv」—— 該句只成立一半,CSV 只有 CO2e 是完整精度,距離不是。

對距離版 CSV 影響更直接:那份檔案存在的唯一理由就是被乘上使用者自己的係數,而使用者只能拿到 2 位小數的距離。

**② `Leg CO2e` 精度失控。** 輸出至 21 位有效數字(`1874.273850459089937`、`2.861978727556226385`)。Excel 僅支援 15 位有效數字,開啟即被截斷;同一欄又混有 `18.135378`(8 位)與 `4.6212215`(8 位),因為部分 Decimal 除法會終止。看起來像是精度不一致,實際是原始 Decimal 未經格式化直接輸出。

**③ `PDF` 欄指向同一路線的所有方案。** `R01-SEA` 的最後一段與 `R01-AIR` 的最後一段都填了
`R01-SEA_..._sea_multimodal.pdf; R01-AIR_..._air_multimodal.pdf`。
`logistics_report.ts:628` 的 `const files` 算在 `planKeys.forEach` 之外,`filesByRouteIndex` 的 key 只有 route index,同一路線的多個方案因此共用同一份清單。`Code` 欄(`R01-SEA`)就是正確的 key,且檔名本來就以它開頭。此問題在批次路徑既有,issue 09 為單筆路徑補 CSV 時沿用了同一份邏輯。

**④ 距離版 PDF 沒有換算公式。** `logistics_report_html.ts:622` 的 false 分支只寫「本報告未計算二氧化碳當量,僅提供路徑與距離。排放量須另行以適用係數計算」,沒說怎麼算;`:619` 的 true 分支反而有 `Leg CO2e = Distance × (Weight / 1000) × Factor`。**要求讀者自行計算的那份文件,正是沒有告訴他公式的那份。** Issue 09 已為 CSV 修正同一缺陷(`logistics_report.ts`),PDF 這一半漏了。

**⑤ 兩種匯出的檔名完全相同。** 距離版與 CO2e 版都產出
`R01-AIR_25-0381-121-565-53-465-2-234_air_multimodal.pdf`。
兩份文件的主張截然不同(一份宣稱未計算排放、一份載明 56,622.16 kg CO2e),同時匯出會撞名或被覆寫,事後也無法從檔名分辨。

**⑥ Export ID 僅到分鐘。** `buildExportId`(`pdf_export.ts:104`)產生 `YYYYMMDD-HHmm`。上述兩次測試匯出取得 `20260803-1138` 與 `20260803-1139`,恰好跨分鐘;同一分鐘內匯出兩次會取得相同 ID,而 Export ID 正是用來把 PDF 與 CSV 綁在一起的欄位。

## Tasks

- [ ] 決定精度政策並讓 `Distance` 與 `Leg CO2e` 一致。建議 `Distance` 提高輸出位數(距離版 CSV 的用途就是被乘上係數),而非把 CO2e 降到 2 位
- [ ] `Leg CO2e` / `Plan CO2e` 以固定位數輸出,上限不超過 Excel 的 15 位有效數字
- [ ] `PDF` 欄改以 `Code`(方案代碼)為 key,每個方案只列自己的 PDF;批次與單筆兩條路徑共用同一份邏輯
- [ ] `logistics_report_html.ts` 的 false 分支補上換算公式,措辭與 CSV 的
      `# To apply your own factor (kg CO2e/t-km): …` 一致
- [ ] 距離版檔名加上可辨識的後綴(例如 `_distance_only`),PDF 與 zip 皆需
- [ ] `buildExportId` 補到秒。**動手前需確認**是否有其他地方在解析此字串格式
- [ ] 補一條測試:以 CSV 自身的 `Distance × Weight/1000 × Factor` 重算,結果需等於 `Leg CO2e` 欄
      (這是本票最核心的不變式,目前沒有任何測試守著)

## Reproduction

1. `/transportation_carbon_footprint_calculator`,輸入起訖點與重量 5000,計算
2. 匯出 → **取消勾選**「計算二氧化碳當量」→ 勾選海運與空運 → 匯出
3. 一分鐘內再匯出一次,這次**維持勾選**「計算二氧化碳當量」
4. 比對兩組 zip:檔名相同(⑤);開啟 CO2e 版的 `summary.csv`,以 `Distance × 5 × Factor` 重算任一列並與 `Leg CO2e` 比較(①);觀察 `Leg CO2e` 位數(②)與 `PDF` 欄內容(③);開啟距離版 PDF 頁尾(④)

## Additional Notes

- 本票不含正確性錯誤 —— 排放量的計算本身是對的,`Leg CO2e` 逐段相加與 `Plan CO2e` 完全吻合
  (SEA `1895.271207186646163385` vs `1895.2712071866461634`),PDF 的捨入勾稽揭露也正確運作
  (AIR 逐列 56,622.15 對總計 56,622.16,差 0.01 有揭露;SEA 一致則明說一致)
- est. 佔比會依情境換分母(距離版以距離、CO2e 版以排放為分母),四個百分比均已驗算正確
- 同批實測另發現空運接駁選到松山(TSA)而非桃園(TPE),屬 `logistics.ts` 已記載的限制
  (IATA 只證明有商業運作,不證明有貨運能力),不在本票範圍,另開票

## Dependencies

- 前置:issue 09(`09_export_options_and_dark_mode_correctness.md`),已隨 PR #6587 併入 `develop`
- 受影響檔案:`src/lib/utils/logistics_report.ts`、`src/lib/utils/logistics_report_html.ts`、
  `src/lib/utils/pdf_export.ts`、`src/app/(landing)/transportation_carbon_footprint_calculator/page.tsx`
