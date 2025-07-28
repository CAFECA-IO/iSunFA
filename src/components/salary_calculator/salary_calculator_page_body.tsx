import React from 'react';
import SalaryResultSection from '@/components/salary_calculator/salary_result_section';
import SalaryFormSection from '@/components/salary_calculator/salary_form_section';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';

const SalaryCalculatorPageBody: React.FC = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
      {/* Info: (20250708 - Julian) Header */}
      <CalculatorNavbar />

      {/* Info: (20250708 - Julian) Main Content */}
      <div className="flex gap-84px overflow-x-auto p-80px">
        {/* Info: (20250708 - Julian) Left Section */}
        <SalaryFormSection />
        {/* Info: (20250708 - Julian) Right Section */}
        <SalaryResultSection />
      </div>
    </main>
  );
};

export default SalaryCalculatorPageBody;
