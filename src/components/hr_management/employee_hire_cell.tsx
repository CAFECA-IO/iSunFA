"use client";

import { FC } from "react";
import { IEmployeeListItem } from "@/interfaces/hr_management";
import { calculateTenure } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IEmployeeHireCellProps {
  employee: IEmployeeListItem;
  /**
   * Info: (20260810 - Julian) 年資的計算基準點。掛載前為 null，此時只顯示到職日 ——
   * 伺服器與瀏覽器各自取當下時間會算出不同年資，導致 hydration 不一致。
   */
  referenceDate: Date | null;
}

// Info: (20260810 - Julian) 列表的「到職日」欄：日期 + 年資
const EmployeeHireCell: FC<IEmployeeHireCellProps> = ({
  employee,
  referenceDate,
}) => {
  const { t } = useTranslation();

  if (!referenceDate) {
    return <div className="text-sm text-gray-600">{employee.hireDate}</div>;
  }

  const { years, months } = calculateTenure(employee, referenceDate);
  const tenureText =
    years > 0
      ? t("hr_management.value.tenure", { years, months })
      : t("hr_management.value.tenure_months_only", { months });

  return (
    <div>
      <div className="text-sm text-gray-600">{employee.hireDate}</div>
      <div className="text-xs text-gray-400">{tenureText}</div>
    </div>
  );
};

export default EmployeeHireCell;
