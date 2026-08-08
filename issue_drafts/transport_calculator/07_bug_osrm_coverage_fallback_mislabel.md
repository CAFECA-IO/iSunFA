# [BUG] - OSRM 圖資僅涵蓋台灣:範圍外路線被無聲判為海陸聯運,fallback 估算值未標示

> **狀態**:✅ 已完成 2026-07-28(commit `01fbf9d4f`)

## Summary

**症狀**:批次里程核算對台灣以外的路線,運輸模式與距離系統性錯誤——巴黎→柏林(實際純陸運約 1,050km)被判為 `SEA_LAND` 2,550km;夏威夷→東京算出 34,343km;所有結果以「確定值」姿態呈現,無任何估算標示。

**證據(task 126,12 條全球測試路線)**:land geometry 點數 = 2 點/段代表直線 fallback,多點代表真實路網:

| 路線 | mode | 距離 | land 幾何點數 |
|---|---|---|---|
| 武嶺 → 台北101(台灣) | LAND | 206.7km | **47 點(真實路網)** |
| 巴黎 → 柏林 | SEA_LAND | 2,550.6km | 4 點(直線 fallback) |
| 布達拉宮 → 加德滿都 | SEA_LAND | 2,913.6km | 4 點 |
| 檀香山 → 東京 | SEA_LAND | 34,343.5km | 4 點 |
| 雪梨 → 奧克蘭 | SEA_LAND | 2,488.9km | 4 點 |
| 復活節島 → 倫敦 | SEA_LAND | 14,469.2km | 4 點 |
| 上海 → 胡志明市 | SEA_LAND | 3,392.4km | 4 點 |
| 紐約 → 多倫多 | SEA_LAND | 3,441.8km | 4 點 |
| 鹿特丹 → 首爾 | SEA_LAND | 20,494.7km | 4 點 |
| 麥克默多站 → 斯瓦巴 | SEA_LAND | 30,586.8km | 4 點 |
| 威尼斯 → 日內瓦 | SEA_LAND | 2,641.2km | 4 點 |
| 布拉格 → 芝加哥 | SEA_LAND | 8,330.4km | 4 點 |

台灣路線正常、其餘 11 條全部 fallback——**模式判定邏輯正確,是本地 OSRM(`OSRM_ROUTER_URL`)只載入台灣 extract**。`getLandRoute()` 對範圍外座標查無路徑 → 直線 ×1.2 fallback(`isFallback: true`)→ skill 視「陸運不可達」→ 一律選 SEA_LAND,連巴黎→柏林也繞港。

**兩層問題:**

1. **環境限制**(dev 已知,prod 需確認圖資範圍):OSRM extract 覆蓋不足時,涵蓋範圍外的判定必然失真。
2. **程式缺陷(本 issue 修復)**:`isFallback` 旗標在資料管線裡從頭到尾都有,但 **UI、PDF、CSV 全部沒有呈現**——估算值被當確定值展示,違反零捏造原則(寧可標示「不確定」也不能給假確定)。

## Tasks

- [x] 選項 1(本次實作):誠實標示 fallback——PlanSection 區段掛「估算值」徽章(UI 與 PDF 匯出同步生效)、CSV 距離值加 `*` 後綴並於檔頭註解說明
- [ ] 選項 2(後續 issue):陸塊連通性判斷——引入輕量陸塊多邊形(如 Natural Earth 簡化版),同陸塊且 OSRM 失敗 → 直線 ×1.2 估算為 LAND(標記估算);不同陸塊 → 判 SEA/AIR。巴黎→柏林可正確判 LAND、檀香山→東京正確判 SEA/AIR,無需全球路網
- [ ] 確認 production OSRM 的圖資涵蓋範圍,寫入部署文件;必要時評估分區 extract 或外部路由 API
- [ ] dev 環境文件註明:台灣以外路線的陸運判定在本地為估算值

## Dependencies

- 與 issue 01(適用性引擎)相關:引擎對 fallback 陸運判「不適用」是正確行為,但輸入品質受 OSRM 覆蓋限制;選項 2 完成後引擎判定將自動改善

## Additional Notes

- 不建議以擴大 OSRM 圖資為主解:歐洲 extract 記憶體需求數十 GB 起,planet 級不適合 dev;公網 demo server 不可用於 production。
- 34,343km(檀香山→東京)這類怪值來源:sea 航線 + 兩端直線接駁段疊加,fallback 未標示時對使用者是無從辨識的錯誤數字。
