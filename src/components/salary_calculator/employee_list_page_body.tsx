import React from 'react';
import { useTranslation } from 'next-i18next';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';
import EmployeeList from '@/components/salary_calculator/employee_list';

const EmployeeListPageBody: React.FC = () => {
  const { t } = useTranslation('calculator');

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      {/* Info: (20250715 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250715 - Julian) Main Content */}
      <div className="flex flex-col items-stretch gap-56px px-240px py-56px">
        <h1 className="text-center text-32px font-bold text-text-brand-primary-lv1">
          {t('calculator:EMPLOYEE_LIST.MAIN_TITLE')}
        </h1>

        <EmployeeList />
      </div>
    </main>
  );
};

export default EmployeeListPageBody;
