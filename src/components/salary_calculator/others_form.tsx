import React from 'react';
import Image from 'next/image';
// Deprecated: (20250709 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const OthersForm: React.FC = () => {
  return (
    <form className="flex flex-col gap-24px">
      {/* Info: (20250709 - Julian) NHI Premium */}
      <AmountInput title="NHI Back Premium" required>
        <NumericInput
          id="input-nhi-back-premium"
          name="input-nhi-back-premium"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={0}
          //   value={baseSalary}
          //   setValue={setBaseSalary}
          hasComma
          isDecimal
          required
        />
      </AmountInput>
      {/* Info: (20250709 - Julian) 代扣二代健保 */}
      <AmountInput title="Income Tax / 2nd Gen NHI Tax" required>
        <NumericInput
          id="input-2nd-gen-nhi-tax"
          name="input-2nd-gen-nhi-tax"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={0}
          //   value={baseSalary}
          //   setValue={setBaseSalary}
          hasComma
          isDecimal
          required
        />
      </AmountInput>
      {/* Info: (20250709 - Julian) 其他調整（報銷 / 額外扣除） */}
      <AmountInput title="Other Adjustments (Reimbursement / Extra Deduction)" required>
        <NumericInput
          id="input-other-adjustments"
          name="input-other-adjustments"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={0}
          //   value={baseSalary}
          //   setValue={setBaseSalary}
          hasComma
          isDecimal
          required
        />
      </AmountInput>
    </form>
  );
};

export default OthersForm;
