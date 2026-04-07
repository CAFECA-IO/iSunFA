"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  IIncomeStatementItem,
  IIncomeStatement,
} from "@/interfaces/income_statement";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import ReportPrintNote, { IReportNote } from "@/components/user/financial_report/report_print_note";
import { numberWithCommas } from "@/lib/utils/common";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import {
  LoadingPing,
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";

const IncomeStatementSection = ({
  titleText,
  titleValue,
  items,
  baseDivisor, // Info: (20260330 - Julian) 固定以營業收入做分母計算佔比
  barColor,
  isValueNegative = false, // Info: (20260330 - Julian) 若為費損，是否在顯示時加負號或特別標記
}: {
  titleText: string;
  titleValue: number;
  items: IIncomeStatementItem[];
  baseDivisor: number;
  barColor: string;
  isValueNegative?: boolean;
}) => {
  return (
    <div className="mb-6 print:mb-2 print:break-inside-avoid">
      {/* Info: (20260330 - Julian) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
        <span className="font-bold text-slate-700">{titleText}</span>
        <span className="font-bold text-slate-700 text-base print:text-sm">
          {titleValue < 0
            ? `(${numberWithCommas(Math.abs(titleValue))})`
            : numberWithCommas(titleValue)}
        </span>
      </div>
      {/* Info: (20260330 - Julian) 項目內容 */}
      <div className="flex flex-col gap-1 px-3">
        {items.map((item) => {
          const percentage =
            baseDivisor !== 0 ? (Math.abs(item.amount) / baseDivisor) * 100 : 0;
          return (
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
                      width: `${Math.min(percentage, 100)}%`, // Info: (20260330 - Julian) 避免破版
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-medium text-slate-700 text-base print:text-sm">
                  {item.amount < 0 || isValueNegative
                    ? `(${numberWithCommas(Math.abs(item.amount))})`
                    : numberWithCommas(item.amount)}
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

export default function IncomeStatementView({
  period,
  year,
}: {
  period: ReportPeriod;
  year: number;
}) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [reportData, setReportData] = useState<IIncomeStatement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<IApiResponse<{ report: IIncomeStatement }>>(
            `/api/v1/user/account_book/${accountBookId}/report?reportType=${ReportType.INCOME_STATEMENT}&period=${period}&year=${year}`,
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
        title="正在為您生成綜合損益表"
        description="系統正在結算收入、支出與稅後淨利科目，並計算相關財務指標，請稍候..."
      />
    );
  }

  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <ReportErrorPlaceholder
        title="綜合損益表生成失敗"
        description="請確認該期間內是否有足夠的核發傳票資料，或是稍後再重新嘗試。"
      />
    );
  }

  // Info: (20260330 - Julian) 解構報表資料
  const { metrics, sections } = reportData;
  // Info: (20260330 - Julian) 營收做為 100% 基準
  const baseRevenue = sections.revenue.total;

    // Info: (20260401 - Julian) 關鍵指標註解
    const incomeNotes: IReportNote[] = [
      {
        title: "毛利率 (Gross Margin)",
        type: "獲利能力",
        mainDesc: "毛利率 = (營業收入 - 營業成本) / 營業收入。",
        subDesc:
          "衡量企業產品或服務的初始獲利能力，建議大於 50%，表示產品或服務的初始獲利能力良好。",
      },
      {
        title: "營益率 (Operating Margin)",
        type: "獲利能力",
        mainDesc: "營益率 = 營業利益 / 營業收入。",
        subDesc:
          "衡量企業本業營運獲利能力，建議大於 15%，表示本業營運獲利能力良好。",
      },
      {
        title: "淨利率 (Net Profit Margin)",
        type: "獲利能力",
        mainDesc: "淨利率 = 稅後淨利 / 營業收入。",
        subDesc:
          "衡量企業最終稅後實質獲利能力，建議大於 10%，表示最終稅後實質獲利能力良好。",
      },
      {
        title: "EBITDA 利潤率",
        type: "獲利能力",
        mainDesc: "EBITDA 利潤率 = EBITDA / 營業收入。",
        subDesc:
          "衡量企業可分配之現金獲利指標，建議大於 15%，表示可分配之現金獲利指標良好。",
      },
    ];
  
    // Info: (20260401 - Julian) 綜合損益表關鍵指標
    const incomeKeyMetricsData = [
      {
        title: "毛利率 (Gross Margin)",
        value: `${metrics.grossMargin.toFixed(1)}%`,
        description: "產品初始獲利能力",
        textColor: "text-cyan-600",
        statusGood: metrics.grossMargin >= 50,
      },
      {
        title: "營益率 (Operating Margin)",
        value: `${metrics.operatingMargin.toFixed(1)}%`,
        description: "本業營運獲利能力",
        textColor: "text-indigo-600",
        statusGood: metrics.operatingMargin >= 15,
      },
      {
        title: "淨利率 (Net Profit Margin)",
        value: `${metrics.netProfitMargin.toFixed(1)}%`,
        description: "最終稅後實質獲利能力",
        textColor: "text-amber-600",
        statusGood: metrics.netProfitMargin >= 10,
      },
      {
        title: "EBITDA 利潤率",
        value: `${metrics.ebitdaMargin.toFixed(1)}%`,
        description: "可分配之現金獲利指標",
        textColor: "text-slate-700",
        statusGood: metrics.ebitdaMargin >= 15,
      },
    ];

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:flex">
      {incomeKeyMetricsData.map((metric) => {
              const note = incomeNotes.find((note) => note.title === metric.title);
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

  const operatingSection = sections ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm print:p-4 box-decoration-clone">
        <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
          <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
            營業活動 OPERATING
          </span>
          <span className="text-sm font-bold text-slate-400">% 營收</span>
        </div>

        <IncomeStatementSection
          titleText="營業收入 (Revenue)"
          titleValue={sections.revenue.total}
          items={sections.revenue.items}
          baseDivisor={baseRevenue}
          barColor="bg-sky-400"
        />

        <IncomeStatementSection
          titleText="營業成本 (COGS)"
          titleValue={sections.cogs.total}
          items={sections.cogs.items}
          baseDivisor={baseRevenue}
          barColor="bg-rose-400"
        />

        <div className="mb-6 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 p-4 shadow-sm print:break-inside-avoid">
          <span className="text-md font-bold text-slate-700">
            營業毛利 (Gross Profit)
          </span>
          <span className="text-xl font-bold text-sky-700">
            {numberWithCommas(sections.grossProfit.total)}
          </span>
        </div>

        <IncomeStatementSection
          titleText="營業費用 (Operating Expenses)"
          titleValue={sections.operatingExpenses.total}
          items={sections.operatingExpenses.items}
          baseDivisor={baseRevenue}
          barColor="bg-rose-400"
        />

        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm print:break-inside-avoid">
          <span className="text-md font-bold text-slate-700">
            營業利益 (Operating Income)
          </span>
          <span className="text-xl font-black text-indigo-700">
            {numberWithCommas(sections.operatingIncome.total)}
          </span>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-[400px] w-full items-center justify-center rounded-2xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const nonOperatingSection = sections ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm print:p-4 box-decoration-clone">
        <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
          <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
            業外與稅 NON-OP & TAX
          </span>
          <span className="text-sm font-bold text-slate-400">% 營收</span>
        </div>

        <IncomeStatementSection
          titleText="營業外收入及支出 (Non-Op)"
          titleValue={sections.nonOperating.total}
          items={sections.nonOperating.items}
          baseDivisor={baseRevenue}
          barColor="bg-violet-400"
        />

        <div className="mb-6 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 p-4 shadow-sm print:break-inside-avoid">
          <span className="text-md font-bold text-slate-700">
            稅前淨利 (Income Before Tax)
          </span>
          <span className="text-xl font-bold text-violet-700">
            {numberWithCommas(sections.incomeBeforeTax.total)}
          </span>
        </div>

        <IncomeStatementSection
          titleText="所得稅費用 (Tax Expense)"
          titleValue={sections.taxExpense.total}
          items={sections.taxExpense.items}
          baseDivisor={baseRevenue}
          barColor="bg-rose-400"
        />
      </div>

      {/* Info: (20260330 - Julian) 最終淨利 */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-6 text-white shadow-sm print:break-inside-avoid">
        <span className="text-lg font-black tracking-widest uppercase">
          本期淨利 (NET INCOME)
        </span>
        <span className="text-3xl font-black text-emerald-400">
          {numberWithCommas(sections.netIncome.total)}
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
      {/* Info: (20260330 - Julian) 營業損益 & 業外損益與稅後淨利 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:flex print:items-start">
        {/* Info: (20260330 - Julian) 左欄：營業損益 (本業) */}
        {operatingSection}
        {/* Info: (20260330 - Julian) 右欄：業外與稅 */}
        {nonOperatingSection}
      </div>
      {/* Info: (20260401 - Julian) 綜合損益表註解 */}
      <ReportPrintNote notes={incomeNotes} />
    </div>
  );
}
