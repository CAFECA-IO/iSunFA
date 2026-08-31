"use client";

import { FC } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import EmployeeList from "@/components/salary_calculator/employee_list";

interface IEmployeeListPageBodyProps {
  // Info: (20260831 - Julian) 員工列表只存在於帳本版，因此這裡不可為 null（計劃書 §2.4）
  accountBookId: string;
}

const EmployeeListPageBody: FC<IEmployeeListPageBodyProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      {/* Info: (20250715 - Julian) Main Content */}
      <div className="gap-56px px-240px py-56px flex flex-col items-stretch">
        <h1 className="text-32px text-text-brand-primary-lv1 text-center font-bold">
          {t("calculator.employee_list.main_title")}
        </h1>

        <EmployeeList />
      </div>
    </SalaryCalculatorShell>
  );
};

export default EmployeeListPageBody;
