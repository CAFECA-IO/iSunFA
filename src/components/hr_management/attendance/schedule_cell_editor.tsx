"use client";

import { FC } from "react";
import { Loader2, X } from "lucide-react";
import {
  OFF_DAY_TYPE_STYLE,
  ShiftPatternKind,
  WorkDayType,
  WORK_DAY_TYPE_I18N_KEY,
} from "@/constants/attendance";
import { formatMinuteOfDay } from "@/lib/utils/attendance_format";
import {
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";
import { IAttendanceScheduleUpdate } from "@/validators/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 單格排班編輯面板（非下拉選單）。
 *
 * 用面板而非下拉選單：這張表會橫向捲動，浮動選單的定位在捲動容器裡容易出錯；
 * 面板也能把班別全名與時間窗一起寫出來。不做拖拉排班。
 */

const OFF_DAY_TYPES: Exclude<WorkDayType, WorkDayType.WORK>[] = [
  WorkDayType.REGULAR_OFF,
  WorkDayType.REST_DAY,
  WorkDayType.HOLIDAY,
  WorkDayType.LEAVE,
];

const ScheduleCellEditor: FC<{
  row: IScheduleRow;
  cell: IScheduleDayCell;
  patterns: IShiftPatternSummary[];
  shiftStyles: Map<string, string>;
  isSaving: boolean;
  error: string | null;
  onApply: (update: IAttendanceScheduleUpdate) => void;
  onClose: () => void;
}> = ({
  row,
  cell,
  patterns,
  shiftStyles,
  isSaving,
  error,
  onApply,
  onClose,
}) => {
  const { t } = useTranslation();
  const nextDay = t("hr_management.attendance.next_day");

  const isCurrent = (
    dayType: WorkDayType,
    shiftPatternId: string | null,
  ): boolean =>
    cell.dayType === dayType &&
    (cell.shiftPatternId ?? null) === shiftPatternId;

  const optionClass = (active: boolean, tone: string): string =>
    `flex flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition disabled:opacity-50 ${tone} ${
      active ? "ring-2 ring-orange-400" : "hover:opacity-80"
    }`;

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-gray-800">
            {row.name}　{cell.workDate}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {row.employeeNo}
            {row.departmentName ? ` · ${row.departmentName}` : ""}
            {" · "}
            {cell.shiftName ??
              (cell.dayType
                ? t(WORK_DAY_TYPE_I18N_KEY[cell.dayType])
                : t("hr_management.attendance_schedule.unscheduled"))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("hr_management.attendance_schedule.editor_close")}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-5">
        <div className="text-xs text-gray-400">
          {t("hr_management.attendance_schedule.editor_work")}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {patterns.map((pattern) => (
            <button
              key={pattern.id}
              type="button"
              disabled={isSaving}
              onClick={() =>
                onApply({
                  employeeId: row.employeeId,
                  workDate: cell.workDate,
                  dayType: WorkDayType.WORK,
                  shiftPatternId: pattern.id,
                })
              }
              className={optionClass(
                isCurrent(WorkDayType.WORK, pattern.id),
                shiftStyles.get(pattern.id) ?? "bg-gray-100 text-gray-600",
              )}
            >
              <span className="text-sm font-medium">{pattern.name}</span>
              {/**
               * Info: (20260813 - Julian) 把時間窗印出來——班別名稱未必說得出
               * 是幾點到幾點，寫出來才不必去別的頁面查。
               */}
              <span className="text-xs opacity-80">
                {formatMinuteOfDay(pattern.window.windowStartMinute, nextDay)}–
                {formatMinuteOfDay(pattern.window.windowEndMinute, nextDay)}
                {pattern.kind === ShiftPatternKind.FLEXIBLE
                  ? `　${t("hr_management.attendance.kind_flexible")}`
                  : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs text-gray-400">
          {t("hr_management.attendance_schedule.editor_off")}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {OFF_DAY_TYPES.map((dayType) => (
            <button
              key={dayType}
              type="button"
              disabled={isSaving}
              onClick={() =>
                onApply({
                  employeeId: row.employeeId,
                  workDate: cell.workDate,
                  dayType,
                  /**
                   * Info: (20260813 - Julian) 明確送 null，不是省略 ——
                   * 把上班日改成休假時，舊的班別必須被清掉。
                   */
                  shiftPatternId: null,
                })
              }
              className={optionClass(
                isCurrent(dayType, null),
                OFF_DAY_TYPE_STYLE[dayType],
              )}
            >
              <span className="text-sm font-medium">
                {t(WORK_DAY_TYPE_I18N_KEY[dayType])}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isSaving && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          {t("hr_management.attendance_schedule.saving")}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default ScheduleCellEditor;
