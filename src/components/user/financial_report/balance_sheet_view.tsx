"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IBalanceSheetItem, IBalanceSheet } from "@/interfaces/balance_sheet";
import KeyMetricsCard, {
  TooltipAlign,
} from "@/components/user/financial_report/key_metrics_card";
import ReportPrintNote, {
  IReportNote,
} from "@/components/user/financial_report/report_print_note";
import { numberWithCommas } from "@/lib/utils/common";
import { MoneyUtil } from "@/lib/utils/money";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { useTranslation } from "@/i18n/i18n_context";
import {
  LoadingPing,
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";

const BalanceSheetSection = ({
  titleText,
  titleValue,
  items,
  barColor,
}: {
  titleText: string;
  titleValue: string | number;
  items: IBalanceSheetItem[];
  barColor: string;
}) => {
  return (
    <div className="mb-4 lg:mb-6 print:mb-2 print:break-inside-avoid">
      <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="font-semibold text-gray-700">{titleText}</span>
        <span className="text-base font-bold text-gray-900 print:text-sm">
          {numberWithCommas(titleValue)}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-3">
        {items.map((item) => (
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
                    width: `${item.percentageOfAssetOrLiabEquity}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-base font-medium text-gray-800 print:text-sm">
                {numberWithCommas(item.amount)}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                {item.percentageOfAssetOrLiabEquity.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function BalanceSheetView({
  period,
  year,
}: {
  period: ReportPeriod;
  year: number;
}) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

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
        title={t("balance_sheet_view.loading_title")}
        description={t("balance_sheet_view.loading_desc")}
      />
    );
  }

  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <ReportErrorPlaceholder
        title={t("balance_sheet_view.error_title")}
        description={t("balance_sheet_view.error_desc")}
      />
    );
  }

  const { assets, liabilities, equity, metrics } = reportData;

  const balanceSheetNotes: IReportNote[] = [
    {
      title: t("balance_sheet_view.metric_nwps_title"),
      type: t("balance_sheet_view.note_nwps_type"),
      mainDesc: t("balance_sheet_view.note_nwps_main"),
      subDesc: t("balance_sheet_view.note_nwps_sub"),
    },
    {
      title: t("balance_sheet_view.metric_wc_title"),
      type: t("balance_sheet_view.note_wc_type"),
      mainDesc: t("balance_sheet_view.note_wc_main"),
      subDesc: t("balance_sheet_view.note_wc_sub"),
    },
    {
      title: t("balance_sheet_view.metric_cr_title"),
      type: t("balance_sheet_view.note_cr_type"),
      mainDesc: t("balance_sheet_view.note_cr_main"),
      subDesc: t("balance_sheet_view.note_cr_sub"),
    },
    {
      title: t("balance_sheet_view.metric_qr_title"),
      type: t("balance_sheet_view.note_qr_type"),
      mainDesc: t("balance_sheet_view.note_qr_main"),
      subDesc: t("balance_sheet_view.note_qr_sub"),
    },
    {
      title: t("balance_sheet_view.metric_dr_title"),
      type: t("balance_sheet_view.note_dr_type"),
      mainDesc: t("balance_sheet_view.note_dr_main"),
      subDesc: t("balance_sheet_view.note_dr_sub"),
    },
    {
      title: t("balance_sheet_view.metric_cashr_title"),
      type: t("balance_sheet_view.note_cashr_type"),
      mainDesc: t("balance_sheet_view.note_cashr_main"),
      subDesc: t("balance_sheet_view.note_cashr_sub"),
    },
    {
      title: t("balance_sheet_view.metric_dte_title"),
      type: t("balance_sheet_view.note_dte_type"),
      mainDesc: t("balance_sheet_view.note_dte_main"),
      subDesc: t("balance_sheet_view.note_dte_sub"),
    },
    {
      title: t("balance_sheet_view.metric_ltftfa_title"),
      type: t("balance_sheet_view.note_ltftfa_type"),
      mainDesc: t("balance_sheet_view.note_ltftfa_main"),
      subDesc: t("balance_sheet_view.note_ltftfa_sub"),
    },
    {
      title: t("balance_sheet_view.metric_rer_title"),
      type: t("balance_sheet_view.note_rer_type"),
      mainDesc: t("balance_sheet_view.note_rer_main"),
      subDesc: t("balance_sheet_view.note_rer_sub"),
    },
    {
      title: t("balance_sheet_view.metric_iar_title"),
      type: t("balance_sheet_view.note_iar_type"),
      mainDesc: t("balance_sheet_view.note_iar_main"),
      subDesc: t("balance_sheet_view.note_iar_sub"),
    },
  ];

  // Info: (20260409 - Julian) 計算前台固定資產總額，以判斷特殊分母為 0 的狀況
  const fixedAssetsTotal = assets.nonCurrent.items
    .filter((i) => i.code.startsWith("15") || i.code.startsWith("16"))
    .reduce(
      (acc, curr) =>
        MoneyUtil.toDecimal(acc)
          .plus(MoneyUtil.toDecimal(curr.amount))
          .toNumber(),
      0,
    );
  const isFixedAssetsZero = fixedAssetsTotal === 0;

  const balanceKeyMetricsData = [
    {
      title: t("balance_sheet_view.metric_nwps_title"),
      value: `${numberWithCommas(metrics.netWorthPerShare || 0)}`,
      description: t("balance_sheet_view.metric_nwps_desc"),
      textColor: "text-gray-900",
      statusGood: (metrics.netWorthPerShare || 0) > (metrics.parValue || 10),
      className: "col-span-2 lg:col-span-2 print:w-1/2",
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("balance_sheet_view.metric_wc_title"),
      value: `${numberWithCommas(metrics.workingCapital)}`,
      description: t("balance_sheet_view.metric_wc_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.workingCapital > 0,
      className: "col-span-2 lg:col-span-2 print:w-1/2",
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("balance_sheet_view.metric_cr_title"),
      value: `${metrics.currentRatio.toFixed(1)}%`,
      description: t("balance_sheet_view.metric_cr_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.currentRatio > 200,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("balance_sheet_view.metric_qr_title"),
      value: `${(metrics.quickRatio || 0).toFixed(1)}%`,
      description: t("balance_sheet_view.metric_qr_desc"),
      textColor: "text-gray-900",
      statusGood: (metrics.quickRatio || 0) > 100,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("balance_sheet_view.metric_dr_title"),
      value: `${metrics.debtRatio.toFixed(1)}%`,
      description: t("balance_sheet_view.metric_dr_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.debtRatio < 0.5,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("balance_sheet_view.metric_cashr_title"),
      value: `${(metrics.cashRatio || 0).toFixed(1)}%`,
      description: t("balance_sheet_view.metric_cashr_desc"),
      textColor: "text-gray-900",
      statusGood: (metrics.cashRatio || 0) > 20,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("balance_sheet_view.metric_dte_title"),
      value: MoneyUtil.toDecimal(equity.total).isZero()
        ? "N/A"
        : `${(metrics.debtToEquityRatio || 0).toFixed(1)}%`,
      description: t("balance_sheet_view.metric_dte_desc"),
      textColor: "text-gray-900",
      statusGood: MoneyUtil.toDecimal(equity.total).isZero()
        ? undefined
        : (metrics.debtToEquityRatio || 0) < 100,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("balance_sheet_view.metric_ltftfa_title"),
      value: isFixedAssetsZero
        ? "N/A"
        : `${(metrics.longTermFundsToFixedAssetsRatio || 0).toFixed(1)}%`,
      description: t("balance_sheet_view.metric_ltftfa_desc"),
      textColor: "text-gray-900",
      statusGood: isFixedAssetsZero
        ? undefined
        : (metrics.longTermFundsToFixedAssetsRatio || 0) > 100,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.RIGHT,
    },
    {
      title: t("balance_sheet_view.metric_rer_title"),
      value: MoneyUtil.toDecimal(equity.total).isZero()
        ? "N/A"
        : `${(metrics.retainedEarningsRatio || 0).toFixed(1)}%`,
      description: t("balance_sheet_view.metric_rer_desc"),
      textColor: "text-gray-900",
      statusGood: MoneyUtil.toDecimal(equity.total).isZero()
        ? undefined
        : (metrics.retainedEarningsRatio || 0) > 0,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.LEFT,
    },
    {
      title: t("balance_sheet_view.metric_iar_title"),
      value: MoneyUtil.toDecimal(assets.total).isZero()
        ? "N/A"
        : `${(metrics.intangibleAssetsRatio || 0).toFixed(1)}%`,
      description: t("balance_sheet_view.metric_iar_desc"),
      textColor: "text-gray-900",
      statusGood: MoneyUtil.toDecimal(assets.total).isZero()
        ? undefined
        : (metrics.intangibleAssetsRatio || 0) < 20,
      className: "print:w-1/4",
      tooltipAlign: TooltipAlign.RIGHT,
    },
  ];

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4 print:flex">
      {balanceKeyMetricsData.map((metric) => {
        const note = balanceSheetNotes.find(
          (note) => note.title === metric.title,
        );
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
            className={metric.className}
            tooltipAlign={metric.tooltipAlign}
          />
        );
      })}
    </div>
  ) : (
    <div className="flex h-[150px] w-full items-center justify-center rounded-2xl border border-gray-100 bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const assetsSection = assets ? (
    <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
        <div className="mb-4 flex items-end justify-between border-b border-gray-100 pb-3">
          <span className="text-base font-black tracking-wider text-gray-800 lg:text-lg">
            {t("balance_sheet_view.assets_title")}
          </span>
          <span className="text-sm font-medium text-gray-400">
            {t("balance_sheet_view.pct_total_assets")}
          </span>
        </div>
        <BalanceSheetSection
          titleText={t("balance_sheet_view.current_assets")}
          titleValue={assets.current.total}
          items={assets.current.items}
          barColor="bg-blue-400"
        />
        <BalanceSheetSection
          titleText={t("balance_sheet_view.non_current_assets")}
          titleValue={assets.nonCurrent.total}
          items={assets.nonCurrent.items}
          barColor="bg-blue-400"
        />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 lg:p-6 print:break-inside-avoid">
        <span className="text-base font-black tracking-widest text-gray-700 lg:text-lg">
          {t("balance_sheet_view.total_assets")}
        </span>
        <span className="text-lg font-black text-gray-900 lg:text-2xl">
          {numberWithCommas(assets.total)}
        </span>
      </div>
    </div>
  ) : (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-gray-100 bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const liabilitiesAndEquitySection =
    liabilities && equity ? (
      <div className="flex flex-col gap-4 print:w-1/2 print:p-2">
        <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
          <div className="mb-4 flex items-end justify-between border-b border-gray-100 pb-3">
            <span className="text-base font-black tracking-wider text-gray-800 lg:text-lg">
              {t("balance_sheet_view.liab_equity_title")}
            </span>
            <span className="text-sm font-medium text-gray-400">
              {t("balance_sheet_view.pct_total_liab_equity")}
            </span>
          </div>
          <BalanceSheetSection
            titleText={t("balance_sheet_view.current_liab")}
            titleValue={liabilities.current.total}
            items={liabilities.current.items}
            barColor="bg-orange-400"
          />
          <BalanceSheetSection
            titleText={t("balance_sheet_view.non_current_liab")}
            titleValue={liabilities.nonCurrent.total}
            items={liabilities.nonCurrent.items}
            barColor="bg-orange-400"
          />
          <BalanceSheetSection
            titleText={t("balance_sheet_view.equity")}
            titleValue={equity.total}
            items={equity.items}
            barColor="bg-orange-300"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-gray-900 p-4 text-white lg:p-6 print:break-inside-avoid">
          <span className="text-base font-black tracking-widest text-white lg:text-lg">
            {t("balance_sheet_view.total_liab_equity")}
          </span>
          <span className="text-lg font-black text-white lg:text-2xl">
            {numberWithCommas(
              MoneyUtil.add(
                reportData.liabilities.total,
                reportData.equity.total,
              ),
            )}
          </span>
        </div>
      </div>
    ) : (
      <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-gray-100 bg-white p-5">
        <LoadingPing size={40} />
      </div>
    );

  return (
    <div className="flex w-full flex-col gap-4">
      {keyMetricsBanner}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-4 print:flex print:items-start">
        {assetsSection}
        {liabilitiesAndEquitySection}
      </div>

      <ReportPrintNote notes={balanceSheetNotes} />
    </div>
  );
}
