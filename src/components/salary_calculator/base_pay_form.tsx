import React from 'react';
import Image from 'next/image';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import NumericInput from '@/components/numeric_input/numeric_input';

const AmountInput: React.FC<{
  title: string;
  children: React.ReactNode;
  required?: boolean;
}> = ({ title, children, required }) => {
  return (
    <div className="flex flex-col gap-8px">
      <p className="text-sm font-semibold text-input-text-primary">
        {title} {required && <span className="text-text-state-error">*</span>}
      </p>
      <div className="flex h-44px items-center divide-x divide-input-stroke-input rounded-sm border border-input-stroke-input bg-input-surface-input-background">
        {children}
        <div className="flex h-full items-center gap-8px px-12px py-10px text-sm font-medium text-input-text-input-placeholder">
          <Image
            src="/currencies/twd.svg"
            width={16}
            height={16}
            alt="TWD"
            className="overflow-hidden rounded-full"
          />
          <p>TWD</p>
        </div>
      </div>
    </div>
  );
};

const BasePayForm: React.FC = () => {
  const {
    baseSalary,
    setBaseSalary,
    mealAllowance,
    setMealAllowance,
    otherAllowance,
    setOtherAllowance,
  } = useCalculatorCtx();

  return (
    <form className="flex flex-col gap-24px">
      {/* Info: (20250709 - Julian) 本薪（應稅） */}
      <AmountInput title="Base Salary (Taxable)" required>
        <NumericInput
          id="input-base-salary"
          name="input-base-salary"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={baseSalary}
          setValue={setBaseSalary}
          hasComma
          isDecimal
          required
        />
      </AmountInput>

      {/* Info: (20250709 - Julian) 伙食費（免稅） */}
      <AmountInput title="Meal Allowance (Non-taxable)">
        <NumericInput
          id="input-meal-allowance"
          name="input-meal-allowance"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={mealAllowance}
          setValue={setMealAllowance}
          hasComma
          isDecimal
        />
      </AmountInput>

      {/* Info: (20250709 - Julian) 其他津貼（免稅） */}
      <AmountInput title="Other Allowance (Non-taxable)">
        <NumericInput
          id="input-other-allowance"
          name="input-other-allowance"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={otherAllowance}
          setValue={setOtherAllowance}
          hasComma
          isDecimal
        />
      </AmountInput>
    </form>
  );
};

export default BasePayForm;
