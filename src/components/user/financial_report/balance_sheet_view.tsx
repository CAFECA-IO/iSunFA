"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IBalanceSheetItem, IBalanceSheet } from "@/interfaces/balance_sheet";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import ReportPrintNote, { IReportNote } from "@/components/user/financial_report/report_print_note";
import { numberWithCommas } from "@/lib/utils/common";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import {
  LoadingPing,
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";

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
    <div className="mb-6 print:mb-2 print:break-inside-avoid">
      {/* Info: (20260330 - Julian) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-200 px-3 py-2">
        <span className="font-bold text-slate-700">{titleText}</span>
        <span className="text-base font-bold text-slate-700 print:text-sm">
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
              <span className="text-[15px] font-medium text-slate-600 print:text-sm">
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
              <span className="text-base font-medium text-slate-700 print:text-sm">
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

export default function BalanceSheetView({ period, year }: { period: ReportPeriod; year: number }) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [reportData, setReportData] = useState<IBalanceSheet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<IApiResponse<{ report: IBalanceSheet }>>(
            `/api/v1/user/account_book/${accountBookId}/report?reportType=${ReportType.BALANCE_SHEET}&period=${period}&year=${year}`,
          );
          if (res.payload) {
            setReportData(res.payload.report);
          }
        } catch (error) {
          console.error("Failed to fetch balance sheet:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSummary();
    } else {
      setIsLoading(false);
    }
  }, [accountBookId, period, year]);

  if (isLoading) {
    return (
      <ReportLoadingPlaceholder
        title="正在為您生成資產負債表"
        description="系統正在結算資產、負債與權益科目，並計算相關財務指標，請稍候..."
      />
    );
  }

  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <ReportErrorPlaceholder
        title="資產負債表生成失敗"
        description="請確認該期間內是否有足夠的核發傳票資料，或是稍後再重新嘗試。"
      />
    );
  }

  // Info: (20260330 - Julian) 解構報表資料
  const { assets, liabilities, equity, metrics } = reportData;

  // Info: (20260401 - Julian) 關鍵指標註解
  const balanceSheetNotes: IReportNote[] = [
    {
      title: "流動比率 (Current Ratio)",
      type: "流動性",
      mainDesc: "流動比率 = 流動資產 / 流動負債。",
      subDesc:
        "衡量企業短期償債能力，建議大於 200% ，表示償債能力良好。",
    },
    {
      title: "負債比率 (Debt Ratio)",
      type: "償債能力",
      mainDesc: "負債比率 = 總負債 / 總資產。",
      subDesc:
        "衡量企業償債能力，建議小於 50% ，表示償債能力良好。",
    },
    {
      title: "權益乘數 (Equity Multiplier)",
      type: "償債能力",
      mainDesc: "權益乘數 = 總資產 / 總權益。",
      subDesc:
        "衡量企業財務槓桿程度，建議小於 2 ，表示財務槓桿程度良好。",
    },
    {
      title: "營運資金 (Working Capital)",
      type: "流動性",
      mainDesc: "營運資金 = 流動資產 - 流動負債。",
      subDesc:
        "衡量企業短期償債能力，建議大於 0，表示償債能力良好。",
    },
  ]

  // Info: (20260401 - Julian) 資產負債表關鍵指標
  const balanceKeyMetricsData = [
    {
      title: "流動比率 (Current Ratio)",
      value: `${metrics.currentRatio.toFixed(1)}%`,
      description: "企業短期償債能力 (建議 > 200%)",
      textColor: "text-cyan-600",
      statusGood: metrics.currentRatio > 200,
    },
    {
      title: "負債比率 (Debt Ratio)",
      value: `${metrics.debtRatio.toFixed(1)}%`,
      description: "資產由債務支應的比例",
      textColor: "text-indigo-600",
      statusGood: metrics.debtRatio < 0.5,
    },
    {
      title: "權益乘數 (Equity Multiplier)",
      value: `${metrics.equityMultiplier.toFixed(2)}x`,
      description: "財務槓桿程度",
      textColor: "text-amber-600",
      statusGood: metrics.equityMultiplier < 2,
    },
    {
      title: "營運資金 (Working Capital)",
      value: `$${numberWithCommas(metrics.workingCapital)}`,
      description: "企業短期償債能力",
      textColor: "text-rose-600",
      statusGood: metrics.workingCapital > 0,
    },
  ];

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:flex">
      {balanceKeyMetricsData.map((metric) => {
        const note = balanceSheetNotes.find((note) => note.title === metric.title);
       return (
        <KeyMetricsCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          description={metric.description}
          textColor={metric.textColor}
          statusGood={metric.statusGood}
          tooltip={
            <>
              <span className="font-bold">{note?.mainDesc}</span>
              <br />
              <span>{note?.subDesc}</span>
            </>
          }
        />
      )
      })}
    </div>
  ) : (
    <div className="flex h-[150px] w-full items-center justify-center rounded-2xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const assetsSection = assets ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm print:p-4 box-decoration-clone">
        <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
          <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
            資產 ASSETS
          </span>
          <span className="text-sm font-bold text-slate-400">% 總資產</span>
        </div>
        {/* Info: (20260330 - Julian) 流動資產 */}
        <BalanceSheetSection
          titleText="流動資產"
          titleValue={assets.current.total}
          items={assets.current.items}
          total={assets.total}
          barColor="bg-emerald-400"
        />
        {/* Info: (20260330 - Julian) 非流動資產 */}
        <BalanceSheetSection
          titleText="非流動資產"
          titleValue={assets.nonCurrent.total}
          items={assets.nonCurrent.items}
          total={assets.total}
          barColor="bg-emerald-400"
        />
      </div>
      {/* Info: (20260330 - Julian) 資產總計 */}
      <div className="flex items-center justify-between rounded-2xl bg-emerald-500 p-6 text-white shadow-sm print:break-inside-avoid">
        <span className="text-lg font-black tracking-widest">資產總計</span>
        <span className="text-2xl font-black">
          {numberWithCommas(assets.total)}
        </span>
      </div>
    </div>
  ) : (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const liabilitiesAndEquitySection =
    liabilities && equity ? (
      <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
        <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm print:p-4 box-decoration-clone">
          <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
            <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
              負債及權益 LIAB. & EQUITY
            </span>
            <span className="text-sm font-bold text-slate-400">% 總負總權</span>
          </div>
          {/* Info: (20260330 - Julian) 流動負債 */}
          <BalanceSheetSection
            titleText="流動負債"
            titleValue={liabilities.current.total}
            items={liabilities.current.items}
            total={liabilities.total + equity.total}
            barColor="bg-indigo-400"
          />
          {/* Info: (20260330 - Julian) 非流動負債 */}
          <BalanceSheetSection
            titleText="非流動負債"
            titleValue={liabilities.nonCurrent.total}
            items={liabilities.nonCurrent.items}
            total={liabilities.total + equity.total}
            barColor="bg-indigo-400"
          />
          {/* Info: (20260330 - Julian) 權益 */}
          <BalanceSheetSection
            titleText="權益"
            titleValue={equity.total}
            items={equity.items}
            total={liabilities.total + equity.total}
            barColor="bg-amber-400"
          />
        </div>

        {/* Info: (20260330 - Julian) 負債權益總計 */}
        <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-6 text-white shadow-sm print:break-inside-avoid">
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
    ) : (
      <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-white p-5">
        <LoadingPing size={40} />
      </div>
    );

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Info: (20260330 - Julian) 關鍵指標 */}
      {keyMetricsBanner}

      {/* Info: (20260330 - Julian) 資產欄 & 負債權益欄 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:flex print:items-start">
        {/* Info: (20260330 - Julian) 資產欄 */}
        {assetsSection}
        {/* Info: (20260330 - Julian) 負債權益欄 */}
        {liabilitiesAndEquitySection}
      </div>

      {/* Info: (20260330 - Julian) 財務指標註解與判斷標準（列印時顯示） */}
      <ReportPrintNote notes={balanceSheetNotes} />
    </div>
  );
}
