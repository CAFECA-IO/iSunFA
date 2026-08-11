"use client";

import { FC } from "react";
import {
  EMPLOYEE_STATUS_I18N_KEY,
  EMPLOYEE_STATUS_STYLE,
  EmployeeStatus,
} from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IEmployeeStatusBadgeProps {
  status: EmployeeStatus;
}

// Info: (20260810 - Julian) 在職狀態標籤。配色與文案都查表，新增狀態只要改 constants
const EmployeeStatusBadge: FC<IEmployeeStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${EMPLOYEE_STATUS_STYLE[status]}`}
    >
      {t(EMPLOYEE_STATUS_I18N_KEY[status])}
    </span>
  );
};

export default EmployeeStatusBadge;
