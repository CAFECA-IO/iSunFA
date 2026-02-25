import React from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import {
  MIN_WORK_HOURS,
  MAX_OVERWORK_HOURS,
  MAX_LEAVE_HOURS,
} from "@/constants/salary_calculator";
import HourCounter from "@/components/salary_calculator/hour_counter";

const WorkHoursForm: React.FC = () => {
  const { t } = useTranslation();

  const {
    // Info: (20250722 - Julian) non-taxable overtime hours state
    oneAndOneThirdsHoursForNonTax,
    setOneAndOneThirdsHoursForNonTax,
    oneAndTwoThirdsHoursForNonTax,
    setOneAndTwoThirdsHoursForNonTax,
    twoHoursForNonTax,
    setTwoHoursForNonTax,
    twoAndOneThirdsHoursForNonTax,
    setTwoAndOneThirdsHoursForNonTax,
    twoAndTwoThirdsHoursForNonTax,
    setTwoAndTwoThirdsHoursForNonTax,
    totalNonTaxableHours,
    // Info: (20250722 - Julian) taxable overtime hours state
    oneAndOneThirdHoursForTaxable,
    setOneAndOneThirdsHoursForTaxable,
    oneAndTwoThirdsHoursForTaxable,
    setOneAndTwoThirdsHoursForTaxable,
    twoHoursForTaxable,
    setTwoHoursForTaxable,
    twoAndOneThirdsHoursForTaxable,
    setTwoAndOneThirdsHoursForTaxable,
    twoAndTwoThirdsHoursForTaxable,
    setTwoAndTwoThirdsHoursForTaxable,
    totalTaxableHours,
    // Info: (20250709 - Julian) leave hour state
    sickLeaveHours,
    setSickLeaveHours,
    personalLeaveHours,
    setPersonalLeaveHours,
    leavePayoutHours,
    setLeavePayoutHours,
  } = useCalculatorCtx();

  const totalNonTaxableStyle =
    totalNonTaxableHours >= 46
      ? "text-text-state-error"
      : "text-text-brand-secondary-lv1";
  const totalTaxableStyle =
    totalTaxableHours >= 46
      ? "text-text-state-error"
      : "text-text-brand-secondary-lv1";

  return (
    <form className="flex flex-col gap-lv-8">
      {/* Info: (20250709 - Julian) 加班時數（免稅） */}
      <div className="flex flex-col gap-16px">
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-bold text-text-brand-secondary-lv1">
            {t("calculator.work_hours_form.overtime_hour_without_tax")}
          </h2>
          <p className={`text-lg font-bold ${totalNonTaxableStyle}`}>
            {totalNonTaxableHours} hrs
          </p>
        </div>
        <div className="grid grid-cols-1 gap-lv-3 gap-x-24px desktop:grid-cols-3">
          {/* Info: (20250709 - Julian) 1.33 小時 */}
          <HourCounter
            title="1.33"
            value={oneAndOneThirdsHoursForNonTax}
            setValue={setOneAndOneThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 1.66 小時 */}
          <HourCounter
            title="1.66"
            value={oneAndTwoThirdsHoursForNonTax}
            setValue={setOneAndTwoThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2 小時 */}
          <HourCounter
            title="2"
            value={twoHoursForNonTax}
            setValue={setTwoHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.33 小時 */}
          <HourCounter
            title="2.33"
            value={twoAndOneThirdsHoursForNonTax}
            setValue={setTwoAndOneThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.66 小時 */}
          <HourCounter
            title="2.66"
            value={twoAndTwoThirdsHoursForNonTax}
            setValue={setTwoAndTwoThirdsHoursForNonTax}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
        </div>
      </div>

      {/* Info: (20250709 - Julian) 加班時數（應稅） */}
      <div className="flex flex-col gap-16px">
        <div className="flex items-center">
          <h2 className="flex-1 text-lg font-bold text-text-brand-secondary-lv1">
            {t("calculator.work_hours_form.overtime_hour_with_tax")}
          </h2>
          <p className={`text-lg font-bold ${totalTaxableStyle}`}>
            {totalTaxableHours} hrs
          </p>
        </div>
        <div className="grid grid-cols-1 gap-lv-3 desktop:grid-cols-3 desktop:gap-24px">
          {/* Info: (20250709 - Julian) 1.33 小時 */}
          <HourCounter
            title="1.33"
            value={oneAndOneThirdHoursForTaxable}
            setValue={setOneAndOneThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 1.66 小時 */}
          <HourCounter
            title="1.66"
            value={oneAndTwoThirdsHoursForTaxable}
            setValue={setOneAndTwoThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2 小時 */}
          <HourCounter
            title="2"
            value={twoHoursForTaxable}
            setValue={setTwoHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.33 小時 */}
          <HourCounter
            title="2.33"
            value={twoAndOneThirdsHoursForTaxable}
            setValue={setTwoAndOneThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.66 小時 */}
          <HourCounter
            title="2.66"
            value={twoAndTwoThirdsHoursForTaxable}
            setValue={setTwoAndTwoThirdsHoursForTaxable}
            maxValue={MAX_OVERWORK_HOURS}
            minValue={MIN_WORK_HOURS}
          />
        </div>
      </div>

      {/* Info: (20250709 - Julian) 休假時數 */}
      <div className="flex flex-col gap-16px">
        <h2 className="text-lg font-bold text-text-brand-secondary-lv1">
          {t("calculator.work_hours_form.leave_hour")}
        </h2>
        <div className="grid grid-cols-1 gap-lv-3 desktop:grid-cols-3 desktop:gap-24px">
          {/* Info: (20250709 - Julian) 病假 */}
          <HourCounter
            title={t("calculator.work_hours_form.sick_menstrual_leave")}
            value={sickLeaveHours}
            setValue={setSickLeaveHours}
            maxValue={MAX_LEAVE_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 事假 */}
          <HourCounter
            title={t("calculator.work_hours_form.personal_leave")}
            value={personalLeaveHours}
            setValue={setPersonalLeaveHours}
            maxValue={MAX_LEAVE_HOURS}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 休假折抵薪資時數 */}
          <HourCounter
            title={t("calculator.work_hours_form.leave_payout_hours")}
            value={leavePayoutHours}
            setValue={setLeavePayoutHours}
            maxValue={MAX_LEAVE_HOURS}
            minValue={MIN_WORK_HOURS}
          />
        </div>
      </div>
    </form>
  );
};

export default WorkHoursForm;
