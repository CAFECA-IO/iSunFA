import React from 'react';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';

const EmployeeListPageBody: React.FC = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
      {/* Info: (20250708 - Julian) Header */}
      <CalculatorNavbar />
    </main>
  );
};

export default EmployeeListPageBody;
