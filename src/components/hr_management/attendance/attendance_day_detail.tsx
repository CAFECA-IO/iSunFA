"use client";

import { FC, ReactNode } from "react";
import { X } from "lucide-react";
import {
  ATTENDANCE_CELL_TONE_I18N_KEY,
  ATTENDANCE_CELL_TONE_STYLE,
  ATTENDANCE_DAY_PHASE_I18N_KEY,
  ATTENDANCE_EXCEPTION_I18N_KEY,
  ShiftPatternKind,
  WORK_DAY_TYPE_I18N_KEY,
} from "@/constants/attendance";
import {
  EMPTY_VALUE,
  formatMinuteOfDay,
  toHourMinute,
} from "@/lib/utils/attendance_format";
import { resolveCellTone } from "@/lib/utils/attendance_result_view";
import {
  IAttendanceDayResult,
  IAttendanceResultRow,
} from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 單格明細。
 *
 * ## 為什麼一定要有這個
 *
 * 方格圖能表達的是「有沒有問題」，不是「問題是什麼」。而出勤異常一旦要
 * 拿去跟人談（補登、扣薪、出工查核），談的是分鐘數與那天的班別 ——
 * 一個只有顏色的畫面在那個對話裡沒有任何用處。
 *
 * ## 一定要印出判定階段
 *
 * 使用者看到空白格會問「為什麼」，而答案有兩個且意思相反：
 * 「這天還沒過完」與「這天沒有排班」。少了 `phase` 這一行，
 * 演示現場最容易被問到的那一格，正好是唯一答不出來的。
 */

const DetailField: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-gray-400">{label}</span>
    <span className="text-sm text-gray-800">{children}</span>
  </div>
);

const AttendanceDayDetail: FC<{
  row: IAttendanceResultRow;
  day: IAttendanceDayResult;
  onClose: () => void;
}> = ({ row, day, onClose }) => {
  const { t } = useTranslation();

  const tone = resolveCellTone(day);
  const nextDay = t("hr_management.attendance.next_day");
  const worked = toHourMinute(day.workedMinutes);

  const shiftLabel = (): string => {
    if (!day.shiftName) return EMPTY_VALUE;
    if (!day.shiftKind) return day.shiftName;
    const kind =
      day.shiftKind === ShiftPatternKind.FLEXIBLE
        ? t("hr_management.attendance.kind_flexible")
        : t("hr_management.attendance.kind_fixed");
    return `${day.shiftName}（${kind}）`;
  };

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-gray-800">
            {row.name}　{day.workDate}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {row.employeeNo}
            {row.departmentName ? ` · ${row.departmentName}` : ""}
            {row.jobTitle ? ` · ${row.jobTitle}` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("hr_management.attendance_result.detail_close")}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <DetailField
          label={t("hr_management.attendance_result.detail_verdict")}
        >
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${ATTENDANCE_CELL_TONE_STYLE[tone]}`}
          >
            {t(ATTENDANCE_CELL_TONE_I18N_KEY[tone])}
          </span>
        </DetailField>

        <DetailField label={t("hr_management.attendance_result.detail_phase")}>
          {t(ATTENDANCE_DAY_PHASE_I18N_KEY[day.phase])}
        </DetailField>

        <DetailField
          label={t("hr_management.attendance_result.detail_schedule")}
        >
          {day.dayType ? t(WORK_DAY_TYPE_I18N_KEY[day.dayType]) : EMPTY_VALUE}
        </DetailField>

        <DetailField label={t("hr_management.attendance_result.detail_shift")}>
          {shiftLabel()}
        </DetailField>

        <DetailField
          label={t("hr_management.attendance_result.detail_clock_in")}
        >
          {formatMinuteOfDay(day.firstInMinute, nextDay)}
        </DetailField>

        <DetailField
          label={t("hr_management.attendance_result.detail_clock_out")}
        >
          {formatMinuteOfDay(day.lastOutMinute, nextDay)}
        </DetailField>

        <DetailField label={t("hr_management.attendance_result.detail_worked")}>
          {t("hr_management.attendance_result.worked_value", {
            hours: worked.hours,
            minutes: worked.minutes,
          })}
        </DetailField>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="text-xs text-gray-400">
          {t("hr_management.attendance_result.detail_exceptions")}
        </div>
        {day.exceptions.length === 0 ? (
          <div className="mt-2 text-sm text-gray-400">
            {t("hr_management.attendance_result.detail_no_exception")}
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {day.exceptions.map((exception) => (
              <li
                key={exception.type}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <span className="font-medium">
                  {t(ATTENDANCE_EXCEPTION_I18N_KEY[exception.type])}
                </span>
                {/**
                 * Info: (20260813 - Julian) 曠職與漏打卡的 `minutes` 恆為 0 ——
                 * 那不是「0 分鐘」而是「這種異常沒有量值」，因此不印出來。
                 * 印成「曠職 0 分」會讓人以為系統算錯了。
                 */}
                {exception.minutes > 0 && (
                  <span className="text-gray-500">
                    {t("hr_management.attendance_result.minutes_value", {
                      minutes: exception.minutes,
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AttendanceDayDetail;
