"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IEsgReport, IEsgReportItem } from "@/interfaces/esg_report";
import KeyMetricsCard from "@/components/user/financial_report/key_metrics_card";
import { numberWithCommas } from "@/lib/utils/common";
import { MoneyUtil } from "@/lib/utils/money";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { useTranslation } from "@/i18n/i18n_context";
import {
  LoadingPing,
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";
import EsgBomTable from "@/components/user/financial_report/esg_bom_table";

const EsgReportSection = ({
  titleText,
  titleValue,
  items,
  barColor,
}: {
  titleText: string;
  titleValue: string | number;
  items: IEsgReportItem[];
  barColor: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 print:mb-4 print:break-inside-avoid">
      {/* Info: (20260406 - Luphia) 項目標題 */}
      <div className="mb-2 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
        <span className="font-bold text-gray-700">{titleText}</span>
        <span className="text-base font-bold text-gray-900 print:text-sm">
          {numberWithCommas(
            MoneyUtil.toDecimal(titleValue).toNumber().toFixed(1),
          )}{" "}
          <span className="text-xs font-semibold">{t("esg_report.unit")}</span>
        </span>
      </div>
      {/* Info: (20260406 - Luphia) 項目內容 */}
      <div className="flex flex-col gap-1 px-3">
        {items.map((item) => {
          const percentage = item.percentageOfScope;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-gray-50 py-3"
            >
              <div className="flex w-2/3 flex-col">
                <span className="truncate text-xs font-medium text-gray-600 lg:text-base print:text-sm">
                  {t(`esg_activity_type.${item.name.toLowerCase()}`)}
                </span>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{
                      width: `${Math.min(percentage, 100)}%`, // Info: (20260406 - Luphia) 避免破版
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-base font-bold text-gray-900 print:text-sm">
                  {numberWithCommas(
                    MoneyUtil.toDecimal(item.amount).toNumber().toFixed(1),
                  )}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="py-4 text-center text-sm text-gray-400">
            {t("esg_report.no_records")}
          </div>
        )}
      </div>
    </div>
  );
};

export default function EsgReportView({
  period,
  year,
}: {
  period: ReportPeriod;
  year: number;
}) {
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

  const keyMetricsData = [
    {
      title: t("esg_report.gross_emissions"),
      value: (
        <>
          {numberWithCommas(
            MoneyUtil.toDecimal(metrics.totalEmissions).toNumber().toFixed(1),
          )}
          <span className="ml-[2px] text-xs font-bold">
            {t("esg_report.unit")}
          </span>
        </>
      ),
      description: t("esg_report.gross_desc"),
      textColor: "text-gray-900",
      statusGood: true,
    },
    {
      title: t("esg_report.scope1"),
      value: `${metrics.scope1Proportion.toFixed(1)}%`,
      description: t("esg_report.scope1_desc"),
      textColor: "text-gray-900",
      statusGood: metrics.scope1Proportion < 30, // Info: (20260406 - Luphia) example benchmark
    },
    {
      title: t("esg_report.scope2"),
      value: `${metrics.scope2Proportion.toFixed(1)}%`,
      description: t("esg_report.scope2_desc"),
      textColor: "text-gray-900",
      statusGood: true,
    },
    {
      title: t("esg_report.scope3"),
      value: `${metrics.scope3Proportion.toFixed(1)}%`,
      description: t("esg_report.scope3_desc"),
      textColor: "text-gray-900",
      statusGood: true,
    },
  ];

  const keyMetricsBanner = metrics ? (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4 print:flex">
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
    <div className="flex h-[150px] w-full items-center justify-center rounded-xl bg-white p-5">
      <LoadingPing size={40} />
    </div>
  );

  const scopeSection = sections ? (
    <div className="flex w-full flex-col gap-4 print:p-2">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:p-4">
        <div className="mb-4 flex items-end justify-between border-b border-gray-200 pb-3">
          <span className="text-base font-black tracking-wider text-gray-800 uppercase lg:text-lg">
            {t("esg_report.scopes_title")}
          </span>
          <span className="text-sm font-bold text-gray-400">
            {t("esg_report.proportion")}
          </span>
        </div>

        <EsgReportSection
          titleText={t("esg_report.scope1_title")}
          titleValue={sections.scope1.total}
          items={sections.scope1.items}
          barColor="bg-gray-300"
        />

        <EsgReportSection
          titleText={t("esg_report.scope2_title")}
          titleValue={sections.scope2.total}
          items={sections.scope2.items}
          barColor="bg-gray-200"
        />

        <EsgReportSection
          titleText={t("esg_report.scope3_title")}
          titleValue={sections.scope3.total}
          items={sections.scope3.items}
          barColor="bg-gray-300"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-900 p-6 text-white print:break-inside-avoid">
        <span className="text-lg font-black tracking-widest uppercase">
          {t("esg_report.gross_emissions_bottom")}
        </span>
        <span className="text-3xl font-black text-white">
          {numberWithCommas(
            MoneyUtil.toDecimal(sections.grossEmissions.total)
              .toNumber()
              .toFixed(1),
          )}{" "}
          <span className="text-lg font-bold">{t("esg_report.unit")}</span>
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
      {keyMetricsBanner}
      {scopeSection}

      {/* Info: (20260424 - Julian) 排放細項 BOM 表 */}
      {sections && <EsgBomTable sections={sections} />}
    </div>
  );
}
