"use client";

import { IEsgReport, IEsgReportDetailedRecord } from "@/interfaces/esg_report";
import { numberWithCommas } from "@/lib/utils/common";
import { useTranslation } from "@/i18n/i18n_context";

interface IEsgBomTableProps {
  sections: IEsgReport["sections"];
}

export default function EsgBomTable({ sections }: IEsgBomTableProps) {
  const { t } = useTranslation();

  // Info: (20260427 - Julian) 渲染範疇一、二、三
  const renderScopeGroup = (
    title: string,
    records: IEsgReportDetailedRecord[] = [],
  ) => {
    const displayedRecords =
      // Info: (20260427 - Julian) 沒有任何排放紀錄
      records.length === 0 ? (
        <tr>
          <td
            colSpan={5}
            className="px-4 py-2 text-center text-xs text-gray-600"
          >
            {t("esg_report.no_records")}
          </td>
        </tr>
      ) : (
        records.map((item, index) => {
          return (
            <tr
              key={`${item.id}-${index}`}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 print:break-inside-avoid"
            >
              <td className="px-4 py-3 pl-8 font-medium text-gray-700">
                {t(`esg_activity_type.${item.activityType.toLowerCase()}`)}
              </td>
              <td className="px-4 py-3 text-right">
                {numberWithCommas(Number(item.originalData.toFixed(2)))}{" "}
                {item.unit}
              </td>
              <td className="px-4 py-3 text-right">
                * {numberWithCommas(Number(item.coefficient.toFixed(4)))}
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">
                {numberWithCommas(Number(item.emissions.toFixed(1)))}
              </td>
              <td className="px-4 py-3 text-right text-xs text-gray-500">
                {item.percentage.toFixed(1)}%
              </td>
            </tr>
          );
        })
      );

    return (
      <tbody key={title}>
        <tr className="bg-gray-100">
          <td colSpan={5} className="px-4 py-2 font-bold text-gray-800">
            {title}
          </td>
        </tr>
        {displayedRecords}
      </tbody>
    );
  };

  // Info: (20260427 - Julian) 檢查是否有任何排放紀錄
  const hasAnyRecords =
    (sections.scope1.records?.length || 0) > 0 ||
    (sections.scope2.records?.length || 0) > 0 ||
    (sections.scope3.records?.length || 0) > 0;

  if (!hasAnyRecords) return null;

  return (
    <div className="mt-4 flex w-full flex-col gap-4 print:mt-2 print:p-2">
      <div className="flex-1 rounded-xl border border-gray-100 bg-white box-decoration-clone p-4 lg:p-6 print:break-inside-avoid print:p-4">
        <div className="mb-4 border-b border-gray-200 pb-3">
          <span className="text-base font-black tracking-wider text-gray-800 lg:text-lg">
            {t("esg_report.bom_title")}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">
                  {t("esg_report.bom_activity")}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {t("esg_report.bom_original_data")}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {t("esg_report.bom_coefficient")}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {t("esg_report.bom_emissions")}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {t("esg_report.bom_percentage")}
                </th>
              </tr>
            </thead>
            {renderScopeGroup(t("esg_report.scope1"), sections.scope1.records)}
            {renderScopeGroup(t("esg_report.scope2"), sections.scope2.records)}
            {renderScopeGroup(t("esg_report.scope3"), sections.scope3.records)}
          </table>
        </div>
      </div>
    </div>
  );
}
