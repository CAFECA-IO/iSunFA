"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  ICashFlowStatementItem,
  ICashFlowStatement,
} from "@/interfaces/cash_flow_statement";
import KeyMetricsCard, {
  TooltipAlign,
} from "@/components/user/financial_report/key_metrics_card";
import ReportPrintNote, {
  IReportNote,
} from "@/components/user/financial_report/report_print_note";
import { numberWithCommas } from "@/lib/utils/common";
import { MoneyUtil } from "@/lib/utils/money";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import {
  LoadingPing,
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";

const CashFlowSection = ({
  titleText,
  titleValue,
  items,
  barColor,
  totalAbsolute,
  isMainTotal = false,
}: {
  titleText: string;
  titleValue: string | number;
  items: ICashFlowStatementItem[];
  barColor: string;
  totalAbsolute: number; // Info: (20260330 - Julian) 用於計算百分比佔比的基底分母
  isMainTotal?: boolean;
}) => {
  return (
    <div
      className={`mb-4 lg:mb-6 print:mb-2 print:break-inside-avoid ${isMainTotal ? "mt-4" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 shadow-none">
        <span className="font-bold text-gray-700">{titleText}</span>
        <span className={"text-base font-bold text-gray-900 print:text-sm"}>
          {!MoneyUtil.toDecimal(titleValue).isNegative() ? "" : "-"}$
          {numberWithCommas(MoneyUtil.toDecimal(titleValue).abs().toString())}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-3">
        {items.map((item, idx) => {
          const isNegative = MoneyUtil.toDecimal(item.amount).isNegative();
          const displayAmount = MoneyUtil.toDecimal(item.amount)
            .abs()
            .toNumber();
          const percentage =
            totalAbsolute > 0 ? (displayAmount / totalAbsolute) * 100 : 0;
          return (
            <div
              key={`${item.name}-${idx}`}
              className="flex items-center justify-between border-b border-gray-50 py-1 lg:py-2"
            >
              <div className="flex w-2/3 flex-col">
                <span className="text-xs font-medium text-gray-600 lg:text-base print:text-sm">
                  {item.name}
                </span>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
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
                  className={"text-base font-bold text-gray-900 print:text-sm"}
                >
                  {isNegative ? "-" : ""}
                  {numberWithCommas(displayAmount)}
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

export default function CashFlowSheetView({
  period,
  year,
  onUnverifiedItemsChange = () => {},
}: {
  period: ReportPeriod;
  year: number;
  onUnverifiedItemsChange?: (
    items: { id: string; note: string; type: string }[],
  ) => void;
}) {
  const params = useParams();
  const { t } = useTranslation();
  const accountBookId = params?.account_book_id as string;

  const [reportData, setReportData] = useState<ICashFlowStatement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<
            IApiResponse<{
              report: ICashFlowStatement;
              unverifiedItems?: { id: string; note: string; type: string }[];
            }>
          >(
            `/api/v1/user/account_book/${accountBookId}/report?reportType=${ReportType.CASH_FLOW}&period=${period}&year=${year}`,
          );
          if (res.payload) {
            setReportData(res.payload.report);
            if (
              res.payload.unverifiedItems !== undefined &&
              onUnverifiedItemsChange
            ) {
              onUnverifiedItemsChange(res.payload.unverifiedItems);
            }
          }
        } catch (error) {
          console.error("Failed to fetch cash flow statement:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSummary();
    } else {
      setIsLoading(false);
    }
  }, [accountBookId, period, year, onUnverifiedItemsChange]);

  if (isLoading) {
    return (
      <ReportLoadingPlaceholder
        title={t("cash_flow_statement_view.loading_title")}
        description={t("cash_flow_statement_view.loading_desc")}
      />
    );
  }

  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <ReportErrorPlaceholder
        title={t("cash_flow_statement_view.error_title")}
        description={t("cash_flow_statement_view.error_desc")}
      />
    );
  }

  // Info: (20260330 - Julian) 解構報表資料
  const { metrics, activities, summary, supplementary } = reportData;

  // Info: (20260401 - Julian) 關鍵指標註解
  const cashFlowNotes: IReportNote[] = [
    {
      title: t("cash_flow_statement_view.metric_fcf_title"),
      type: t("cash_flow_statement_view.note_fcf_type"),
      mainDesc: t("cash_flow_statement_view.note_fcf_main"),
      subDesc: t("cash_flow_statement_view.note_fcf_sub"),
    },
    {
      title: t("cash_flow_statement_view.metric_ocf_ratio_title"),
      type: t("cash_flow_statement_view.note_ocf_ratio_type"),
      mainDesc: t("cash_flow_statement_view.note_ocf_ratio_main"),
      subDesc: t("cash_flow_statement_view.note_ocf_ratio_sub"),
    },
    {
      title: t("cash_flow_statement_view.metric_cf_adequacy_title"),
      type: t("cash_flow_statement_view.note_ocf_ratio_type"),
      mainDesc: t("cash_flow_statement_view.note_cf_adequacy_main"),
      subDesc: t("cash_flow_statement_view.note_cf_adequacy_sub"),
    },
    {
      title: t("cash_flow_statement_view.metric_ending_balance_title"),
      type: t("cash_flow_statement_view.note_ocf_ratio_type"),
      mainDesc: t("cash_flow_statement_view.note_ending_balance_main"),
      subDesc: t("cash_flow_statement_view.note_ending_balance_sub"),
    },
  ];

  // Info: (20260401 - Julian) 現金流量表關鍵指標
  const cashFlowKeyMetricsData = [
    {
      title: t("cash_flow_statement_view.metric_fcf_title"),
      value: `$${numberWithCommas(metrics.freeCashFlow)}`,
      description: t("cash_flow_statement_view.metric_fcf_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.freeCashFlow >= 0,
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("cash_flow_statement_view.metric_ocf_ratio_title"),
      value:
        metrics.operatingCashFlowRatio !== null
          ? `${metrics.operatingCashFlowRatio.toFixed(1)}%`
          : "N/A",
      description: t("cash_flow_statement_view.metric_ocf_ratio_desc"),
      textColor: "text-gray-900",
      statusGood:
        metrics.operatingCashFlowRatio !== null
          ? metrics.operatingCashFlowRatio >= 100
          : false,
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("cash_flow_statement_view.metric_cf_adequacy_title"),
      value:
        metrics.cashFlowAdequacyRatio !== null
          ? `${metrics.cashFlowAdequacyRatio.toFixed(1)}%`
          : "N/A",
      description: t("cash_flow_statement_view.metric_cf_adequacy_desc"),
      textColor: "text-gray-900",
      statusGood:
        metrics.cashFlowAdequacyRatio !== null
          ? metrics.cashFlowAdequacyRatio >= 100
          : false,
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("cash_flow_statement_view.metric_ending_balance_title"),
      value: `$${numberWithCommas(summary.endingBalance)}`,
      description: t("cash_flow_statement_view.metric_ending_balance_desc"),
      textColor: "text-gray-900",
      statusGood: !MoneyUtil.toDecimal(summary.endingBalance).isNegative(),
      tooltipAlign: TooltipAlign.RIGHT,
    },
  ];

  // Info: (20260330 - Julian) 計算每個活動區塊內項目的絕對值總計，用於畫進度條
  const getTotalAbsolute = (items: ICashFlowStatementItem[]) =>
    items.reduce(
      (acc, curr) => acc + MoneyUtil.toDecimal(curr.amount).abs().toNumber(),
      0,
    );

  // Info: (20260330 - Julian) 取得各活動區塊的絕對值總計
  const operatingAbsolute = getTotalAbsolute(activities.operating.items);
  const investingAbsolute = getTotalAbsolute(activities.investing.items);
  const financingAbsolute = getTotalAbsolute(activities.financing.items);

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4 print:flex">
      {cashFlowKeyMetricsData.map((metric) => {
        const note = cashFlowNotes.find((note) => note.title === metric.title);
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

  const operatingInvestingSection = activities ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
        <div className="mb-4 flex items-end justify-between border-b border-gray-200 pb-3">
          <span className="text-base font-black tracking-wider text-gray-800 uppercase lg:text-lg">
            {t("cash_flow_statement_view.section_op_inv")}
          </span>
          <span className="text-sm font-bold text-gray-400">
            {t("cash_flow_statement_view.section_ratio")}
          </span>
        </div>

        <CashFlowSection
          titleText={t("cash_flow_statement_view.section_operating")}
          titleValue={activities.operating.total}
          items={activities.operating.items}
          totalAbsolute={operatingAbsolute}
          barColor="bg-gray-300"
        />

        <CashFlowSection
          titleText={t("cash_flow_statement_view.section_investing")}
          titleValue={activities.investing.total}
          items={activities.investing.items}
          totalAbsolute={investingAbsolute}
          barColor="bg-gray-200"
        />
      </div>
    </div>
  ) : (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const financingCashFlowSection =
    activities && summary && supplementary ? (
      <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
        <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
          <div className="mb-4 flex items-end justify-between border-b border-gray-200 pb-3">
            <span className="text-base font-black tracking-wider text-gray-800 uppercase lg:text-lg">
              {t("cash_flow_statement_view.section_fin_change")}
            </span>
            <span className="text-sm font-bold text-gray-400">
              {t("cash_flow_statement_view.section_ratio")}
            </span>
          </div>

          <CashFlowSection
            titleText={t("cash_flow_statement_view.section_financing")}
            titleValue={activities.financing.total}
            items={activities.financing.items}
            totalAbsolute={financingAbsolute}
            barColor="bg-gray-300"
          />

          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 lg:mt-8 print:break-inside-avoid">
            <div className="flex items-center justify-between border-b border-gray-200 py-2">
              <span className="text-sm font-bold text-gray-500">
                {t("cash_flow_statement_view.section_beginning_balance")}
              </span>
              <span className="font-medium text-gray-700">
                ${numberWithCommas(summary.beginningBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 py-2">
              <span className="text-sm font-bold text-gray-500">
                {t("cash_flow_statement_view.section_net_change")}
              </span>
              <span className={"font-bold text-gray-900"}>
                {!MoneyUtil.toDecimal(summary.netIncreaseDecrease).isNegative()
                  ? ""
                  : "-"}
                $
                {numberWithCommas(
                  MoneyUtil.toDecimal(summary.netIncreaseDecrease)
                    .abs()
                    .toString(),
                )}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-900 p-6 px-6 text-white">
              <span className="text-base font-black">
                {t("cash_flow_statement_view.section_ending_balance")}
              </span>
              <span className="text-xl font-black">
                ${numberWithCommas(summary.endingBalance)}
              </span>
            </div>
          </div>

          {/* Info: (20260330 - Julian) 補充揭露 */}
          <div className="mt-4 flex justify-around rounded-xl border border-gray-100 bg-gray-50 p-4 lg:mt-8 print:break-inside-avoid">
            <div className="text-center">
              <div className="mb-1 text-xs font-bold text-gray-500">
                {t("cash_flow_statement_view.section_interest_paid")}
              </div>
              <div className="font-semibold text-gray-900">
                ${numberWithCommas(supplementary.interestPaid)}
              </div>
            </div>
            <div className="border-l-2 border-gray-200 pl-8 text-center">
              <div className="mb-1 text-xs font-bold text-gray-500">
                {t("cash_flow_statement_view.section_taxes_paid")}
              </div>
              <div className="font-semibold text-gray-900">
                ${numberWithCommas(supplementary.taxesPaid)}
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-white p-5">
        <LoadingPing size={40} />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Info: (20260330 - Julian) 關鍵指標 */}
      {keyMetricsBanner}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-4 print:flex print:items-start">
        {/* Info: (20260330 - Julian) 左側：營業活動與投資活動 */}
        {operatingInvestingSection}
        {/* Info: (20260330 - Julian) 右側：籌資活動與現金變動摘要 */}
        {financingCashFlowSection}
      </div>

      {/* Info: (20260401 - Julian) 財務指標註解與判斷標準 */}
      <ReportPrintNote notes={cashFlowNotes} />
    </div>
  );
}
