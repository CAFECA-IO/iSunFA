import React from 'react';
import { useTranslation } from 'next-i18next';
import { useCalculatorCtx } from '@/contexts/calculator_context';
import { radioButtonStyle } from '@/constants/display';
import ToggleSwitch from '@/components/salary_calculator/toggle_switch';
import AmountInput from '@/components/salary_calculator/amount_input';
import HourCounter from '@/components/salary_calculator/hour_counter';

const OthersForm: React.FC = () => {
  const { t } = useTranslation('calculator');

  const {
    isLaborInsurance,
    toggleLaborInsurance,
    isNHI,
    toggleNHI,
    isLaborPension,
    toggleLaborPension,
    numberOfDependents,
    setNumberOfDependents,
    nhiBackPremium,
    setNhiBackPremium,
    otherAdjustments,
    setOtherAdjustments,
    voluntaryPensionContribution,
    changeVoluntaryPensionContribution,
  } = useCalculatorCtx();

  // Info: (20250806 - Julian) 自提勞退選項：0%, 1%, 2%, 3%, 4%, 5%, 6%
  const vpcOptions = Array.from({ length: 7 }, (_, i) => i * 0.01);
  const vpcRadios = vpcOptions.map((i) => {
    const isChecked = voluntaryPensionContribution === i;
    const changeVpc = () => changeVoluntaryPensionContribution(i);

    return (
      <label htmlFor={`radio-vpc-${i}`} className="flex h-44px items-center gap-8px">
        <input
          id={`radio-vpc-${i}`}
          name="radio-vpc"
          type="radio"
          checked={isChecked}
          onChange={changeVpc}
          className={radioButtonStyle}
        />
        <p className="text-sm font-normal text-checkbox-text-primary">{i * 100}%</p>
      </label>
    );
  });

  return (
    <form className="flex flex-col gap-24px">
      {/* Info: (20250806 - Julian) 勞保投保狀態 */}
      <div className="flex flex-col gap-12px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('calculator:OTHERS_FORM.LABOR_COVERAGE_STATUS')}
        </p>
        <div className="flex flex-col items-start gap-lv-7 tablet:gap-18px">
          {/* Info: (20250806 - Julian) 勞保是否勾選 */}
          <ToggleSwitch
            isOn={isLaborInsurance}
            handleToggle={toggleLaborInsurance}
            title={t('calculator:OTHERS_FORM.OPTION_LABOR_INSURANCE')}
          />
          {/* Info: (20250806 - Julian) 健保是否勾選 */}
          <ToggleSwitch
            isOn={isNHI}
            handleToggle={toggleNHI}
            title={t('calculator:OTHERS_FORM.OPTION_NHI')}
          />
          {/* Info: (20250806 - Julian) 勞退是否勾選 */}
          <ToggleSwitch
            isOn={isLaborPension}
            handleToggle={toggleLaborPension}
            title={t('calculator:OTHERS_FORM.OPTION_LABOR_PENSION')}
          />
        </div>
      </div>
      {/* Info: (20250709 - Julian) 扶養人數 */}
      <div className="flex w-full flex-col gap-12px tablet:w-fit">
        <HourCounter
          title={t('calculator:OTHERS_FORM.NUMBER_OF_DEPENDENTS')}
          value={numberOfDependents}
          setValue={setNumberOfDependents}
        />
      </div>
      {/* Info: (20250709 - Julian) 健保加保費用 */}
      <AmountInput
        title={t('calculator:OTHERS_FORM.NHI_BACK_PREMIUM')}
        value={nhiBackPremium}
        setValue={setNhiBackPremium}
      />
      {/* Info: (20250709 - Julian) 其他調整（報銷 / 額外扣除） */}
      <AmountInput
        title={t('calculator:OTHERS_FORM.OTHER_ADJUSTMENTS')}
        value={otherAdjustments}
        setValue={setOtherAdjustments}
      />
      {/* Info: (20250710 - Julian) 自提勞退 */}
      <div className="flex flex-col gap-8px">
        <p className="text-sm font-semibold text-input-text-primary">
          {t('calculator:OTHERS_FORM.VOLUNTARY_PENSION_CONTRIBUTION')}
        </p>
        <div className="flex flex-wrap items-center gap-x-36px gap-y-12px">{vpcRadios}</div>
      </div>
    </form>
  );
};

export default OthersForm;
