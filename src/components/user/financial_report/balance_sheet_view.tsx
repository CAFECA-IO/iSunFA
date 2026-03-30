"use client";

import { mockBalanceSheetData } from "@/interfaces/balance_sheet";

// enum ColomnType {
//   ASSETS = "ASSETS",
//   LIABILITIES_AND_EQUITY = "LIABILITIES_AND_EQUITY",
// }

// Info: (20260330 - Julian) 關鍵指標 card
const KeyMetricsCard = ({
  title,
  value,
  description,
  textColor,
}: {
  title: string;
  value: string;
  description: string;
  textColor: string;
}) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
        {title}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-black ${textColor}`}>{value}</span>
      </div>
      <p className="mt-2 text-[11px] font-medium text-slate-400">
        {description}
      </p>
    </div>
  );
};

export default function BalanceSheetView() {
  // ToDo: Info: (20260330 - Julian) 串接 API
  const reportData = mockBalanceSheetData;

  // Info: (20260330 - Julian) 轉換幣值
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US").format(val);

  return (
    <div className="flex flex-col gap-4">
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
          value={formatCurrency(reportData.metrics.workingCapital)}
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

            {/* Current Assets */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
                <span className="font-bold text-slate-700">流動資產</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(reportData.assets.current.total)}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {reportData.assets.current.items.map((item) => (
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
                          className="h-full rounded-full bg-emerald-400"
                          style={{
                            width: `${(item.amount / reportData.assets.total) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(
                          (item.amount / reportData.assets.total) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-Current Assets */}
            <div className="mb-2">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
                <span className="font-bold text-slate-700">非流動資產</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(reportData.assets.nonCurrent.total)}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {reportData.assets.nonCurrent.items.map((item) => (
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
                          className="h-full rounded-full bg-emerald-400"
                          style={{
                            width: `${(item.amount / reportData.assets.total) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(
                          (item.amount / reportData.assets.total) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info: (20260330 - Julian) 資產總計 */}
          <div className="flex items-center justify-between rounded-2xl bg-emerald-500 p-6 text-white shadow-sm">
            <span className="text-lg font-black tracking-widest">資產總計</span>
            <span className="text-2xl font-black">
              {formatCurrency(reportData.assets.total)}
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

            {/* Current Liabilities */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
                <span className="font-bold text-slate-700">流動負債</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(reportData.liabilities.current.total)}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {reportData.liabilities.current.items.map((item) => (
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
                          className="h-full rounded-full bg-indigo-400"
                          style={{
                            width: `${(item.amount / (reportData.liabilities.total + reportData.equity.total)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(
                          (item.amount /
                            (reportData.liabilities.total +
                              reportData.equity.total)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-Current Liabilities */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
                <span className="font-bold text-slate-700">非流動負債</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(reportData.liabilities.nonCurrent.total)}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {reportData.liabilities.nonCurrent.items.map((item) => (
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
                          className="h-full rounded-full bg-indigo-400"
                          style={{
                            width: `${(item.amount / (reportData.liabilities.total + reportData.equity.total)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(
                          (item.amount /
                            (reportData.liabilities.total +
                              reportData.equity.total)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equity */}
            <div className="mb-2">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
                <span className="font-bold text-slate-700">權益</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(reportData.equity.total)}
                </span>
              </div>
              <div className="flex flex-col gap-1 px-3">
                {reportData.equity.items.map((item) => (
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
                          className="h-full rounded-full bg-amber-400"
                          style={{
                            width: `${(item.amount / (reportData.liabilities.total + reportData.equity.total)) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {(
                          (item.amount /
                            (reportData.liabilities.total +
                              reportData.equity.total)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total Liab & Eq Summary */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-6 text-white shadow-sm">
            <span className="text-lg font-black tracking-widest">
              負債及權益總計
            </span>
            <span className="text-2xl font-black">
              {formatCurrency(
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
