"use client";

import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import ScheduleCellEditor from "@/components/hr_management/attendance/schedule_cell_editor";
import ScheduleGrid from "@/components/hr_management/attendance/schedule_grid";
import {
  ATTENDANCE_API,
  DEMO_TIME_ZONE,
  OFF_DAY_TYPE_STYLE,
  WORK_DAY_TYPE_I18N_KEY,
  WorkDayType,
} from "@/constants/attendance";
import { HR_FILTER_ALL } from "@/constants/hr_management";
import {
  zonedIsoMonth,
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
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import {
  IScheduleCalendar,
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";
import { IAttendanceScheduleUpdate } from "@/validators/attendance";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20260814 - Julian) 排班存檔的專屬訊息；其餘錯誤走通用的 error_save
const SAVE_ERROR_I18N_KEY: Readonly<Record<string, string>> = {
  [API_ERRORS.CF_SCHEDULE_DAY_CONFLICT.code]:
    "hr_management.attendance_schedule.error_save_conflict",
  [API_ERRORS.VA_SCHEDULE_DAY_INVALID.code]:
    "hr_management.attendance_schedule.error_save_invalid_day",
};

/**
 * Info: (20260813 - Julian) 排班月曆，排班是判定的輸入之一，需能獨立於
 * 判定存在。部門篩選在前端做：A7 雖支援 `departmentId`，但推到伺服器後
 * 選過的部門會從下拉選單消失，使用者切不回去。
 *
 * Info: (20260817 - Luphia) 寫入限部門主管（伺服器端 `isDepartmentManager` 閘）。
 * 前端**刻意不預先 disable 格子**：非主管按下去會拿到 403 並看到訊息，
 * 而依前端猜測隱藏功能會讓「為什麼我沒有這個按鈕」變成無法自己排解的問題 ——
 * 且前端的判斷從來不是那道閘（護欄 G2 的同一個道理）。
 *
 * ToDo: (20260817 - Luphia) 讀取仍是全帳本可見，且排班異動沒有軌跡。
 * 兩者都屬計畫書 §7.3 第 1、3 順位。
 */

interface ISelectedCell {
  row: IScheduleRow;
  cell: IScheduleDayCell;
}

const SchedulePageBody: FC = () => {
  const { t } = useTranslation();

  // Info: (20260813 - Julian) 預設月份掛載後才決定，避免伺服器與瀏覽器跨月時的 hydration 不一致
  const [isoMonth, setIsoMonth] = useState<string | null>(null);
  useEffect(() => {
    setIsoMonth(zonedIsoMonth(new Date(), DEMO_TIME_ZONE));
  }, []);

  const [calendar, setCalendar] = useState<IScheduleCalendar | null>(null);
  const [patterns, setPatterns] = useState<IShiftPatternSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [departmentId, setDepartmentId] = useState<string>(HR_FILTER_ALL);
  const [selected, setSelected] = useState<ISelectedCell | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Info: (20260814 - Julian) 選了格子就把編輯面板捲進視野。
   *
   * 面板接在方格圖下方，而方格圖有 21 欄、十幾列 —— 點中間那一格時面板在畫面外，
   * 使用者看到的是「按了沒反應」。格子上的橘框在方格圖裡，也一樣看不到。
   */
  useEffect(() => {
    if (!selected) return;
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected]);

  const load = useCallback(
    async (month: string) => {
      setIsLoading(true);
      setLoadError(null);
      // Info: (20260813 - Julian) 換月時清掉選取，否則編輯面板會指向上個月的某一天
      setSelected(null);

      const { from, to } = monthRange(month);
      try {
        const [calendarResponse, patternResponse] = await Promise.all([
          request<IEnvelopeLike<IScheduleCalendar>>(ATTENDANCE_API.SCHEDULE, {
            query: { from, to },
          }),
          request<IEnvelopeLike<IShiftPatternSummary[]>>(
            ATTENDANCE_API.SHIFT_PATTERN,
          ),
        ]);
        setCalendar(calendarResponse.payload);
        setPatterns(patternResponse.payload ?? []);
      } catch (error) {
        setLoadError(
          t(
            errorI18nKeyOf(
              error,
              "hr_management.attendance_schedule.error_load",
            ),
          ),
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
        ATTENDANCE_API.SCHEDULE,
        { method: "PUT", body: JSON.stringify(update) },
      );
      const cell = response.payload;

      /**
       * Info: (20260814 - Julian) 2xx 卻沒有 payload 是伺服器違約，使用者無從理解也無從處置，
       * 一律走通用訊息。原本這裡丟 `new ApiError("Empty payload", 200)`，而下面的 catch
       * 只要拿得到 message 就直接顯示 —— 那個英文字串會出現在畫面上。
       */
      if (!cell) {
        setSaveError(t("hr_management.attendance_schedule.error_save"));
        return;
      }

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
        t(
          errorI18nKeyOf(
            error,
            "hr_management.attendance_schedule.error_save",
            SAVE_ERROR_I18N_KEY,
          ),
        ),
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
          <div className="grid grid-cols-3 items-center gap-x-4 gap-y-2 text-[8px] text-gray-500 lg:flex lg:flex-wrap">
            {patterns.map((pattern) => (
              <span
                key={pattern.id}
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded text-[8px] font-medium ${shiftStyles.get(pattern.id)}`}
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
          <div ref={editorRef}>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePageBody;
