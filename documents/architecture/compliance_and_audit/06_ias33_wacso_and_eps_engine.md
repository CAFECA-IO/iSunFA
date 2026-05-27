# 008. WACSO 實作與 EPS 計算（精細數學引擎）

> **Date**: 2026-05-27
> **Author**: Tzuhan
> **Status**: Paused
> **Category**: Mathematical & Accounting Engine

## 背景與問題 (Background)
目前的財務報表產生器中，每股盈餘 (EPS, Earnings per Share) 的計算被暫停，並在 `cross_report_metrics.ts` 中強制回傳 `null`。
其原因是，最初的實作僅單純將「期末股本」除以「面額」來求得期末總股數，並將其作為 EPS 的分母。根據國際會計準則 **IAS 33 (Earnings per Share)**，EPS 必須使用「流通在外加權平均股數 (WACSO, Weighted Average Number of Ordinary Shares Outstanding)」作為分母。
若公司在期中或年底辦理現金增資發行新股，直接使用期末總股數會導致整年的 EPS 被嚴重低估與人為稀釋。

## 決議與後續實作 (Resolution & Next Steps)
我們決議在尚未實作 WACSO 演算法之前，絕對不對外提供錯誤的 EPS 指標。該任務目前暫停，等待高精度數學引擎開發資源到位。

未來重啟該任務時的實作要點如下：
1. **股本餘額與面額追蹤**：可透過 `AccountUtil.isDescendantOf(item.code, SystemAccountNodes.COMMON_STOCK_ROOT, TW_ACCOUNTS)` 進行樹狀溯源取得各期股本餘額。面額可從 `balanceSheet.metrics.parValue` 取得。
2. **時間加權權重計算**：必須具備讀取增資/減資事件（包含日期）的能力，並按當年度剩餘天數比例進行時間加權 (e.g. 10/1 增資 1,000 股，加權權重為 1,000 * (3/12) = 250 股)。
3. **高精度數學引擎 (MoneyUtil)**：所有加權平均與除法運算必須全面使用基於 `decimal.js` 封裝的 `MoneyUtil`，嚴禁使用原生浮點數避免截斷誤差。
