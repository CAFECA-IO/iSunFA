"use client";

import {
  IBalanceSheetItem,
  mockBalanceSheetData,
} from "@/interfaces/balance_sheet";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import { numberWithCommas } from "@/lib/utils/common";

const BalanceSheetSection = ({
  titleText,
  titleValue,
  items,
  total,
  barColor,
}: {
  titleText: string;
  titleValue: number;
  items: IBalanceSheetItem[];
  total: number;
  barColor: string;
}) => {
  return (
    <div className="mb-6">
      {/* Info: (20260330 - Julian) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
        <span className="font-bold text-slate-700">{titleText}</span>
        <span className="font-bold text-slate-700">
          {numberWithCommas(titleValue)}
        </span>
      </div>
      {/* Info: (20260330 - Julian) 項目內容 */}
      <div className="flex flex-col gap-1 px-3">
        {items.map((item) => (
          <div
            key={item.code}
            className="flex items-center justify-between border-b border-slate-50 py-2"
          >
            <div className="flex w-2/3 flex-col">
              <span className="text-[15px] font-medium text-slate-600">
                {item.name}
              </span>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{
                    width: `${(item.amount / total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-medium text-slate-700">
                {numberWithCommas(item.amount)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {((item.amount / total) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function BalanceSheetView() {
  // ToDo: Info: (20260330 - Julian) 串接 API
  const reportData = mockBalanceSheetData;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Info: (20260330 - Julian) 關鍵指標 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KeyMetricsCard
          title="流動比率 (Current Ratio)"
          value={`${reportData.metrics.currentRatio.toFixed(1)}%`}
          description="企業短期償債能力 (建議 > 200%)"
          textColor="text-emerald-600"
        />
        <KeyMetricsCard
          title="負債比率 (Debt Ratio)"
          value={`${reportData.metrics.debtRatio.toFixed(1)}%`}
          description="資產由債務支應的比例"
          textColor="text-indigo-600"
        />
        <KeyMetricsCard
          title="權益乘數 (Equity Multiplier)"
          value={`${reportData.metrics.equityMultiplier.toFixed(2)}x`}
          description="財務槓桿程度"
          textColor="text-amber-600"
        />
        <KeyMetricsCard
          title="營運資金 (Working Capital)"
          value={numberWithCommas(reportData.metrics.workingCapital)}
          description="可用於日常營運之淨資金"
          textColor="text-slate-700"
        />
      </div>

      {/* Info: (20260330 - Julian) 資產欄 & 負債權益欄 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Info: (20260330 - Julian) 資產欄 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
              <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
                資產 ASSETS
              </span>
              <span className="text-sm font-bold text-slate-400">% 總資產</span>
            </div>
            {/* Info: (20260330 - Julian) 流動資產 */}
            <BalanceSheetSection
              titleText="流動資產"
              titleValue={reportData.assets.current.total}
              items={reportData.assets.current.items}
              total={reportData.assets.total}
              barColor="bg-emerald-400"
            />
            {/* Info: (20260330 - Julian) 非流動資產 */}
            <BalanceSheetSection
              titleText="非流動資產"
              titleValue={reportData.assets.nonCurrent.total}
              items={reportData.assets.nonCurrent.items}
              total={reportData.assets.total}
              barColor="bg-emerald-400"
            />
          </div>
          {/* Info: (20260330 - Julian) 資產總計 */}
          <div className="flex items-center justify-between rounded-2xl bg-emerald-500 p-6 text-white shadow-sm">
            <span className="text-lg font-black tracking-widest">資產總計</span>
            <span className="text-2xl font-black">
              {numberWithCommas(reportData.assets.total)}
            </span>
          </div>
        </div>

        {/* Info: (20260330 - Julian) 負債權益欄 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
              <span className="text-lg font-black tracking-wider text-slate-800">
                負債及權益 LIAB. & EQUITY
              </span>
              <span className="text-sm font-bold text-slate-400">
                % 總負總權
              </span>
            </div>
            {/* Info: (20260330 - Julian) 流動負債 */}
            <BalanceSheetSection
              titleText="流動負債"
              titleValue={reportData.liabilities.current.total}
              items={reportData.liabilities.current.items}
              total={reportData.liabilities.total + reportData.equity.total}
              barColor="bg-indigo-400"
            />
            {/* Info: (20260330 - Julian) 非流動負債 */}
            <BalanceSheetSection
              titleText="非流動負債"
              titleValue={reportData.liabilities.nonCurrent.total}
              items={reportData.liabilities.nonCurrent.items}
              total={reportData.liabilities.total + reportData.equity.total}
              barColor="bg-indigo-400"
            />
            {/* Info: (20260330 - Julian) 權益 */}
            <BalanceSheetSection
              titleText="權益"
              titleValue={reportData.equity.total}
              items={reportData.equity.items}
              total={reportData.liabilities.total + reportData.equity.total}
              barColor="bg-amber-400"
            />
          </div>

          {/* Info: (20260330 - Julian) 負債權益總計 */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-6 text-white shadow-sm">
            <span className="text-lg font-black tracking-widest">
              負債及權益總計
            </span>
            <span className="text-2xl font-black">
              {numberWithCommas(
                reportData.liabilities.total + reportData.equity.total,
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Info: (20260330 - Julian) 備註 */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-center text-xs font-semibold text-blue-800 shadow-sm">
        這是一份涵蓋關鍵數據可讀性強化的資產負債表，包含業主權益比率、權益乘數、營運資金等重要指標，讓投資人更快速理解企業體質。
      </div>
    </div>
  );
}
