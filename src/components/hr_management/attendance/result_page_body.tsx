"use client";

import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import AttendanceDayDetail from "@/components/hr_management/attendance/attendance_day_detail";
import AttendanceResultGrid from "@/components/hr_management/attendance/attendance_result_grid";
import {
  ATTENDANCE_API,
  ATTENDANCE_CELL_TONE_I18N_KEY,
  ATTENDANCE_CELL_TONE_STYLE,
  ATTENDANCE_EXCEPTION_I18N_KEY,
  ATTENDANCE_FILTER_EXCEPTION_ONLY,
  AttendanceCellTone,
  AttendanceExceptionType,
  DEMO_TIME_ZONE,
} from "@/constants/attendance";
import { HR_FILTER_ALL } from "@/constants/hr_management";
import {
  departmentOptionsOf,
  filterResultRows,
  zonedIsoMonth,
  monthRange,
  shiftIsoMonth,
} from "@/lib/utils/attendance_result_view";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import {
  IAttendanceDayResult,
  IAttendanceResultMatrix,
  IAttendanceResultRow,
} from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 出勤總覽與異常方格圖。
 *
 * 判定全部來自 A9 的即時計算（不讀結果表），因此任何一格都可以追問「為什麼」，
 * 答案在明細裡。篩選與排序都在前端做，只有換月份才會重新打 API。
 */

// Info: (20260813 - Julian) 圖例只列使用者會在格子裡看到的那幾種，順序同嚴重度
const LEGEND_TONES: AttendanceCellTone[] = [
  AttendanceCellTone.NORMAL,
  AttendanceCellTone.LATE,
  AttendanceCellTone.EARLY_LEAVE,
  AttendanceCellTone.ABSENT,
  AttendanceCellTone.MISSING_PUNCH,
  AttendanceCellTone.INSUFFICIENT_HOURS,
  AttendanceCellTone.OFF_DAY,
  AttendanceCellTone.PENDING,
  AttendanceCellTone.NO_SCHEDULE,
];

/**
 * Info: (20260813 - Julian) 可篩選的異常型別，不含 `SUSPICIOUS_JUMP`——
 * G5 未實作，選了會永遠是空結果。
 */
const FILTERABLE_EXCEPTIONS: AttendanceExceptionType[] = [
  AttendanceExceptionType.LATE,
  AttendanceExceptionType.EARLY_LEAVE,
  AttendanceExceptionType.ABSENT,
  AttendanceExceptionType.MISSING_CLOCK_IN,
  AttendanceExceptionType.MISSING_CLOCK_OUT,
  AttendanceExceptionType.INSUFFICIENT_HOURS,
];

interface ISelectedCell {
  row: IAttendanceResultRow;
  day: IAttendanceDayResult;
}

