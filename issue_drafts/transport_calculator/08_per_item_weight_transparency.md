# [BUG] - 批次結果未回帶每列重量:CSV Weight 欄與批次檢視顯示錯誤重量,重算對不上

> **狀態**:✅ 已完成 2026-07-31(commit `1fcd6d3c4`)

## Summary

**症狀**:批次里程核算的 summary.csv 逐格核對(task 126,12 列)證實所有距離與 CO2e 皆與 result.md 一致、勾稽通過;但 **Weight 欄與檔頭一律顯示 1000 kg**,而後端實際使用每列自己的重量計算(巴黎→柏林為 3000 kg)。重算驗證:

```
第 0 列 海運主段 2,520.91 km
plan 內 CO2e            = 79.03 kg
以 CSV 宣稱的 1000 kg 重算 = 26.34 kg ✗ 對不上
以 mission 原始 3000 kg 重算 = 79.03 kg ✓
```

**根因**:skill 的批次結果項目回帶了 origin/dest/waypoints/mode/距離/plan,**唯獨沒有回帶 `weightKg`**。下游(CSV builder、批次 PlanSection)拿不到每列重量,只能硬用單一預設值 1000——CO2e 數字正確,但「單看 CSV 即可重算驗證」的可追溯性承諾(issue 03)對重量 ≠1000 的列不成立;批次檢視的「總重量」顯示同樣錯誤。

## Tasks

- [x] skill 批次結果每項回帶 `weightKg`(與 waypoints 同樣的 echo 模式)
- [x] `IMileageBatchResult` 增補 `weightKg?: number`
- [x] `buildBatchSummaryCsv`:每列 Weight 欄用該列實際重量(缺漏時退回批次參數),檔頭說明 Weight 欄語意
- [x] 批次檢視與批次匯出的 PlanSection 改用 `item.weightKg ?? 1000`
- [x] 單元測試:含自帶重量與 fallback 重量的混合批次

## Dependencies

- 延續 issue 03(計算透明度);與 issue 07 同屬「估算/實際值誠實呈現」系列

## Additional Notes

- 向下相容:舊 result 資料無 `weightKg` 欄位時 fallback 至 1000,行為與現狀相同。
- 舊資料的 CSV 匯出仍可能顯示 fallback 重量——檔頭語意已說明,重新執行分析即可獲得完整重量記錄。
