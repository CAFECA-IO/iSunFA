# [BUG] - MissionRecorder 以 taskId 子字串反查 Order,鏈重置後無聲寫錯帳

## Summary

**症狀**:分析任務在檔案系統已完整跑完(`missions/<addr>_<taskId>/close.md` Approved、`issues/<addr>_<taskId>/approved.0.md` 存在),但 UI 歷史報告永遠顯示 `executing`;即使手動把 Order 改成 COMPLETED,「載入」仍打不開——因為 `analysis.result` 是空的,結果被寫進**別張 Order 的 analysis**。

**實際案例**:2026-07-24 ~ 07-27 本地環境四筆運輸碳足跡分析(task 123、125 等)全數卡死。task 123 的 `recorded.flag` 顯示 Recorder 於 08:38:22 成功執行並更新了「某張」Order——但不是對的那張。

**根因鏈**(皆為既有設計,非近期回歸):

1. `issue.service.ts` 發單前刻意 `delete missionData.orderId`(2026-05-17 起)——mission.json 會上傳 IPFS 給外部 AI 節點,計價資料不得外流。**此隱私決策正確**,但副作用是本地任務目錄也失去 Order 關聯。
2. Recorder 優先讀的 `context.json` **只有 CERTIFICATE_ANALYSIS 會寫**;運輸分析從未寫過。
3. 於是 Recorder 只剩最後手段:`orderRepo.findFirst({ mission: { contains: '"<taskId>"' } })`(2026-04-27 起)。taskId 是鏈上 NFT 流水號,**本地鏈重置後從頭編號**,上一輪開發殘留在 DB 的舊 Order 的 mission 欄位同樣含 `"123"`;`findFirst` 無排序,撈到舊單 → 舊單被 COMPLETED、result 寫進舊 analysis,**新單永遠 EXECUTING 且 analysis.result 為空**。

**觸發條件**:本地鏈重置(taskId 重複)+ 舊輪 Order 尚存 DB。兩者同時成立即必現;與前端分支無關(運輸計算器 UI 分支對 worker 鏈路的改動為零)。

**嚴重性評估**:對 production(鏈不重置)當前無影響;但故障模式是「無聲把審計結果記到錯誤帳上」,屬審計系統最高嚴重級別的缺陷類型,且未來鏈遷移/重佈署即成為 production 風險。

## Tasks

- [ ] 重現:本地鏈重置後保留舊 orders,發起任一分析,觀察 Recorder log `Successfully updated Order <id>` 的 id 與實際下單 Order 不符
- [ ] 修復方案評估與實作:見 `06_recorder_order_link_solution.md`
- [ ] 受影響資料善後:以 `order.data.timestamp ↔ mission.json.timestamp` 決定性配對,回填 analysis.result 並補 COMPLETED(一次性腳本 PoC 已存在於 `fix/analysis_recorder_order_link` 分支的 `scripts/repair_analysis_order_link.ts`;若 dev 資料可拋棄,清空舊 orders 亦可)

## Dependencies

- 修復實作見 issue 06;PoC 分支:`fix/analysis_recorder_order_link`(commit `a64e3c311`)

## Additional Notes

- 診斷證據:`issues/<addr>_123/mission.json` 無 orderId 欄位、資料夾無 context.json;`recorded.flag` 為成功記錄(非 "No matching order found"),證明 fallback 有撈到單、只是撈錯。
- UI 與前端邏輯全程無誤:`載入` 依 `analysis.result` 渲染,result 不在正確位置時無資料可顯示,行為符合預期。
