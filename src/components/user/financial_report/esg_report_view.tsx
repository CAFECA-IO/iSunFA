"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  IEsgReport,
  IEsgReportItem,
} from "@/interfaces/esg_report";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import { numberWithCommas } from "@/lib/utils/common";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { useTranslation } from "@/i18n/i18n_context";
import {
  LoadingPing,
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";

const EsgReportSection = ({
  titleText,
  titleValue,
  items,
  baseDivisor,
  barColor,
}: {
  titleText: string;
  titleValue: number;
  items: IEsgReportItem[];
  baseDivisor: number;
  barColor: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 print:mb-4 print:break-inside-avoid">
      {/* Info: (20260406 - Luphia) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-4 py-3">
        <span className="font-bold text-slate-700">{titleText}</span>
        <span className="font-bold text-slate-700 text-base print:text-sm">
          {numberWithCommas(Number(titleValue.toFixed(1)))} kgCO2e
        </span>
      </div>
      {/* Info: (20260406 - Luphia) 項目內容 */}
      <div className="flex flex-col gap-1 px-3">
        {items.map((item) => {
          const percentage =
            baseDivisor !== 0 ? (item.amount / baseDivisor) * 100 : 0;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-slate-50 py-3"
            >
              <div className="flex w-2/3 flex-col">
                <span className="text-[15px] font-medium text-slate-600 print:text-sm truncate">
                  {item.name}
                </span>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`, // Info: (20260406 - Luphia) 避免破版
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-medium text-slate-700 text-base print:text-sm">
                  {numberWithCommas(Number(item.amount.toFixed(1)))}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-400">
            {t("esg_report.no_records")}
          </div>
        )}
      </div>
    </div>
  );
};

export default function EsgReportView({ period, year }: { period: ReportPeriod, year: number }) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [reportData, setReportData] = useState<IEsgReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<IApiResponse<{ report: IEsgReport }>>(
            `/api/v1/user/account_book/${accountBookId}/report?reportType=${ReportType.ESG_REPORT}&period=${period}&year=${year}`,
          );
          if (res.payload) {
            setReportData(res.payload.report);
          }
        } catch (error) {
          console.error("Failed to fetch esg report:", error);
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
        title={t("esg_report.loading_title")}
        description={t("esg_report.loading_desc")}
      />
    );
  }

  if (!reportData || Object.keys(reportData).length === 0) {
    return (
      <ReportErrorPlaceholder
        title={t("esg_report.error_title")}
        description={t("esg_report.error_desc")}
      />
    );
  }

  const { metrics, sections } = reportData;
  const baseEmissions = sections.grossEmissions.total;

  const keyMetricsData = [
    {
      title: t("esg_report.gross_emissions"),
      value: `${numberWithCommas(Number(metrics.totalEmissions.toFixed(1)))} kgCO2e`,
      description: t("esg_report.gross_desc"),
      textColor: "text-emerald-600",
      statusGood: true,
    },
    {
      title: t("esg_report.scope1"),
      value: `${metrics.scope1Proportion.toFixed(1)}%`,
      description: t("esg_report.scope1_desc"),
      textColor: "text-sky-600",
      statusGood: metrics.scope1Proportion < 30, // Info: (20260406 - Luphia) example benchmark
    },
    {
      title: t("esg_report.scope2"),
      value: `${metrics.scope2Proportion.toFixed(1)}%`,
      description: t("esg_report.scope2_desc"),
      textColor: "text-amber-600",
      statusGood: true,
    },
    {
      title: t("esg_report.scope3"),
      value: `${metrics.scope3Proportion.toFixed(1)}%`,
      description: t("esg_report.scope3_desc"),
      textColor: "text-violet-600",
      statusGood: true,
    },
  ];

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:flex">
      {keyMetricsData.map((metric) => (
        <KeyMetricsCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          description={metric.description}
          textColor={metric.textColor}
          statusGood={metric.statusGood}
        />
      ))}
    </div>
  ) : (
    <div className="flex h-[150px] w-full items-center justify-center rounded-2xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const scopeSection = sections ? (
    <div className="flex flex-col gap-4 print:p-2 w-full">
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm print:p-4 box-decoration-clone">
        <div className="mb-4 flex items-end justify-between border-b-2 border-slate-200 pb-3">
          <span className="text-lg font-black tracking-wider text-slate-800 uppercase">
            {t("esg_report.scopes_title")}
          </span>
          <span className="text-sm font-bold text-slate-400">
            {t("esg_report.proportion")}
          </span>
        </div>

        <EsgReportSection
          titleText={t("esg_report.scope1_title")}
          titleValue={sections.scope1.total}
          items={sections.scope1.items}
          baseDivisor={baseEmissions}
          barColor="bg-sky-400"
        />

        <EsgReportSection
          titleText={t("esg_report.scope2_title")}
          titleValue={sections.scope2.total}
          items={sections.scope2.items}
          baseDivisor={baseEmissions}
          barColor="bg-amber-400"
        />

        <EsgReportSection
          titleText={t("esg_report.scope3_title")}
          titleValue={sections.scope3.total}
          items={sections.scope3.items}
          baseDivisor={baseEmissions}
          barColor="bg-violet-400"
        />

      </div>

      <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-6 text-white shadow-sm print:break-inside-avoid">
        <span className="text-lg font-black tracking-widest uppercase">
          {t("esg_report.gross_emissions_bottom")}
        </span>
        <span className="text-3xl font-black text-emerald-400">
          {numberWithCommas(Number(sections.grossEmissions.total.toFixed(1)))} kgCO2e
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
      {keyMetricsBanner}
      {scopeSection}
    </div>
  );
}
