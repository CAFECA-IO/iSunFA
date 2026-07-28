# [BUG] - 批次清單標頭碳排徽章對聯運路線顯示 0 kg CO₂e

## Summary

**症狀**:批次里程核算清單,每列標頭的碳排徽章只有純陸運路線正確(武嶺→台北101 顯示 4.7 kg,重算驗證:206.7km × 0.2t × 0.11289 = 4.67 ✓);所有 SEA_LAND 聯運路線一律顯示 **0 kg CO₂e**,即使方案總計有值(如巴黎→柏林 sea 方案總計 89.08 kg)。

**根因**(`mileage_batch_results.tsx` 既有邏輯):標頭徽章取值為 `custom_multimodal.total_co2eKg || landOnly.co2eKg`——從未讀取海/空聯運的 `total_co2eKg`。聯運路線的 `landOnly` 因陸運不可達被後端設為 `co2eKg: "0"`,徽章便顯示 0。純陸運與自訂聯運恰好落在既有兩個分支上,所以過去未被發現;全球測試路線(task 126,11 條 SEA_LAND)讓缺陷全面現形。

**如何優化**:標頭取值收斂為純函數 `getHeadlineCo2e(item)`:
1. 優先序:custom 方案 → 依 `item.mode`(ROUTE_MODE)對應方案總計 → 適用性引擎推導的第一個適用方案總計
2. 所選方案含直線 fallback 接駁段時,徽章加 `~` 前綴(與 issue 07 的估算標示一致,估算值不偽裝確定值)
3. 純函數放 `logistics_report.ts`,可單元測試

## Tasks

- [x] `logistics_report.ts` 新增 `getHeadlineCo2e()` 純函數(mode 對應 + 適用性 fallback + 估算旗標)
- [x] `mileage_batch_results.tsx` 標頭徽章改用該函數,估算值顯示 `~` 前綴
- [x] 單元測試:SEA_LAND 取海運總計、LAND 取陸運、fallback 段觸發估算旗標、無 mode 時依適用性推導

## Dependencies

- 延續 issue 07(估算標示)/ issue 08(數值透明);與 issue 01 的適用性引擎共用推導

## Additional Notes

- 向下相容:legacy 資料(`buildPlanFromLegacyBatchItem` 重建的 plan)mode 欄位存在,對應正常;完全無 mode 的資料走適用性 fallback。
