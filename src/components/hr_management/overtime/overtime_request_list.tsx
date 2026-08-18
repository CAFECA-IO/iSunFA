"use client";

import { FC, useState } from "react";
import { Check, FileWarning, Loader2, Siren, X } from "lucide-react";
import {
  OVERTIME_TIER_I18N_KEY,
  OvertimeEvidenceBasis,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeApprovalResult,
  IOvertimeRequestSummary,
} from "@/interfaces/overtime";
import {
  overtimeRequestApproveApi,
  overtimeRequestRejectApi,
} from "@/constants/overtime_api";
import {
  errorCodeOf,
  errorI18nKeyOf,
} from "@/lib/utils/attendance_error_message";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { OVERTIME_ERROR_I18N_KEY } from "@/lib/utils/overtime_error_message";
import { formatMinuteOfDay } from "@/lib/utils/attendance_format";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

const STATUS_STYLE: Readonly<Record<string, string>> = {
  [OvertimeRequestStatus.PENDING]: "bg-sky-100 text-sky-700",
  [OvertimeRequestStatus.APPROVED]: "bg-emerald-100 text-emerald-700",
  [OvertimeRequestStatus.REJECTED]: "bg-rose-100 text-rose-700",
  [OvertimeRequestStatus.WITHDRAWN]: "bg-gray-200 text-gray-600",
};

const STATUS_I18N_KEY: Readonly<Record<string, string>> = {
  [OvertimeRequestStatus.PENDING]: "hr_management.overtime.status_pending",
  [OvertimeRequestStatus.APPROVED]: "hr_management.overtime.status_approved",
  [OvertimeRequestStatus.REJECTED]: "hr_management.overtime.status_rejected",
  [OvertimeRequestStatus.WITHDRAWN]: "hr_management.overtime.status_withdrawn",
};

/**
 * Info: (20260818 - Julian) 加班單清單。我的加班與待我簽核共用。
 *
 * ## 為什麼申請與認列要並排顯示
 *
 * 認列 = min(核准, 打卡事實)。申請 3 小時、認列 1 小時是**正常結果**
 * 而不是故障，但只顯示其中一個數字，員工看到的會是一個沒有解釋的落差
 * （ADR 024 §2）。兩個都印出來，那個落差就自己說明了自己。
 *
 * ## 核准分鐘可以少於申請
 *
 * 主管核 2 小時而申請 3 小時是常態，所以簽核區是一個可輸入的欄位而不是
 * 一顆「同意」按鈕。預設帶申請的分鐘數 —— 多數情況照准，少數才要改。
 */
