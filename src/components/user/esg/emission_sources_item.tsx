"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { ChevronDown, Minus, Plus } from "lucide-react";
import {
  IEsgEmissionSourcesUI,
  IMockEsgRecord,
} from "@/interfaces/emission_source";
import { EsgIntensity } from "@/interfaces/esg";
import { numberWithCommas, timestampToString } from "@/lib/utils/common";

export default function EmissionSourcesItem({
  data,
}: {
  data: IEsgEmissionSourcesUI;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const toggleOpen = () => setIsOpen((prev) => !prev);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOpen();
    }
  };

  const groupedRecords = data.records.reduce(
    (acc, curr) => {
      const tag = curr.emissionSourceTag || "other";
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(curr);
      return acc;
    },
    {} as Record<string, IMockEsgRecord[]>,
  );

  // Info: (20260421 - Julian) 總紀錄數
  const totalRecordsCount = data.records.length;

  // Info: (20260421 - Julian) 總排放量
  const totalEmission = data.totalEmission;

  const esColor =
    data.intensity === EsgIntensity.HIGH ? "text-red-500" : "text-green-500";

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors duration-200 focus-within:border-orange-200 hover:border-orange-200">
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center justify-between rounded-xl p-6 transition-colors duration-200 hover:bg-orange-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-slate-800 transition-colors group-hover:bg-white">
            <ChevronDown
              size={24}
              className={`${isOpen ? "" : "-rotate-90"} transition-all duration-200`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-slate-800">{data.name}</p>
            <div className="flex items-center divide-x divide-slate-200 text-xs font-semibold">
              <p className="pr-1.5 text-slate-400">
                {t("emission_sources.item.address")}:{" "}
                <span className="text-slate-800">
                  {data.address || t("emission_sources.item.no_setting")}
                </span>
              </p>
              <p className="px-1.5 text-slate-400">
                <span className="text-slate-800">{totalRecordsCount}</span>{" "}
                {t("emission_sources.item.records_count")}
              </p>
              <p className="pl-1.5 text-slate-400">
                {t("emission_sources.item.total_emission")}:{" "}
                <span className={esColor}>
                  {numberWithCommas(totalEmission)}
                </span>
                <span className="ml-1 text-[10px]">kgCO2e</span>
              </p>
            </div>
          </div>
        </div>
        <div className="text-slate-400 transition-colors duration-200 group-hover:text-orange-600">
          {isOpen ? <Minus size={20} /> : <Plus size={20} />}
        </div>
      </div>

      <div
        className={`grid bg-white transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden bg-gray-50/50">
          <div className="p-6">
            {Object.entries(groupedRecords).map(([tag, records]) => (
              <div key={tag} className="mb-6 last:mb-0">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 items-center rounded-md bg-blue-100 px-2 text-xs font-bold text-blue-700">
                    {tag === "other"
                      ? t("emission_sources.item.other_tag")
                      : tag}
                  </div>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-5 py-3">
                          {t("emission_sources.item.table.date")}
                        </th>
                        <th className="px-5 py-3">
                          {t("emission_sources.item.table.activity")}
                        </th>
                        <th className="px-5 py-3">
                          {t("emission_sources.item.table.vendor")}
                        </th>
                        <th className="px-5 py-3 text-right">
                          {t("emission_sources.item.table.data")}
                        </th>
                        <th className="px-5 py-3 text-right">
                          {t("emission_sources.item.table.emission")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {records.map((rec) => (
                        <tr
                          key={rec.id}
                          className="transition-colors hover:bg-orange-50/50"
                        >
                          <td className="px-5 py-3 text-slate-600">
                            {timestampToString(rec.timestamp).dateWithDash}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-800">
                            {rec.activityType}
                          </td>
                          <td className="px-5 py-3 text-slate-600">
                            {rec.vendor}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-slate-800">
                            {rec.amount.toLocaleString()}{" "}
                            <span className="text-xs text-slate-400">
                              {rec.unit}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-orange-600">
                            {rec.emissions.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
