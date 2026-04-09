"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  IIncomeStatementItem,
  IIncomeStatement,
} from "@/interfaces/income_statement";
import KeyMetricsCard, {
  TooltipAlign,
} from "@/components/user/financial_report/key_metrics_card";
import ReportPrintNote, {
  IReportNote,
} from "@/components/user/financial_report/report_print_note";
import { numberWithCommas } from "@/lib/utils/common";
import { useTranslation } from "@/i18n/i18n_context";
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
    <div className="mb-4 lg:mb-6 print:mb-2 print:break-inside-avoid">
      {/* Info: (20260330 - Julian) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="font-bold text-gray-700">{titleText}</span>
        <span className="text-base font-bold text-gray-700 print:text-sm">
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
              className="flex items-center justify-between border-b border-gray-50 py-1 lg:py-2"
            >
              <div className="flex w-2/3 flex-col">
                <span className="text-xs font-medium text-gray-600 lg:text-base print:text-sm">
                  {item.name}
                </span>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`, // Info: (20260330 - Julian) 避免破版
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-base font-medium text-gray-700 print:text-sm">
                  {item.amount < 0 || isValueNegative
                    ? `(${numberWithCommas(Math.abs(item.amount))})`
                    : numberWithCommas(item.amount)}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
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

  const { t } = useTranslation();

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
        title={t("income_statement_view.loading_title")}
        description={t("income_statement_view.loading_desc")}
      />
    );
  }

  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <ReportErrorPlaceholder
        title={t("income_statement_view.error_title")}
        description={t("income_statement_view.error_desc")}
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
      title: t("income_statement_view.metric_gm_title"),
      type: t("income_statement_view.note_gm_type"),
      mainDesc: t("income_statement_view.note_gm_main"),
      subDesc: t("income_statement_view.note_gm_sub"),
    },
    {
      title: t("income_statement_view.metric_om_title"),
      type: t("income_statement_view.note_om_type"),
      mainDesc: t("income_statement_view.note_om_main"),
      subDesc: t("income_statement_view.note_om_sub"),
    },
    {
      title: t("income_statement_view.metric_npm_title"),
      type: t("income_statement_view.note_npm_type"),
      mainDesc: t("income_statement_view.note_npm_main"),
      subDesc: t("income_statement_view.note_npm_sub"),
    },
    {
      title: t("income_statement_view.metric_ebitda_title"),
      type: t("income_statement_view.note_ebitda_type"),
      mainDesc: t("income_statement_view.note_ebitda_main"),
      subDesc: t("income_statement_view.note_ebitda_sub"),
    },
  ];

  // Info: (20260401 - Julian) 綜合損益表關鍵指標
  const incomeKeyMetricsData = [
    {
      title: t("income_statement_view.metric_gm_title"),
      value: `${metrics.grossMargin.toFixed(1)}%`,
      description: t("income_statement_view.metric_gm_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.grossMargin >= 50,
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("income_statement_view.metric_om_title"),
      value: `${metrics.operatingMargin.toFixed(1)}%`,
      description: t("income_statement_view.metric_om_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.operatingMargin >= 15,
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("income_statement_view.metric_npm_title"),
      value: `${metrics.netProfitMargin.toFixed(1)}%`,
      description: t("income_statement_view.metric_npm_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.netProfitMargin >= 10,
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("income_statement_view.metric_ebitda_title"),
      value: `${metrics.ebitdaMargin.toFixed(1)}%`,
      description: t("income_statement_view.metric_ebitda_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.ebitdaMargin >= 15,
      tooltipAlign: TooltipAlign.RIGHT,
    },
  ];

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4 print:flex">
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
            tooltipAlign={metric.tooltipAlign}
          />
        );
      })}
    </div>
  ) : (
    <div className="flex h-[150px] w-full items-center justify-center rounded-xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const operatingSection = sections ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
        <div className="mb-4 flex items-end justify-between border-b-2 border-gray-100 pb-3">
          <span className="text-base font-black tracking-wider text-gray-800 uppercase lg:text-lg">
            {t("income_statement_view.section_op")}
          </span>
          <span className="text-sm font-bold text-gray-400">
            {t("income_statement_view.section_percent_rev")}
          </span>
        </div>

        <IncomeStatementSection
          titleText={t("income_statement_view.section_rev")}
          titleValue={sections.revenue.total}
          items={sections.revenue.items}
          baseDivisor={baseRevenue}
          barColor="bg-gray-300"
        />

        <IncomeStatementSection
          titleText={t("income_statement_view.section_cogs")}
          titleValue={sections.cogs.total}
          items={sections.cogs.items}
          baseDivisor={baseRevenue}
          barColor="bg-gray-200"
        />

        <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 print:break-inside-avoid">
          <span className="text-md font-bold text-gray-700">
            {t("income_statement_view.section_gp")}
          </span>
          <span className="text-xl font-bold text-gray-700">
            {numberWithCommas(sections.grossProfit.total)}
          </span>
        </div>

        <IncomeStatementSection
          titleText={t("income_statement_view.section_opex")}
          titleValue={sections.operatingExpenses.total}
          items={sections.operatingExpenses.items}
          baseDivisor={baseRevenue}
          barColor="bg-gray-300"
        />

        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 print:break-inside-avoid">
          <span className="text-md font-bold text-gray-700">
            {t("income_statement_view.section_oi")}
          </span>
          <span className="text-xl font-black text-gray-800">
            {numberWithCommas(sections.operatingIncome.total)}
          </span>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const nonOperatingSection = sections ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
        <div className="mb-4 flex items-end justify-between border-b-2 border-gray-100 pb-3">
          <span className="text-base font-black tracking-wider text-gray-800 uppercase lg:text-lg">
            {t("income_statement_view.section_nonop_tax")}
          </span>
          <span className="text-sm font-bold text-gray-400">
            {t("income_statement_view.section_percent_rev")}
          </span>
        </div>

        <IncomeStatementSection
          titleText={t("income_statement_view.section_nonop_inc")}
          titleValue={sections.nonOperating.total}
          items={sections.nonOperating.items}
          baseDivisor={baseRevenue}
          barColor="bg-gray-300"
        />

        <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 print:break-inside-avoid">
          <span className="text-md font-bold text-gray-700">
            {t("income_statement_view.section_ibt")}
          </span>
          <span className="text-xl font-bold text-gray-700">
            {numberWithCommas(sections.incomeBeforeTax.total)}
          </span>
        </div>

        <IncomeStatementSection
          titleText={t("income_statement_view.section_tax")}
          titleValue={sections.taxExpense.total}
          items={sections.taxExpense.items}
          baseDivisor={baseRevenue}
          barColor="bg-gray-200"
        />
      </div>

      {/* Info: (20260330 - Julian) 最終淨利 */}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-900 p-6 print:break-inside-avoid">
        <span className="text-lg font-black tracking-widest text-white uppercase">
          {t("income_statement_view.section_ni")}
        </span>
        <span className="text-3xl font-black text-white">
          {numberWithCommas(sections.netIncome.total)}
        </span>
      </div>
    </div>
  ) : (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Info: (20260330 - Julian) 關鍵指標 */}
      {keyMetricsBanner}
      {/* Info: (20260330 - Julian) 營業損益 & 業外損益與稅後淨利 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-4 print:flex print:items-start">
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
