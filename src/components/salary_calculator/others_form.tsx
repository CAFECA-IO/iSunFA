import React from 'react';
import { useTranslation } from 'next-i18next';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { radioButtonStyle } from '@/constants/display';
import AmountInput from '@/components/salary_calculator/amount_input';

const OthersForm: React.FC = () => {
  const { t } = useTranslation('calculator');

  const {
    nhiBackPremium,
    setNhiBackPremium,
    secondGenNhiTax,
    setSecondGenNhiTax,
    otherAdjustments,
    setOtherAdjustments,
    voluntaryPensionContribution,
    changeVoluntaryPensionContribution,
  } = useCalculatorCtx();

  const isCheckedZero = voluntaryPensionContribution === 0;
  const isCheckedSix = voluntaryPensionContribution === 6;

  const handleVPCZero = () => {
    changeVoluntaryPensionContribution(0);
  };
  const handleVPCSix = () => {
    changeVoluntaryPensionContribution(6);
  };

  return (
    <form className="flex flex-col gap-24px">
      {/* Info: (20250709 - Julian) NHI Premium */}
      <AmountInput
        title={t('calculator:OTHERS_FORM.NHI_BACK_PREMIUM')}
        value={nhiBackPremium}
        setValue={setNhiBackPremium}
        required
      />
      {/* Info: (20250709 - Julian) 代扣二代健保 */}
      <AmountInput
        title={t('calculator:OTHERS_FORM.INCOME_TAX_SECOND_GEN_NHI_TAX')}
        value={secondGenNhiTax}
        setValue={setSecondGenNhiTax}
        required
      />
      {/* Info: (20250709 - Julian) 其他調整（報銷 / 額外扣除） */}
      <AmountInput
        title={t('calculator:OTHERS_FORM.OTHER_ADJUSTMENTS')}
        value={otherAdjustments}
        setValue={setOtherAdjustments}
        required
      />
      {/* Info: (20250710 - Julian) 自提勞退 */}
      <div className="flex flex-col gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('calculator:OTHERS_FORM.VOLUNTARY_PENSION_CONTRIBUTION')}
        </p>
        <div className="flex items-center gap-36px">
          <label htmlFor="radio-vpc-zero" className="flex items-center gap-8px">
            <input
              id="radio-vpc-zero"
              name="radio-vpc"
              type="radio"
              checked={isCheckedZero}
              onChange={handleVPCZero}
              className={radioButtonStyle}
            />
            <p className="text-sm font-normal text-checkbox-text-primary">0%</p>
          </label>
          <label htmlFor="radio-vpc-six" className="flex items-center gap-8px">
            <input
              id="radio-vpc-six"
              name="radio-vpc"
              type="radio"
              checked={isCheckedSix}
              onChange={handleVPCSix}
              className={radioButtonStyle}
            />
            <p className="text-sm font-normal text-checkbox-text-primary">6%</p>
          </label>
        </div>
      </div>
    </form>
  );
};

export default OthersForm;
