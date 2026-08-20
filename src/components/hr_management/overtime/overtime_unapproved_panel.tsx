"use client";

import { FC } from "react";
import { FileQuestion, TriangleAlert } from "lucide-react";
import { OvertimeExceptionType } from "@/constants/overtime";
import { IOvertimeExceptionReport } from "@/interfaces/overtime";
import { formatMinuteOfDay } from "@/lib/utils/attendance_format";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 未核准時段（L29）。
 *
 * 列「在場但沒有任何一張單涵蓋」的時段，**不下結論** —— 可能是漏了申請，
 * 也可能只是下班後多待了半小時，由主管決定。系統的責任是讓它浮出來
 * （ADR 024 §2.1）：未核准的加班是勞資爭議最常見的起點，而事實一直在
 * `AttendancePunch` 裡，只是沒有人看見。
 *
 * 兩種例外分開畫，因為下一步不同：`UNAPPROVED_OVERTIME` 要補核准或說明，
 * `MISSING_PUNCH_EVIDENCE` 是已核准但缺打卡佐證的自陳，要的是補件。
 */
const OvertimeUnapprovedPanel: FC<{ report: IOvertimeExceptionReport }> = ({
  report,
}) => {
  const { t } = useTranslation();
  const nextDay = t("hr_management.attendance.next_day");

  if (report.exceptions.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 ring-1 ring-gray-200">
        {t("hr_management.overtime.unapproved_empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
        {t("hr_management.overtime.unapproved_hint")}
      </p>

      {report.exceptions.map((exception) => {
        const isDeclared =
          exception.type === OvertimeExceptionType.MISSING_PUNCH_EVIDENCE;

        return (
          <div
            key={`${exception.workDate}-${exception.type}-${exception.overtimeRequestId ?? "0"}`}
            className={`flex flex-wrap items-start gap-x-3 gap-y-1 rounded-2xl px-4 py-3 text-sm ring-1 ${
              isDeclared
                ? "bg-amber-50 text-amber-900 ring-amber-200"
                : "bg-white text-gray-800 ring-gray-200"
            }`}
          >
            {isDeclared ? (
              <FileQuestion className="mt-0.5 size-4 shrink-0 text-amber-500" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-500" />
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium tabular-nums">
                  {exception.workDate}
                </span>
                <span className="text-xs">
                  {t(
                    isDeclared
                      ? "hr_management.overtime.exception_missing_punch_evidence"
                      : "hr_management.overtime.exception_unapproved_overtime",
                  )}
                </span>
              </div>

              {/* Info: (20260818 - Julian) 逐段列出：「19:00–21:00」主管想得起那天發生什麼事，「120 分鐘」想不起來 */}
              {exception.intervals.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500 tabular-nums">
                  {exception.intervals.map((interval) => (
                    <span key={interval.startMinute}>
                      {formatMinuteOfDay(interval.startMinute, nextDay)}–
                      {formatMinuteOfDay(interval.endMinute, nextDay)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <span className="ml-auto shrink-0 text-sm font-medium tabular-nums">
              {exception.minutes}
              <span className="ml-0.5 text-xs font-normal text-gray-400">
                {t("hr_management.overtime.unit_minute")}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OvertimeUnapprovedPanel;
