# [FEATURE] - Recorder 訂單關聯修復方案評估:context.json 決定性關聯 vs 開發 SOP

> **狀態**:✅ 已完成 2026-07-28(commit `09967c7d5`)

## Summary

針對 issue 05(Recorder 反查誤配舊單)的兩個候選解法進行評估,並給出建議結論。

### 方案 A:context.json 決定性關聯 + 查找優先序(程式修復)

發單時(`issue.service.ts`)無條件在本地任務目錄寫入 `context.json`(orderId + analysisId);Recorder 查找優先序改為 `analysis.orderId → context.json.orderId → mission.json(舊資料)→ contains 反查`,且反查加 `orderBy createdAt desc + 多筆匹配警告`。PoC 已完成於 `fix/analysis_recorder_order_link`(commit `a64e3c311`,3 檔 +155/−8,含一次性修復腳本)。

### 方案 B:開發 SOP(紀律解)

在開發文件明訂:「重置本地鏈時,必須同時清空 DB 中的 orders(與關聯 analysis)」。程式碼零改動,靠流程紀律避免 taskId 與舊單同時存在。

## 評估

| 面向 | 方案 A(程式) | 方案 B(SOP) |
|---|---|---|
| 防護性質 | 決定性防護:關聯由發單方寫死,結構上不可能誤配 | 機率性防護:依賴每位開發者每次都記得執行 |
| 覆蓋範圍 | dev 鏈重置、未來 production 鏈遷移/重佈署、多鏈並存,全數涵蓋 | 只覆蓋「知道且遵守 SOP 的本地開發」;production 鏈遷移情境完全無防護 |
| 失敗模式 | 舊資料仍走 fallback,但有排序與警告,錯配至少可見 | 遺忘一次 = 無聲寫錯帳,且錯帳可能跨使用者,發現成本極高 |
| 實作成本 | 已完成(+155/−8);向下相容,舊任務目錄照走 fallback | 寫一段文件;但每次鏈重置多一道人工步驟與資料損失(舊 orders 被清) |
| 架構相容性 | 逐條核對 `documents/architecture/async_workers/00_async_worker_overview.md`:context.json 為既有檔案接力機制(憑證分析已用);Issuer/Recorder 本為文件明載的具寫庫權限內部節點;orderId 不進 IPFS payload,Zero DB Access 與隱私邊界不變;Recorder 仍是 Dumb Writer,只修「定址」不碰資料——**且文件承諾 Recorder 將「原本的訂單」標記 COMPLETED,現行 fallback 恰恰無法保證這點,方案 A 是把實作拉回文件語義** | 不觸碰架構,天然相容 |
| 副作用 | 無已知;context.json 多一個本地檔 | 清 DB 連帶損失同 DB 的其他開發資料(帳本、憑證測試資料) |

## 結論(建議)

**採方案 A 為主、方案 B 為輔,兩者不互斥:**

1. **合併方案 A**。理由:審計系統對「無聲寫錯帳」零容忍(CLAUDE.md 零捏造/決定論防護精神);改動極小且向下相容;是唯一能覆蓋 production 鏈遷移情境的解。紀律解擋不住結構性缺陷——SOP 防住了今天的自己,防不住半年後的新同事與正式環境的鏈重佈署。
2. **同時把方案 B 寫進開發文件**(async_workers 文件或 onboarding SOP):即使有方案 A,乾淨的 dev 環境仍是好習慣,且能保護「方案 A 上線前產生的舊任務目錄」(它們沒有 context.json,仍依賴 fallback)。
3. **一次性修復腳本(`repair_analysis_order_link.ts`)不必合併**:它是救當下卡住資料的 ops 工具;dev 資料可拋棄者直接清庫更快。建議跑完後從 PR 移除,或移至 ops 工具目錄由團隊決定。

## Tasks

- [ ] Review 並合併 `fix/analysis_recorder_order_link`(issue.service 寫 context.json、recorder 查找優先序 + fallback 防呆)
- [ ] 在 `documents/architecture/async_workers/` 增補:本地鏈重置 SOP(同步清空 orders/analysis)與 context.json 關聯機制說明
- [ ] 決定 `scripts/repair_analysis_order_link.ts` 去留(建議:不合併,作為一次性工具使用後移除)
- [ ] 補單元測試:Recorder 查找優先序(context.json 命中 / fallback 多筆警告)

## Dependencies

- issue 05(bug 記錄);PoC 分支 `fix/analysis_recorder_order_link`

## Additional Notes

- 「之前不會出問題」的正解:缺陷自 2026-04/05 即存在,只是觸發條件(鏈重置 + 舊單殘留)近期才在本地環境同時成立;develop 分支在相同 DB 狀態下同樣必現。
- 方案 A 上線後,contains 反查僅剩「服務舊任務目錄」的過渡用途,可在下一個大版本標記 Deprecated 並移除。
