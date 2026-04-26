"use client";

import { IEsgReport } from "@/interfaces/esg_report";
import { numberWithCommas } from "@/lib/utils/common";
import { useTranslation } from "@/i18n/i18n_context";

interface IEsgBomTableProps {
  sections: IEsgReport["sections"];
  baseDivisor: number;
}

export default function EsgBomTable({
  sections,
  baseDivisor,
}: IEsgBomTableProps) {
  const { t } = useTranslation();

  // Info: (20260424 - Julian) 合併所有項目的陣列，過濾為 0 的項目，並依據碳排放量排序
  const allItems = [
    ...sections.scope1.items.map((item) => ({
      ...item,
      scopeLabel: t("esg_report.scope1"),
    })),
    ...sections.scope2.items.map((item) => ({
      ...item,
      scopeLabel: t("esg_report.scope2"),
    })),
    ...sections.scope3.items.map((item) => ({
      ...item,
      scopeLabel: t("esg_report.scope3"),
    })),
  ]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Info: (20260424 - Julian) 如果所有項目都為 0，則不顯示
  if (allItems.length === 0) return null;

  const bomList = allItems.map((item, index) => {
    const percentage =
      baseDivisor !== 0 ? (item.amount / baseDivisor) * 100 : 0;
    return (
      <tr
        key={`${item.id}-${index}`}
        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 print:break-inside-avoid"
      >
        <td className="px-4 py-3 font-medium text-gray-800">
          {item.scopeLabel}
        </td>
        <td className="px-4 py-3">
          {t(`esg_activity_type.${item.name.toLowerCase()}`)}
        </td>
        <td className="px-4 py-3 text-right font-bold text-gray-900">
          {numberWithCommas(Number(item.amount.toFixed(1)))}
        </td>
        <td className="px-4 py-3 text-right text-xs text-gray-500">
          {percentage.toFixed(1)}%
        </td>
      </tr>
    );
  });

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
                  {t("esg_report.bom_scope")}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {t("esg_report.bom_activity")}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {t("esg_report.bom_emissions")}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap">
                  {t("esg_report.bom_percentage")}
                </th>
              </tr>
            </thead>
            <tbody>{bomList}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
