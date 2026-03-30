"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Loader2, CircleAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  IIncomeStatementItem,
  IIncomeStatement,
} from "@/interfaces/income_statement";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import { numberWithCommas } from "@/lib/utils/common";
import { ReportType } from "@/constants/financial_report";

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
    <div className="mb-6">
      {/* Info: (20260330 - Julian) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 py-2">
        <span className="font-bold text-slate-700">{titleText}</span>
        <span className="font-bold text-slate-700">
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
                <span className="text-[15px] font-medium text-slate-600">
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
                <span className="font-medium text-slate-700">
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

const LoadingPing = ({ size }: { size: number }) => {
  const circleSize = size * 1.5;
  const pingSize = size * 1.25;

  return (
    <div className="relative flex items-center justify-center">
      <div
        style={{ width: pingSize, height: pingSize }}
        className="absolute animate-ping rounded-full bg-emerald-100 opacity-60"
      ></div>
      <div
        style={{ width: circleSize, height: circleSize }}
        className="relative flex items-center justify-center rounded-full bg-emerald-50 shadow-sm ring-1 ring-emerald-100"
      >
        <Loader2 size={size} className="animate-spin text-emerald-500" />
      </div>
    </div>
  );
};

export default function IncomeStatementView() {
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
            `/api/v1/user/account_book/${accountBookId}/report?reportType=${ReportType.INCOME_STATEMENT}`,
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
  }, [accountBookId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-5 rounded-2xl border border-slate-100 bg-white/60 p-8 shadow-sm backdrop-blur-sm">
        <LoadingPing size={40} />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-black tracking-widest text-slate-800">
            正在為您生成綜合損益表
          </h2>
          <p className="text-sm font-medium text-slate-500">
            系統正在結算收入、支出與稅後淨利科目，並計算相關財務指標，請稍候...
          </p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-5 rounded-2xl border border-red-50 bg-red-50/50 p-8 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 shadow-sm ring-1 ring-red-200">
          <CircleAlert className="h-8 w-8 text-red-500" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-black tracking-widest text-slate-800">
            綜合損益表生成失敗
          </h2>
          <p className="text-sm font-medium text-slate-500">
            請確認該期間內是否有足夠的核發傳票資料，或是稍後再重新嘗試。
          </p>
        </div>
      </div>
    );
  }

  // Info: (20260330 - Julian) 解構報表資料
  const { metrics, sections } = reportData;
  // Info: (20260330 - Julian) 營收做為 100% 基準
  const baseRevenue = sections.revenue.total;

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KeyMetricsCard
        title="毛利率 (Gross Margin)"
        value={`${metrics.grossMargin.toFixed(1)}%`}
        description="產品初始獲利能力"
        textColor="text-emerald-600"
      />
      <KeyMetricsCard
        title="營益率 (Operating Margin)"
        value={`${metrics.operatingMargin.toFixed(1)}%`}
        description="本業營運獲利能力"
        textColor="text-indigo-600"
      />
      <KeyMetricsCard
        title="淨利率 (Net Profit Margin)"
        value={`${metrics.netProfitMargin.toFixed(1)}%`}
        description="最終稅後實質獲利能力"
        textColor="text-blue-600"
      />
      <KeyMetricsCard
        title="EBITDA 利潤率"
        value={`${metrics.ebitdaMargin.toFixed(1)}%`}
        description="可分配之現金獲利指標"
        textColor="text-amber-600"
      />
    </div>
  ) : (
    <div className="flex h-[150px] w-full items-center justify-center rounded-2xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const operatingSection = sections ? (
    <div className="flex flex-col gap-4">
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
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

        <div className="mb-6 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 p-4 shadow-sm">
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

        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
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
    <div className="flex flex-col gap-4">
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
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

        <div className="mb-6 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50 p-4 shadow-sm">
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
      <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-6 text-white shadow-sm">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Info: (20260330 - Julian) 左欄：營業損益 (本業) */}
        {operatingSection}
        {/* Info: (20260330 - Julian) 右欄：業外與稅 */}
        {nonOperatingSection}
      </div>

      {/* Info: (20260330 - Julian) 讀取能力與擴充指標備註清單 */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 text-sm leading-relaxed font-medium text-blue-900 shadow-sm">
        <h4 className="mb-2 flex items-center gap-2 truncate border-b border-blue-200 pb-2 text-base font-black text-blue-800">
          <Lightbulb size={20} />
          <span>綜合損益表分析升級：投資人洞察數據</span>
        </h4>
        <p className="mb-3 text-slate-700">
          綜合損益表除了能呈現基本的營業收入、營業毛利、營業利益、稅後淨利、每股盈餘、毛利率、營益率、淨利率外，還能透過以下進階數據強化對企業的理解：
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-slate-600 marker:text-blue-500">
          <li>
            <strong>EBITDA (稅息折舊及攤銷前利潤) 及 EBITDA利潤率：</strong>{" "}
            排除非現金費用(折舊)影響，更貼切反映企業的核心現金創造能力。
          </li>
          <li>
            <strong>利息保障倍數 (Interest Coverage Ratio)：</strong>{" "}
            衡量企業營業利益能覆蓋利息支出的倍數，評估其債務償還能力及財務健康度。
          </li>
          <li>
            <strong>營業費用率 (Operating Expense Ratio)：</strong>{" "}
            評估企業控制推銷及管理研發成本的效率，反映經營槓桿水準。
          </li>
          <li>
            <strong>業外收支佔比 (Non-Operating Ratio)：</strong>{" "}
            檢視企業是否過度依賴非本業(如投資、匯兌)之收益而影響整體財報品質。
          </li>
          <li>
            <strong>稅前淨利及有效稅率 (Effective Tax Rate)：</strong>{" "}
            了解企業稅賦負擔情形與是否有遞延所得稅抵減。
          </li>
          <li>
            <strong>各項成本/費用的結構變化與 YoY 成長率：</strong>{" "}
            包括營收成長率與費用變化率，以進行趨勢分析(Trend Analysis)。
          </li>
        </ul>
      </div>
    </div>
  );
}
