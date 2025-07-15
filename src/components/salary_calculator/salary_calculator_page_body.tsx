import React from 'react';
import SalaryCalculatorResult from '@/components/salary_calculator/salary_result_section';
import SalaryFormSection from '@/components/salary_calculator/salary_form_section';
import CalculatorNavbar from '@/components/salary_calculator/calculator_navbar';
import { CalculatorProvider } from '@/contexts/calculator_context';

const SalaryCalculatorPageBody: React.FC = () => {
  return (
    <CalculatorProvider>
      <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
        {/* Info: (20250708 - Julian) Header */}
        <CalculatorNavbar />

        {/* Info: (20250708 - Julian) Main Content */}
        <div className="flex">
          {/* Info: (20250708 - Julian) Left Section */}
          <SalaryFormSection />
          {/* Info: (20250708 - Julian) Right Section */}
          <SalaryCalculatorResult />
        </div>
      </main>
    </CalculatorProvider>
  );
};

export default SalaryCalculatorPageBody;
