import React from "react";
import { useTranslation } from "@/i18n/i18n_context";
import CalculatorHeader from "@/components/salary_calculator/calculator_header";
import EmployeeList from "@/components/salary_calculator/employee_list";

const EmployeeListPageBody: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      {/* Info: (20250715 - Julian) Header */}
      <CalculatorHeader />

      {/* Info: (20250715 - Julian) Main Content */}
      <div className="flex flex-col items-stretch gap-56px px-240px py-56px">
        <h1 className="text-center text-32px font-bold text-text-brand-primary-lv1">
          {t("calculator.employee_list.main_title")}
        </h1>

        <EmployeeList />
      </div>
    </main>
  );
};

export default EmployeeListPageBody;
