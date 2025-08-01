import React from 'react';
import { useTranslation } from 'next-i18next';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { MAX_MEAL_ALLOWANCE } from '@/constants/salary_calculator';
import AmountInput from '@/components/salary_calculator/amount_input';

const BasePayForm: React.FC = () => {
  const { t } = useTranslation('calculator');
  const {
    baseSalary,
    setBaseSalary,
    mealAllowance,
    setMealAllowance,
    otherAllowanceWithTax,
    setOtherAllowanceWithTax,
    otherAllowanceWithoutTax,
    setOtherAllowanceWithoutTax,
  } = useCalculatorCtx();

  return (
    <form className="flex flex-col gap-24px">
      {/* Info: (20250709 - Julian) 本薪（應稅） */}
      <AmountInput
        title={t('calculator:BASE_PAY_FORM.BASE_SALARY')}
        value={baseSalary}
        setValue={setBaseSalary}
        minimum={0}
        required
      />

      {/* Info: (20250709 - Julian) 伙食費（免稅） */}
      <AmountInput
        title={t('calculator:BASE_PAY_FORM.MEAL_ALLOWANCE')}
        value={mealAllowance}
        setValue={setMealAllowance}
        minimum={0}
        maximum={MAX_MEAL_ALLOWANCE}
      />

      {/* Info: (20250709 - Julian) 其他津貼（應稅） */}
      <AmountInput
        title={t('calculator:BASE_PAY_FORM.OTHER_ALLOWANCE_WITH_TAX')}
        value={otherAllowanceWithTax}
        setValue={setOtherAllowanceWithTax}
      />

      {/* Info: (20250709 - Julian) 其他津貼（免稅） */}
      <div className="flex flex-col gap-8px">
        <AmountInput
          title={t('calculator:BASE_PAY_FORM.OTHER_ALLOWANCE_WITHOUT_TAX')}
          value={otherAllowanceWithoutTax}
          setValue={setOtherAllowanceWithoutTax}
        />
        <p className="text-sm font-medium text-input-text-secondary">
          {t('calculator:BASE_PAY_FORM.ADDITIONAL_INFORMATION')}
        </p>
      </div>
    </form>
  );
};

export default BasePayForm;
