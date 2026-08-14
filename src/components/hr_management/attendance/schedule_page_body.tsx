"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import ScheduleCellEditor from "@/components/hr_management/attendance/schedule_cell_editor";
import ScheduleGrid from "@/components/hr_management/attendance/schedule_grid";
import {
  DEMO_ACCOUNT_BOOK_ID,
  OFF_DAY_TYPE_STYLE,
  WorkDayType,
  WORK_DAY_TYPE_I18N_KEY,
} from "@/constants/attendance";
import { HR_FILTER_ALL } from "@/constants/hr_management";
import {
  isoMonthOf,
  monthRange,
  shiftIsoMonth,
} from "@/lib/utils/attendance_result_view";
import {
  applyCellUpdate,
  buildShiftLabels,
  buildShiftStyles,
  filterScheduleRows,
  scheduleDepartmentOptions,
} from "@/lib/utils/attendance_schedule_view";
import { ApiError, IEnvelopeLike, request } from "@/lib/utils/request";
import {
  IScheduleCalendar,
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";
import { IAttendanceScheduleUpdate } from "@/validators/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 排班月曆，排班是判定的輸入之一，需能獨立於
 * 判定存在。部門篩選在前端做：A7 雖支援 `departmentId`，但推到伺服器後
 * 選過的部門會從下拉選單消失，使用者切不回去。
 *
 * ToDo: (20260813 - Julian) Demo 沒有權限控制，任何員工都改得了任何人的班；
 * 刻意不做假的唯讀開關，避免造成「有管控」的錯覺。
 */

const API_BASE = `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/attendance`;

interface ISelectedCell {
  row: IScheduleRow;
  cell: IScheduleDayCell;
}

const SchedulePageBody: FC = () => {
  const { t } = useTranslation();

  // Info: (20260813 - Julian) 預設月份掛載後才決定，避免伺服器與瀏覽器跨月時的 hydration 不一致
  const [isoMonth, setIsoMonth] = useState<string | null>(null);
  useEffect(() => {
    setIsoMonth(isoMonthOf(new Date().toISOString()));
  }, []);

  const [calendar, setCalendar] = useState<IScheduleCalendar | null>(null);
  const [patterns, setPatterns] = useState<IShiftPatternSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [departmentId, setDepartmentId] = useState<string>(HR_FILTER_ALL);
  const [selected, setSelected] = useState<ISelectedCell | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(
    async (month: string) => {
      setIsLoading(true);
      setLoadError(null);
      // Info: (20260813 - Julian) 換月時清掉選取，否則編輯面板會指向上個月的某一天
      setSelected(null);

      const { from, to } = monthRange(month);
      try {
        const [calendarResponse, patternResponse] = await Promise.all([
          request<IEnvelopeLike<IScheduleCalendar>>(`${API_BASE}/schedule`, {
            query: { from, to },
          }),
          request<IEnvelopeLike<IShiftPatternSummary[]>>(
            `${API_BASE}/shift_pattern`,
          ),
        ]);
        setCalendar(calendarResponse.payload);
        setPatterns(patternResponse.payload ?? []);
      } catch (error) {
        setLoadError(
          error instanceof ApiError && error.message
            ? error.message
            : t("hr_management.attendance_schedule.error_load"),
        );
        setCalendar(null);
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (isoMonth) load(isoMonth);
  }, [isoMonth, load]);

  const shiftLabels = useMemo(() => buildShiftLabels(patterns), [patterns]);
  const shiftStyles = useMemo(() => buildShiftStyles(patterns), [patterns]);

  const departmentOptions = useMemo(
    () => scheduleDepartmentOptions(calendar?.rows ?? []),
    [calendar],
  );
  const rows = useMemo(
    () =>
      filterScheduleRows(
        calendar?.rows ?? [],
        departmentId === HR_FILTER_ALL ? null : departmentId,
      ),
    [calendar, departmentId],
  );

  const applyUpdate = async (update: IAttendanceScheduleUpdate) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await request<IEnvelopeLike<IScheduleDayCell>>(
        `${API_BASE}/schedule`,
        { method: "PUT", body: JSON.stringify(update) },
      );
      const cell = response.payload;
      if (!cell) throw new ApiError("Empty payload", 200);

      /**
       * Info: (20260813 - Julian) 只換那一格，不重抓整個月——A8 回的就是最新
       * 狀態，重抓一次只是把同一件事再問一遍，中間那半秒畫面會像沒存進去。
       */
      setCalendar((current) =>
        current
          ? {
              ...current,
              rows: applyCellUpdate(current.rows, update.employeeId, cell),
            }
          : current,
      );
      setSelected((current) => (current ? { ...current, cell } : current));
    } catch (error) {
      setSaveError(
        error instanceof ApiError && error.message
          ? error.message
          : t("hr_management.attendance_schedule.error_save"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {t("hr_management.attendance_schedule.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("hr_management.attendance_schedule.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isoMonth}
              onClick={() =>
                setIsoMonth((month) =>
                  month ? shiftIsoMonth(month, -1) : month,
                )
              }
              aria-label={t("hr_management.attendance_schedule.month_prev")}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-24 text-center text-base font-semibold text-gray-800 tabular-nums">
              {isoMonth ?? "—"}
            </span>
            <button
              type="button"
              disabled={!isoMonth}
              onClick={() =>
                setIsoMonth((month) =>
                  month ? shiftIsoMonth(month, 1) : month,
                )
              }
              aria-label={t("hr_management.attendance_schedule.month_next")}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            aria-label={t(
              "hr_management.attendance_schedule.filter_department",
            )}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.attendance_schedule.filter_all_departments")}
            </option>
            {departmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          {/* Info: (20260813 - Julian) 圖例：格子上只有簡稱，全名靠這裡對照 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            {patterns.map((pattern) => (
              <span key={pattern.id} className="flex items-center gap-1.5">
                <span
                  className={`flex size-5 items-center justify-center rounded font-medium ${shiftStyles.get(pattern.id)}`}
                >
                  {shiftLabels.get(pattern.id)}
                </span>
                {pattern.name}
              </span>
            ))}
            {(
              [
                WorkDayType.REGULAR_OFF,
                WorkDayType.REST_DAY,
                WorkDayType.HOLIDAY,
                WorkDayType.LEAVE,
              ] as Exclude<WorkDayType, WorkDayType.WORK>[]
            ).map((dayType) => (
              <span key={dayType} className="flex items-center gap-1.5">
                <span
                  className={`size-5 rounded ${OFF_DAY_TYPE_STYLE[dayType]}`}
                />
                {t(WORK_DAY_TYPE_I18N_KEY[dayType])}
              </span>
            ))}
          </div>

          <span className="ml-auto text-sm text-gray-400">
            {t("hr_management.attendance_schedule.result", {
              count: rows.length,
            })}
          </span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm text-gray-500 ring-1 ring-gray-200">
            <Loader2 className="size-4 animate-spin" />
            {t("hr_management.attendance_schedule.loading")}
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && calendar && rows.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-400 ring-1 ring-gray-200">
            {t("hr_management.attendance_schedule.empty")}
          </div>
        )}

        {!isLoading && !loadError && calendar && rows.length > 0 && (
          <ScheduleGrid
            workDates={calendar.workDates}
            rows={rows}
            shiftLabels={shiftLabels}
            shiftStyles={shiftStyles}
            selected={
              selected
                ? {
                    employeeId: selected.row.employeeId,
                    workDate: selected.cell.workDate,
                  }
                : null
            }
            onSelect={(row, cell) => {
              setSaveError(null);
              setSelected({ row, cell });
            }}
          />
        )}

        {selected && (
          <ScheduleCellEditor
            row={selected.row}
            cell={selected.cell}
            patterns={patterns}
            shiftStyles={shiftStyles}
            isSaving={isSaving}
            error={saveError}
            onApply={applyUpdate}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
};

export default SchedulePageBody;
