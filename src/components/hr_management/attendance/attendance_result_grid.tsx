"use client";

import { FC } from "react";
import {
  CircleCheck,
  CircleHelp,
  CircleOff,
  Clock,
  Hourglass,
  LogOut,
  LucideIcon,
  Minus,
} from "lucide-react";
import {
  AttendanceCellTone,
  ATTENDANCE_CELL_TONE_I18N_KEY,
  ATTENDANCE_CELL_TONE_STYLE,
} from "@/constants/attendance";
import { dayOfIsoDate } from "@/lib/utils/attendance_format";
import {
  ATTENDANCE_SUMMARY_COLUMNS,
  countExceptionDays,
  hasHiddenExceptions,
  resolveCellTone,
} from "@/lib/utils/attendance_result_view";
import {
  IAttendanceDayResult,
  IAttendanceResultRow,
} from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 出勤總覽的方格圖：一列一位員工，一格一天。
 *
 * ## 顏色不是唯一的訊號
 *
 * 每一格除了底色還有一個圖示。純靠顏色分辨六種狀態，對色覺辨識障礙者
 * （紅綠是最常見的一型，而這裡的主角正是紅與綠）等於什麼都沒顯示 ——
 * 而這張表在工地上是要拿來對出工的。圖示不是裝飾，是第二個獨立的頻道。
 *
 * ## 每一格都可以點，包括空白的那些
 *
 * 空白格最需要解釋 ——「為什麼今天這格是空的」的答案有兩個
 * （還沒過完 / 沒有排班），而它們的意思相反。把空白格做成不可點，
 * 就等於讓最容易被問到的那一格是唯一答不出來的。
 */

const TONE_ICON: Record<AttendanceCellTone, LucideIcon | null> = {
  [AttendanceCellTone.NORMAL]: CircleCheck,
  [AttendanceCellTone.LATE]: Clock,
  [AttendanceCellTone.EARLY_LEAVE]: LogOut,
  [AttendanceCellTone.ABSENT]: CircleOff,
  [AttendanceCellTone.MISSING_PUNCH]: CircleHelp,
  [AttendanceCellTone.INSUFFICIENT_HOURS]: Hourglass,
  [AttendanceCellTone.OFF_DAY]: Minus,
  // Info: (20260813 - Julian) 這兩種刻意沒有圖示：它們要表達的就是「這裡沒有結論」
  [AttendanceCellTone.NO_SCHEDULE]: null,
  [AttendanceCellTone.PENDING]: null,
};

interface IAttendanceResultGridProps {
  workDates: string[];
  rows: IAttendanceResultRow[];
  selected: { employeeId: string; workDate: string } | null;
  onSelect: (row: IAttendanceResultRow, day: IAttendanceDayResult) => void;
}

const AttendanceResultGrid: FC<IAttendanceResultGridProps> = ({
  workDates,
  rows,
  selected,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
      <table className="min-w-max border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {/* Info: (20260813 - Julian) 姓名欄釘在左側：橫向捲動時看不到是誰，整張表就沒有意義 */}
            <th className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-3 text-left font-medium text-gray-500">
              {t("hr_management.attendance_result.col_employee")}
            </th>
            {workDates.map((workDate) => (
              <th
                key={workDate}
                className="w-8 border-b border-gray-100 px-0 py-3 text-center text-xs font-medium text-gray-400"
              >
                {dayOfIsoDate(workDate)}
              </th>
            ))}
            {ATTENDANCE_SUMMARY_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="border-b border-l border-gray-100 px-2 py-3 text-center text-xs font-medium text-gray-500"
              >
                {t(`hr_management.attendance_result.col_${column.key}`)}
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

              {row.days.map((day) => (
                <AttendanceCell
                  key={day.workDate}
                  day={day}
                  isSelected={
                    selected?.employeeId === row.employeeId &&
                    selected?.workDate === day.workDate
                  }
                  onSelect={() => onSelect(row, day)}
                />
              ))}

              {ATTENDANCE_SUMMARY_COLUMNS.map((column) => {
                const count = countExceptionDays(row.summary, column.types);
                return (
                  <td
                    key={column.key}
                    className="border-b border-l border-gray-100 px-2 py-2 text-center tabular-nums"
                  >
                    {/* Info: (20260813 - Julian) 0 印成淡灰：整列都是黑色數字時，非零的那幾個看不出來 */}
                    <span
                      className={
                        count > 0
                          ? "font-semibold text-gray-800"
                          : "text-gray-300"
                      }
                    >
                      {count}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AttendanceCell: FC<{
  day: IAttendanceDayResult;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ day, isSelected, onSelect }) => {
  const { t } = useTranslation();

  const tone = resolveCellTone(day);
  const Icon = TONE_ICON[tone];
  const label = t(ATTENDANCE_CELL_TONE_I18N_KEY[tone]);

  return (
    <td className="border-b border-gray-100 p-0.5 text-center">
      <button
        type="button"
        onClick={onSelect}
        title={`${day.workDate}　${label}`}
        aria-label={`${day.workDate} ${label}`}
        className={`relative flex size-7 items-center justify-center rounded-md transition ${
          ATTENDANCE_CELL_TONE_STYLE[tone]
        } ${isSelected ? "ring-2 ring-orange-400" : "hover:opacity-80"}`}
      >
        {Icon && <Icon className="size-4" />}
        {/**
         * Info: (20260813 - Julian) 右上角的小點代表「這一天不只一種異常」。
         * 顏色只講得了一種，而看不到的資訊等於不存在。
         */}
        {hasHiddenExceptions(day) && (
          <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-current" />
        )}
      </button>
    </td>
  );
};

export default AttendanceResultGrid;
