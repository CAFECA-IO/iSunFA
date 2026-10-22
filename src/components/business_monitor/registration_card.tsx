"use client";

import { FC, useState } from "react";
import { Landmark } from "lucide-react";
import { ICompanyRegistration } from "@/interfaces/business_monitor";
import { useTranslation } from "@/i18n/i18n_context";
import {
  formatIsoDate,
  formatRegistrationValue,
  groupThousands,
} from "@/lib/business_monitor/format";

// Info: (20261022 - Luphia) 董監事預設只列前幾位，其餘展開才看
const DIRECTORS_PREVIEW = 5;

/**
 * Info: (20261022 - Luphia) 最新公司登記：現況快照，以「更新於」標示最後一次向商業司取得的日期，
 * 不掛任何年度。欄位與值原樣來自商業司，只做千分位與民國日期的寫法轉換。
 */
const RegistrationCard: FC<{ registration: ICompanyRegistration | null }> = ({
  registration,
}) => {
  const { t } = useTranslation();
  const [showAllDirectors, setShowAllDirectors] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Landmark size={18} className="shrink-0 text-orange-500" />
          {t("business_monitor.company.registration_title")}
        </h2>
        {registration && (
          <p className="text-xs text-slate-500">
            {t("business_monitor.company.registration_updated", {
              date: formatIsoDate(registration.updatedAt),
            })}
            ・{t("business_monitor.company.registration_source")}
          </p>
        )}
      </div>

      {!registration ? (
        <p className="text-sm text-slate-400">
          {t("business_monitor.company.registration_empty")}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            {registration.fields.map((field) => (
              <div key={field.label} className="flex gap-2">
                <dt className="shrink-0 text-slate-500">{field.label}</dt>
                <dd className="font-medium break-all text-slate-800">
                  {formatRegistrationValue(field.label, field.value)}
                </dd>
              </div>
            ))}
          </dl>

          {registration.directors.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-slate-700">
                {t("business_monitor.company.directors")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 pr-3 font-medium">
                        {t("business_monitor.company.director_position")}
                      </th>
                      <th className="py-1 pr-3 font-medium">
                        {t("business_monitor.company.director_name")}
                      </th>
                      <th className="py-1 pr-3 font-medium">
                        {t("business_monitor.company.director_representing")}
                      </th>
                      <th className="py-1 text-right font-medium">
                        {t("business_monitor.company.director_shares")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {(showAllDirectors
                      ? registration.directors
                      : registration.directors.slice(0, DIRECTORS_PREVIEW)
                    ).map((director, index) => (
                      <tr
                        // Info: (20261022 - Luphia) 同一法人可派多位代表，姓名也可能重複；以順序為鍵
                        key={`${index}-${director.name}`}
                        className="border-t border-slate-100"
                      >
                        <td className="py-1 pr-3">{director.position}</td>
                        <td className="py-1 pr-3">{director.name}</td>
                        <td className="py-1 pr-3">{director.representing}</td>
                        <td className="py-1 text-right">
                          {groupThousands(director.shares)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {registration.directors.length > DIRECTORS_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllDirectors((v) => !v)}
                  className="w-fit text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  {showAllDirectors
                    ? t("business_monitor.company.directors_collapse")
                    : t("business_monitor.company.directors_expand", {
                        count: registration.directors.length,
                      })}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default RegistrationCard;
