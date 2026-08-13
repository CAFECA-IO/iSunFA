"use client";

import { FC } from "react";
import {
  WEEKDAY_I18N_KEY,
  WorkDayType,
  WORK_DAY_TYPE_I18N_KEY,
} from "@/constants/attendance";
import { dayOfIsoDate, isoWeekday } from "@/lib/utils/attendance_format";
import { resolveScheduleCellStyle } from "@/lib/utils/attendance_schedule_view";
import { IScheduleDayCell, IScheduleRow } from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 排班方格圖：一列一位員工，一格一天。
 *
 * ## 星期標頭不是裝飾
 *
 * 這張表要讓人一眼看出輪班的樣子（早／晚交替、週末是例假還是照常施工）。
 * 只有日期數字的話，看的人得自己數到第幾格是星期六 ——
 * 而演示的方式正是**指著某一列說「這是輪班」**，那一秒沒有時間讓人數格子。
 */

const SUNDAY = 0;
const SATURDAY = 6;

const ScheduleGrid: FC<{
  workDates: string[];
  rows: IScheduleRow[];
  shiftLabels: Map<string, string>;
  shiftStyles: Map<string, string>;
  selected: { employeeId: string; workDate: string } | null;
  onSelect: (row: IScheduleRow, cell: IScheduleDayCell) => void;
}> = ({ workDates, rows, shiftLabels, shiftStyles, selected, onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
      <table className="min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-2 text-left font-medium text-gray-500"
            >
              {t("hr_management.attendance_schedule.col_employee")}
            </th>
            {workDates.map((workDate) => {
              const weekday = isoWeekday(workDate);
              return (
                <th
                  key={`w-${workDate}`}
                  className={`w-8 px-0 pt-2 text-center text-[10px] font-normal ${
                    weekday === SUNDAY || weekday === SATURDAY
                      ? "text-orange-400"
                      : "text-gray-300"
                  }`}
                >
                  {t(WEEKDAY_I18N_KEY[weekday])}
                </th>
              );
            })}
          </tr>
          <tr>
            {workDates.map((workDate) => (
              <th
                key={workDate}
                className="w-8 border-b border-gray-100 px-0 pb-2 text-center text-xs font-medium text-gray-400"
              >
                {dayOfIsoDate(workDate)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.employeeId} className="group">
              <td className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-2 group-hover:bg-gray-50">
                <div className="font-medium text-gray-800">{row.name}</div>
                <div className="text-xs text-gray-400">
                  {row.employeeNo}
                  {row.jobTitle ? ` · ${row.jobTitle}` : ""}
                </div>
              </td>

              {row.days.map((cell) => (
                <ScheduleCell
                  key={cell.workDate}
                  cell={cell}
                  label={
                    cell.dayType === WorkDayType.WORK && cell.shiftPatternId
                      ? (shiftLabels.get(cell.shiftPatternId) ?? "?")
                      : cell.dayType
                        ? t(WORK_DAY_TYPE_I18N_KEY[cell.dayType]).slice(0, 1)
                        : ""
                  }
                  style={resolveScheduleCellStyle(cell, shiftStyles)}
                  isSelected={
                    selected?.employeeId === row.employeeId &&
                    selected?.workDate === cell.workDate
                  }
                  onSelect={() => onSelect(row, cell)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ScheduleCell: FC<{
  cell: IScheduleDayCell;
  label: string;
  style: string;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ cell, label, style, isSelected, onSelect }) => {
  const { t } = useTranslation();

  const title = cell.shiftName
    ? `${cell.workDate}　${cell.shiftName}`
    : cell.dayType
      ? `${cell.workDate}　${t(WORK_DAY_TYPE_I18N_KEY[cell.dayType])}`
      : `${cell.workDate}　${t("hr_management.attendance_schedule.unscheduled")}`;

  return (
    <td className="border-b border-gray-100 p-0.5 text-center">
      {/**
       * Info: (20260813 - Julian) 空白格也可以點 —— 它正是「這一天還沒排」，
       * 而排班表最常做的動作就是把還沒排的那幾格排掉。
       */}
      <button
        type="button"
        onClick={onSelect}
        title={title}
        aria-label={title}
        className={`flex size-7 items-center justify-center rounded-md text-xs font-medium transition ${style} ${
          isSelected ? "ring-2 ring-orange-400" : "hover:opacity-80"
        }`}
      >
        {label}
      </button>
    </td>
  );
};

export default ScheduleGrid;
