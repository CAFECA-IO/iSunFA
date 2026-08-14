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
 * Info: (20260813 - Julian) 單格出勤明細：分鐘數與當天班別，供異常追查使用。
 *
 * 必須顯示 `phase`（判定階段）——空白格可能是「還沒過完」或「沒有排班」，
 * 兩種意思相反，只有這一行能分辨。
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
                 * Info: (20260813 - Julian) 曠職與漏打卡的 `minutes` 恆為 0，代表「沒有量值」
                 * 而非「0 分鐘」，因此不印出來，以免被誤讀成算錯了。
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