const ResultPageBody: FC = () => {
  const { t } = useTranslation();

  /**
   * Info: (20260813 - Julian) 預設月份在掛載後才決定：直接在 render 內取
   * `new Date()` 可能導致伺服器與瀏覽器算出不同月份，造成 hydration 不一致。
   */
  const [isoMonth, setIsoMonth] = useState<string | null>(null);

  useEffect(() => {
    setIsoMonth(zonedIsoMonth(new Date(), DEMO_TIME_ZONE));
  }, []);

  const [matrix, setMatrix] = useState<IAttendanceResultMatrix | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState<string>("");
  const [departmentName, setDepartmentName] = useState<string>(HR_FILTER_ALL);
  const [exception, setException] = useState<string>(HR_FILTER_ALL);
  const [selected, setSelected] = useState<ISelectedCell | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  /**
   * Info: (20260814 - Julian) 點了格子就把明細捲進視野。
   *
   * 明細接在方格圖下方，而方格圖橫向捲動、列數又多 —— 點中間那一格時明細在畫面外，
   * 使用者看到的是「按了沒反應」。排班月曆同樣的問題同樣的解法。
   */
  useEffect(() => {
    if (!selected) return;
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected]);

  const load = useCallback(
    async (month: string) => {
      setIsLoading(true);
      setLoadError(null);
      /**
       * Info: (20260813 - Julian) 換月時先清掉選取的格子，否則明細會顯示
       * 上個月的某一天，畫面看起來正常卻指向別處。
       */
      setSelected(null);

      const { from, to } = monthRange(month);
      try {
        const response = await request<IEnvelopeLike<IAttendanceResultMatrix>>(
          ATTENDANCE_API.RESULT,
          { query: { from, to } },
        );
        setMatrix(response.payload);
      } catch (error) {
        setLoadError(
          t(
            errorI18nKeyOf(error, "hr_management.attendance_result.error_load"),
          ),
        );
        setMatrix(null);
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (isoMonth) load(isoMonth);
  }, [isoMonth, load]);

  const departmentOptions = useMemo(
    () => departmentOptionsOf(matrix?.rows ?? []),
    [matrix],
  );

  const rows = useMemo(
    () =>
      filterResultRows(matrix?.rows ?? [], {
        keyword,
        departmentName,
        exception,
      }),
    [matrix, keyword, departmentName, exception],
  );

  const resetFilter = () => {
    setKeyword("");
    setDepartmentName(HR_FILTER_ALL);
    setException(HR_FILTER_ALL);
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        {/* Info: (20260813 - Julian) 標題與月份切換 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {t("hr_management.attendance_result.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("hr_management.attendance_result.subtitle")}
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
              aria-label={t("hr_management.attendance_result.month_prev")}
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
              aria-label={t("hr_management.attendance_result.month_next")}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Info: (20260813 - Julian) 篩選列 */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-300" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t(
                "hr_management.attendance_result.filter_keyword_placeholder",
              )}
              className="w-60 rounded-lg border border-gray-200 py-2 pr-3 pl-9 text-sm text-gray-700 placeholder:text-gray-300"
            />
          </div>

          <select
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
            aria-label={t("hr_management.attendance_result.filter_department")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.attendance_result.filter_all_departments")}
            </option>
            {departmentOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={exception}
            onChange={(event) => setException(event.target.value)}
            aria-label={t("hr_management.attendance_result.filter_exception")}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.attendance_result.filter_all_exceptions")}
            </option>
            <option value={ATTENDANCE_FILTER_EXCEPTION_ONLY}>
              {t("hr_management.attendance_result.filter_exception_only")}
            </option>
            {FILTERABLE_EXCEPTIONS.map((type) => (
              <option key={type} value={type}>
                {t(ATTENDANCE_EXCEPTION_I18N_KEY[type])}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilter}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
          >
            <RotateCcw className="size-4" />
            {t("hr_management.attendance_result.filter_reset")}
          </button>

          <span className="ml-auto text-sm text-gray-400">
            {t("hr_management.attendance_result.filter_result", {
              count: rows.length,
            })}
          </span>
        </div>

        {/* Info: (20260813 - Julian) 圖例。九種顏色沒有圖例等於沒有意義 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-gray-500">
          {LEGEND_TONES.map((tone) => (
            <span key={tone} className="flex items-center gap-1.5">
              <span
                className={`size-4 rounded ${ATTENDANCE_CELL_TONE_STYLE[tone]}`}
              />
              {t(ATTENDANCE_CELL_TONE_I18N_KEY[tone])}
            </span>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm text-gray-500 ring-1 ring-gray-200">
            <Loader2 className="size-4 animate-spin" />
            {t("hr_management.attendance_result.loading")}
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && matrix && rows.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-400 ring-1 ring-gray-200">
            {t("hr_management.attendance_result.empty")}
          </div>
        )}

        {!isLoading && !loadError && matrix && rows.length > 0 && (
          <AttendanceResultGrid
            workDates={matrix.workDates}
            rows={rows}
            selected={
              selected
                ? {
                    employeeId: selected.row.employeeId,
                    workDate: selected.day.workDate,
                  }
                : null
            }
            onSelect={(row, day) => setSelected({ row, day })}
          />
        )}

        {selected && (
          <div ref={detailRef}>
            <AttendanceDayDetail
              row={selected.row}
              day={selected.day}
              onClose={() => setSelected(null)}
            />
          </div>
        )}

        {/**
         * Info: (20260813 - Julian) 產出時間戳：判定會隨時間改變，因此「這份
         * 結果是幾點算出來的」與結果本身同等重要；時區一併印出，否則沒人答得出來。
         */}
        {matrix && (
          <div className="px-1 text-xs text-gray-400">
            {t("hr_management.attendance_result.evaluated_at", {
              /**
               * Info: (20260813 - Julian) 明確指定時區渲染，不指定會用瀏覽器
               * 時區，與帳本時區不同時（出差、遠端）會顯示錯的時間。
               */
              time: new Date(matrix.evaluatedAt).toLocaleString(undefined, {
                timeZone: matrix.timeZone,
              }),
              zone: matrix.timeZone,
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPageBody;
