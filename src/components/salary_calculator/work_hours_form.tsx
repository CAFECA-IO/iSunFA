import { FC } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import {
  MIN_WORK_HOURS,
  MAX_LEAVE_HOURS,
  MAX_OVERWORK_HOURS,
} from "@/constants/salary_calculator";
import HourCounter from "@/components/salary_calculator/hour_counter";

const WorkHoursForm: FC = () => {
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

  return (
    <form className="flex flex-col gap-10">
      {/* Info: (20250709 - Julian) 加班時數（免稅） */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center border-b border-gray-100 pb-2">
          <h2 className="flex flex-1 items-center gap-2 text-sm font-bold text-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            {t("calculator.work_hours_form.overtime_hour_without_tax")}
          </h2>
          <p
            className={`font-mono text-lg font-black ${totalNonTaxableHours >= MAX_OVERWORK_HOURS ? "text-red-500" : "text-gray-900"}`}
          >
            {totalNonTaxableHours}{" "}
            <span className="text-xs font-bold text-gray-400">HRS</span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Info: (20250709 - Julian) 1.33 小時 */}
          <HourCounter
            title="1.33 x"
            value={oneAndOneThirdsHoursForNonTax}
            setValue={setOneAndOneThirdsHoursForNonTax}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 1.66 小時 */}
          <HourCounter
            title="1.66 x"
            value={oneAndTwoThirdsHoursForNonTax}
            setValue={setOneAndTwoThirdsHoursForNonTax}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2 小時 */}
          <HourCounter
            title="2.00 x"
            value={twoHoursForNonTax}
            setValue={setTwoHoursForNonTax}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.33 小時 */}
          <HourCounter
            title="2.33 x"
            value={twoAndOneThirdsHoursForNonTax}
            setValue={setTwoAndOneThirdsHoursForNonTax}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.66 小時 */}
          <HourCounter
            title="2.66 x"
            value={twoAndTwoThirdsHoursForNonTax}
            setValue={setTwoAndTwoThirdsHoursForNonTax}
            minValue={MIN_WORK_HOURS}
          />
        </div>
      </div>

      {/* Info: (20250709 - Julian) 加班時數（應稅） */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center border-b border-gray-100 pb-2">
          <h2 className="flex flex-1 items-center gap-2 text-sm font-bold text-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            {t("calculator.work_hours_form.overtime_hour_with_tax")}
          </h2>
          <p
            className={`font-mono text-lg font-black ${totalTaxableHours >= MAX_OVERWORK_HOURS ? "text-red-500" : "text-gray-900"}`}
          >
            {totalTaxableHours}{" "}
            <span className="text-xs font-bold text-gray-400">HRS</span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Info: (20250709 - Julian) 1.33 小時 */}
          <HourCounter
            title="1.33 x"
            value={oneAndOneThirdHoursForTaxable}
            setValue={setOneAndOneThirdsHoursForTaxable}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 1.66 小時 */}
          <HourCounter
            title="1.66 x"
            value={oneAndTwoThirdsHoursForTaxable}
            setValue={setOneAndTwoThirdsHoursForTaxable}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2 小時 */}
          <HourCounter
            title="2.00 x"
            value={twoHoursForTaxable}
            setValue={setTwoHoursForTaxable}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.33 小時 */}
          <HourCounter
            title="2.33 x"
            value={twoAndOneThirdsHoursForTaxable}
            setValue={setTwoAndOneThirdsHoursForTaxable}
            minValue={MIN_WORK_HOURS}
          />
          {/* Info: (20250709 - Julian) 2.66 小時 */}
          <HourCounter
            title="2.66 x"
            value={twoAndTwoThirdsHoursForTaxable}
            setValue={setTwoAndTwoThirdsHoursForTaxable}
            minValue={MIN_WORK_HOURS}
          />
        </div>
      </div>

      {/* Info: (20250709 - Julian) 休假時數 */}
      <div className="flex flex-col gap-4">
        {/**
         * Info: (20260909 - Julian) 這一區**刻意沒有**右側的總時數，
         * 與上面兩區的 `0 HRS` 不對稱是有理由的，不是漏掉。
         *
         * ## 三格加起來是一個沒有意義的數字
         *
         * 引擎自己就不是那樣算的（`salary_calculator.ts` 的「總扣薪時數」）：
         *
         *     const totalLeaveHours = sickLeaveHours * 0.5 + personalLeaveHours;
         *
         * - **病假/生理假**只算 `0.5`（勞工請假規則 §4，普通傷病假工資折半）
         * - **事假**算 `1.0`（不給薪）
         * - **休假折抵薪資時數不在這個式子裡** —— 它是反方向的：
         *   `vacationToPay = baseSalaryPerHour * vacationToPayHours`，它**加錢**
         *
         * 所以一個「總時數」會把兩種不同的扣薪比率、加上一個**反號**的給付項，
         * 當成同一個單位相加。加班那兩區可以加，是因為同區內時數同質
         * （倍率乘在錢上而不是時數上），而且那個總數是承重的 ——
         * 它到 `MAX_OVERWORK_HOURS` 會轉紅。請假沒有那樣的單一上限
         * （`MAX_LEAVE_HOURS` 是每一格各自的上限，不是三格之和的）。
         *
         * ## 如果之後真的要在這裡給一個數字
         *
         * 誠實的那個是引擎的 `totalLeaveHours`（病假已折半的**扣薪**時數），
         * 而它**不是三格之和** —— 標籤不能叫「總時數」，得叫「扣薪時數」，
         * 而且休假折抵不該被算進去。
         */}
        <div className="flex items-center border-b border-gray-100 pb-2">
          <h2 className="flex flex-1 items-center gap-2 text-sm font-bold text-gray-900">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            {t("calculator.work_hours_form.leave_hour")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
