"use client";

import { FC } from "react";
import {
  EMPLOYEE_STATUS_I18N_KEY,
  EMPLOYEE_SUMMARY_STATUSES,
  EmployeeStatus,
} from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IEmployeeSummaryCardsProps {
  counts: Record<EmployeeStatus, number>;
}

/**
 * Info: (20260810 - Julian) 四張人數統計卡。
 *
 * 數字刻意讀「全體員工」而非「篩選後結果」：這一排是部門編制的總覽，
 * 若跟著篩選跳動，使用者就沒有任何地方看得到全公司的真實人數。
 */
const EmployeeSummaryCards: FC<IEmployeeSummaryCardsProps> = ({ counts }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {EMPLOYEE_SUMMARY_STATUSES.map((status) => (
        <div
          key={status}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
            {t(EMPLOYEE_STATUS_I18N_KEY[status])}
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">
              {counts[status]}
            </span>
            <span className="text-xs text-gray-400">
              {t("hr_management.value.headcount_unit")}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default EmployeeSummaryCards;
