"use client";

import {
  ICashFlowStatementItem,
  mockCashFlowStatementData,
} from "@/interfaces/cash_flow_statement";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import { numberWithCommas } from "@/lib/utils/common";

const CashFlowSection = ({
  titleText,
  titleValue,
  items,
  barColor,
  totalAbsolute,
  isMainTotal = false,
}: {
  titleText: string;
  titleValue: number;
  items: ICashFlowStatementItem[];
  barColor: string;
  totalAbsolute: number; // Info: (20260330 - Julian) 用於計算百分比佔比的基底分母
  isMainTotal?: boolean;
}) => {
  return (
    <div className={`mb-6 ${isMainTotal ? "mt-4" : ""}`}>
      <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
        <span className="font-bold text-slate-700">{titleText}</span>
        <span
          className={`font-bold ${titleValue >= 0 ? "text-emerald-700" : "text-rose-700"}`}
        >
          {titleValue >= 0 ? "" : "-"}${numberWithCommas(Math.abs(titleValue))}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-3">
        {items.map((item, idx) => {
          const isNegative = item.amount < 0;
          const displayAmount = Math.abs(item.amount);
          const percentage =
            totalAbsolute > 0 ? (displayAmount / totalAbsolute) * 100 : 0;
          return (
            <div
              key={`${item.name}-${idx}`}
              className="flex items-center justify-between border-b border-slate-50 py-2"
            >
              <div className="flex w-2/3 flex-col">
                <span className="text-[15px] font-medium text-slate-600">
                  {item.name}
                </span>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${isNegative ? "bg-rose-400" : barColor}`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span
                  className={`font-medium ${isNegative ? "text-rose-600" : "text-slate-700"}`}
                >
                  {isNegative ? "-" : ""}
                  {numberWithCommas(displayAmount)}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CashFlowSheetView() {
  const reportData = mockCashFlowStatementData;

  // Info: (20260330 - Julian) 計算每個活動區塊內項目的絕對值總計，用於畫進度條
  const getTotalAbsolute = (items: ICashFlowStatementItem[]) =>
    items.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  const operatingAbsolute = getTotalAbsolute(
    reportData.activities.operating.items,
  );
  const investingAbsolute = getTotalAbsolute(
    reportData.activities.investing.items,
  );
  const financingAbsolute = getTotalAbsolute(
    reportData.activities.financing.items,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Info: (20260330 - Julian) 關鍵指標 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KeyMetricsCard
          title="自由現金流 (Free Cash Flow)"
          value={`$${numberWithCommas(reportData.metrics.freeCashFlow)}`}
          description="企業扣除資本支出後可自由運用的現金"
          textColor={
            reportData.metrics.freeCashFlow >= 0
              ? "text-emerald-600"
              : "text-rose-600"
          }
        />
        <KeyMetricsCard
          title="營業現金流對流動負債比率"
          value={`${reportData.metrics.operatingCashFlowRatio.toFixed(1)}%`}
          description="短期償還債務的能力 (建議 > 100%)"
          textColor="text-indigo-600"
        />
        <KeyMetricsCard
          title="現金流量允當比率"
          value={`${reportData.metrics.cashFlowAdequacyRatio.toFixed(1)}%`}
          description="營業現金是否足以支應資本支出及還債"
          textColor="text-amber-600"
        />
        <KeyMetricsCard
          title="期末現金餘額"
          value={`$${numberWithCommas(reportData.summary.endingBalance)}`}
          description="本期結束時的現金部位"
          textColor="text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Info: (20260330 - Julian) 左側：營業活動與投資活動 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
              <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
                營業與投資活動
              </span>
              <span className="text-sm font-bold text-slate-400">佔比%</span>
            </div>

            <CashFlowSection
              titleText="營業活動之現金流量"
              titleValue={reportData.activities.operating.total}
              items={reportData.activities.operating.items}
              totalAbsolute={operatingAbsolute}
              barColor="bg-emerald-400"
            />

            <CashFlowSection
              titleText="投資活動之現金流量"
              titleValue={reportData.activities.investing.total}
              items={reportData.activities.investing.items}
              totalAbsolute={investingAbsolute}
              barColor="bg-blue-400"
            />
          </div>
        </div>

        {/* Info: (20260330 - Julian) 右側：籌資活動與現金變動摘要 */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
              <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
                籌資活動與現金變動
              </span>
              <span className="text-sm font-bold text-slate-400">佔比%</span>
            </div>

            <CashFlowSection
              titleText="籌資活動之現金流量"
              titleValue={reportData.activities.financing.total}
              items={reportData.activities.financing.items}
              totalAbsolute={financingAbsolute}
              barColor="bg-amber-400"
            />

            <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 py-2">
                <span className="text-sm font-bold text-slate-500">
                  期初現金及約當現金餘額
                </span>
                <span className="font-medium text-slate-700">
                  ${numberWithCommas(reportData.summary.beginningBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 py-2">
                <span className="text-sm font-bold text-slate-500">
                  本期現金及約當現金增加(減少)數
                </span>
                <span
                  className={`font-bold ${reportData.summary.netIncreaseDecrease >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {reportData.summary.netIncreaseDecrease >= 0 ? "" : "-"}$
                  {numberWithCommas(
                    Math.abs(reportData.summary.netIncreaseDecrease),
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3 text-white">
                <span className="text-base font-black">
                  期末現金及約當現金餘額
                </span>
                <span className="text-xl font-black">
                  ${numberWithCommas(reportData.summary.endingBalance)}
                </span>
              </div>
            </div>

            {/* Info: (20260330 - Julian) 補充揭露 */}
            <div className="mt-8 flex justify-around rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="text-center">
                <div className="mb-1 text-xs font-bold text-indigo-400">
                  本期支付利息
                </div>
                <div className="font-semibold text-indigo-700">
                  ${numberWithCommas(reportData.supplementary.interestPaid)}
                </div>
              </div>
              <div className="border-l-2 border-indigo-100 pl-8 text-center">
                <div className="mb-1 text-xs font-bold text-indigo-400">
                  本期支付所得稅
                </div>
                <div className="font-semibold text-indigo-700">
                  ${numberWithCommas(reportData.supplementary.taxesPaid)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260330 - Julian) 備註 */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-center text-xs font-semibold text-blue-800 shadow-sm">
        此為強化可讀性的現金流量表，除營業、投資、籌資現金流外，更提供期初與期末餘額、自由現金流、相關財務比率及利息稅務等補充揭露，協助投資人快速掌握企業資金動能。
      </div>
    </div>
  );
}