const OvertimeRequestList: FC<{
  requests: IOvertimeRequestSummary[];
  emptyKey: string;
  /** Info: (20260818 - Julian) 給值才顯示簽核區（待簽清單用，我的加班不給） */
  decidable?: boolean;
  onChanged?: () => void | Promise<void>;
}> = ({ requests, emptyKey, decidable = false, onChanged = undefined }) => {
  const { t } = useTranslation();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Info: (20260818 - Julian) 錯誤碼另外留一份：訊息是給人看的，碼是給程式判斷的
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [approvedMinutes, setApprovedMinutes] = useState<
    Record<string, number>
  >({});

  const nextDay = t("hr_management.attendance.next_day");

  /**
   * Info: (20260818 - Julian) 被法定上限擋下的三個碼。
   *
   * 單獨認出它們，是因為它們與其他錯誤的**下一步不同**：其他的是「這張單填錯了」
   * 或「你不能簽」，而這三個是「這段工時已經發生，但它超過法定上限」——
   * 那不是改一改欄位就能解決的事。
   */
  const LIMIT_ERROR_CODES: readonly string[] = [
    API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
    API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code,
    API_ERRORS.VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT.code,
  ];

  const decide = async (
    item: IOvertimeRequestSummary,
    url: string,
    body: Record<string, number> | null,
  ) => {
    setActingId(item.id);
    setError(null);
    setErrorCode(null);
    setNotice(null);
    try {
      const response = await request<IEnvelopeLike<IOvertimeApprovalResult>>(
        url,
        {
          method: "POST",
          ...(body === null ? {} : { body: JSON.stringify(body) }),
        },
      );

      /**
       * Info: (20260818 - Julian) 核准的回應要說出三件事：認列多少、
       * 超出核准的有多少（已列入未核准時段）、換出幾批補休。
       * 前兩者是同一個決定的兩面，只說一半會讓主管以為超出的部分消失了。
       */
      const result = response.payload;
      if (result !== null && result !== undefined) {
        const parts = [
          t("hr_management.overtime.decided_recognized", {
            minutes: result.recognizedMinutes,
          }),
        ];
        if (result.unapprovedMinutes > 0) {
          parts.push(
            t("hr_management.overtime.decided_unapproved", {
              minutes: result.unapprovedMinutes,
            }),
          );
        }
        if (result.compensatoryGrantCount > 0) {
          parts.push(
            t("hr_management.overtime.decided_granted", {
              count: result.compensatoryGrantCount,
            }),
          );
        }
        setNotice(parts.join("　"));
      }

      await onChanged?.();
    } catch (caught) {
      setErrorCode(errorCodeOf(caught));
      setError(
        t(
          errorI18nKeyOf(
            caught,
            "hr_management.overtime.error_decide",
            OVERTIME_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setActingId(null);
    }
  };

  if (requests.length === 0) {
    return <p className="text-sm text-gray-400">{t(emptyKey)}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p>{error}</p>

          {/**
           * Info: (20260818 - Julian) 超過法定上限時的下一步入口，**目前停用**。
           *
           * ## 為什麼按鈕在這裡、卻按不下去
           *
           * 需求是「超時改為提示、不阻擋，並提供填寫報告書的選項」。但「不擋」
           * 與「合法」是兩件事，而它們的資料模型不同：報告書若是 §32 IV 天災
           * 事變的法定通報，它是一個**合法性依據**；若只是主管的例外核准說明，
           * 它是一筆**違規紀錄**。把後者當成前者，等於讓系統對勞動檢查宣稱
           * 一件不成立的合法性。
           *
           * 那個決定尚未做出，法源（§32 IV 的通報時限、受理機關、法定書表欄位）
           * 也還沒回原文核對 —— 因此這裡只放出入口，不改變阻擋行為。
           * 完整說明見計畫書 §8.3。
           */}
          {errorCode !== null && LIMIT_ERROR_CODES.includes(errorCode) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={t("hr_management.overtime.report_disabled_hint")}
                className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-400 ring-1 ring-gray-200"
              >
                <FileWarning className="size-3.5 shrink-0" />
                {t("hr_management.overtime.action_write_report")}
              </button>
              <span className="text-xs text-rose-600/80">
                {t("hr_management.overtime.report_disabled_hint")}
              </span>
            </div>
          )}
        </div>
      )}
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {requests.map((item) => {
        const requestedMinutes =
          item.requestedEndMinute - item.requestedStartMinute;

        return (
          <div
            key={item.id}
            className="rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
                  <span className="font-medium tabular-nums">
                    {item.workDate}
                  </span>
                  <span className="text-gray-500 tabular-nums">
                    {formatMinuteOfDay(item.requestedStartMinute, nextDay)}–
                    {formatMinuteOfDay(item.requestedEndMinute, nextDay)}
                  </span>
                  {item.isEmergency && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      <Siren className="size-3" />
                      {t("hr_management.overtime.list_emergency_badge")}
                    </span>
                  )}
                  {item.evidenceBasis ===
                    OvertimeEvidenceBasis.MANUAL_DECLARATION && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      {t("hr_management.overtime.list_declared_badge")}
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                  {decidable && (
                    <span>
                      <span className="font-mono">{item.employeeNo}</span>{" "}
                      {item.employeeName}
                    </span>
                  )}
                  <span className="tabular-nums">
                    {t("hr_management.overtime.list_requested", {
                      minutes: requestedMinutes,
                    })}
                  </span>
                  {/**
                   * Info: (20260818 - Julian) 認列只在核准後才有值。
                   * 待簽的單子顯示「認列 0 分」會讀成「核准了但一分鐘都不算」。
                   */}
                  {item.recognizedMinutes !== null && (
                    <span className="tabular-nums">
                      {t("hr_management.overtime.list_recognized", {
                        minutes: item.recognizedMinutes,
                      })}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-relaxed break-words text-gray-500">
                  {item.reason}
                </p>

                {item.segments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.segments.map((segment) => (
                      <span
                        key={segment.order}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {t(OVERTIME_TIER_I18N_KEY[segment.tier])}
                        <span className="ml-1 tabular-nums">
                          {segment.minutes}
                          {t("hr_management.overtime.unit_minute")}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  STATUS_STYLE[item.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {t(STATUS_I18N_KEY[item.status] ?? item.status)}
              </span>
            </div>

            {decidable && item.status === OvertimeRequestStatus.PENDING && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                <label className="flex flex-col gap-1 text-xs text-gray-600">
                  {t("hr_management.overtime.field_approved_minutes")}
                  <input
                    type="number"
                    min={0}
                    max={requestedMinutes}
                    value={approvedMinutes[item.id] ?? requestedMinutes}
                    onChange={(event) =>
                      setApprovedMinutes((current) => ({
                        ...current,
                        [item.id]: Number(event.target.value),
                      }))
                    }
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 tabular-nums"
                  />
                </label>

                <button
                  type="button"
                  disabled={actingId === item.id}
                  onClick={() =>
                    decide(item, overtimeRequestApproveApi(item.id), {
                      approvedMinutes:
                        approvedMinutes[item.id] ?? requestedMinutes,
                    })
                  }
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actingId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {t("hr_management.overtime.action_approve")}
                </button>

                <button
                  type="button"
                  disabled={actingId === item.id}
                  onClick={() =>
                    decide(item, overtimeRequestRejectApi(item.id), null)
                  }
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 ring-1 ring-rose-300 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <X className="size-3.5" />
                  {t("hr_management.overtime.action_reject")}
                </button>

                <p className="basis-full text-xs leading-relaxed text-gray-400">
                  {t("hr_management.overtime.field_approved_minutes_hint")}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OvertimeRequestList;
