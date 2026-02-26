import React from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import ToggleSwitch from "@/components/salary_calculator/toggle_switch";
import AmountInput from "@/components/salary_calculator/amount_input";
import HourCounter from "@/components/salary_calculator/hour_counter";

const OthersForm: React.FC = () => {
  const { t } = useTranslation();

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
      <label
        key={`radio-vpc-${i}`}
        htmlFor={`radio-vpc-${i}`}
        className="flex cursor-pointer items-center gap-2"
      >
        <div className="relative flex items-center justify-center">
          <input
            id={`radio-vpc-${i}`}
            name="radio-vpc"
            type="radio"
            aria-label={`${i * 100}%`}
            checked={isChecked}
            onChange={changeVpc}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-gray-300 bg-white transition-all checked:border-orange-400 outline-none"
          />
          <div className="absolute h-2.5 w-2.5 scale-0 rounded-full bg-orange-400 transition-transform peer-checked:scale-100" />
        </div>
        <p className="text-sm font-medium text-gray-700">{i * 100}%</p>
      </label>
    );
  });

  return (
    <form className="flex flex-col gap-8">
      {/* Info: (20250806 - Julian) 勞保投保狀態 */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          {t("calculator.others_form.labor_coverage_status")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Info: (20250806 - Julian) 勞保是否勾選 */}
          <ToggleSwitch
            isOn={isLaborInsurance}
            handleToggle={toggleLaborInsurance}
            title={t("calculator.others_form.option_labor_insurance")}
          />
          {/* Info: (20250806 - Julian) 健保是否勾選 */}
          <ToggleSwitch
            isOn={isNHI}
            handleToggle={toggleNHI}
            title={t("calculator.others_form.option_nhi")}
          />
          {/* Info: (20250806 - Julian) 勞退是否勾選 */}
          <ToggleSwitch
            isOn={isLaborPension}
            handleToggle={toggleLaborPension}
            title={t("calculator.others_form.option_labor_pension")}
          />
        </div>
      </div>
      {/* Info: (20250709 - Julian) 扶養人數 */}
      <div className="flex w-full flex-col gap-3 md:w-fit">
        <HourCounter
          title={t("calculator.others_form.number_of_dependents")}
          value={numberOfDependents}
          setValue={setNumberOfDependents}
        />
      </div>
      {/* Info: (20250709 - Julian) 健保加保費用 */}
      <AmountInput
        title={t("calculator.others_form.nhi_back_premium")}
        value={nhiBackPremium}
        setValue={setNhiBackPremium}
      />
      {/* Info: (20250709 - Julian) 其他調整（報銷 / 額外扣除） */}
      <AmountInput
        title={t("calculator.others_form.other_adjustments")}
        value={otherAdjustments}
        setValue={setOtherAdjustments}
      />
      {/* Info: (20250710 - Julian) 自提勞退 */}
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          {t("calculator.others_form.voluntary_pension_contribution")}
        </p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl py-6">
          {vpcRadios}
        </div>
      </div>
    </form>
  );
};

export default OthersForm;
