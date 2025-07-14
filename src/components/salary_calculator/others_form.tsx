import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import NumericInput from '@/components/numeric_input/numeric_input';
import { radioButtonStyle } from '@/constants/display';

const AmountInput: React.FC<{
  title: string;
  children: React.ReactNode;
  required?: boolean;
}> = ({ title, children, required }) => {
  const { t } = useTranslation('common');
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
          <p>{t('common:CURRENCY_ALIAS.TWD')}</p>
        </div>
      </div>
    </div>
  );
};

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
      <AmountInput title={t('calculator:OTHERS_FORM.NHI_BACK_PREMIUM')} required>
        <NumericInput
          id="input-nhi-back-premium"
          name="input-nhi-back-premium"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={nhiBackPremium}
          setValue={setNhiBackPremium}
          hasComma
          isDecimal
          required
        />
      </AmountInput>
      {/* Info: (20250709 - Julian) 代扣二代健保 */}
      <AmountInput title={t('calculator:OTHERS_FORM.INCOME_TAX_SECOND_GEN_NHI_TAX')} required>
        <NumericInput
          id="input-2nd-gen-nhi-tax"
          name="input-2nd-gen-nhi-tax"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={secondGenNhiTax}
          setValue={setSecondGenNhiTax}
          hasComma
          isDecimal
          required
        />
      </AmountInput>
      {/* Info: (20250709 - Julian) 其他調整（報銷 / 額外扣除） */}
      <AmountInput title={t('calculator:OTHERS_FORM.OTHER_ADJUSTMENTS')} required>
        <NumericInput
          id="input-other-adjustments"
          name="input-other-adjustments"
          className="flex-1 bg-transparent px-12px py-10px text-right text-base font-medium text-input-text-input-filled placeholder:text-input-text-input-placeholder"
          value={otherAdjustments}
          setValue={setOtherAdjustments}
          hasComma
          isDecimal
          required
        />
      </AmountInput>
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
