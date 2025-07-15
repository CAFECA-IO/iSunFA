import React from 'react';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';
import EmployeeList from '@/components/salary_calculator/employee_list';

const EmployeeListPageBody: React.FC = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      {/* Info: (20250715 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250715 - Julian) Main Content */}
      <div className="flex flex-col items-center gap-56px px-240px py-56px">
        <h1 className="text-32px font-bold text-text-brand-primary-lv1">Employee List</h1>

        <EmployeeList />
      </div>
    </main>
  );
};

export default EmployeeListPageBody;
