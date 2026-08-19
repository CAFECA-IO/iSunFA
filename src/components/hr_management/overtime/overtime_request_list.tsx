"use client";

import { FC, useState } from "react";
import { Check, FileWarning, Loader2, Siren, Undo2, X } from "lucide-react";
import {
  OVERTIME_REASON_MAX_LENGTH,
  OVERTIME_TIER_I18N_KEY,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeApprovalResult,
  IOvertimeRequestSummary,
} from "@/interfaces/overtime";
import {
  overtimeRequestApproveApi,
  overtimeRequestEmergencyApi,
  overtimeRequestRejectApi,
  overtimeRequestWithdrawApi,
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
  /**
   * Info: (20260819 - Julian) 決行者具 `HR_ADMIN` 職能時，才看得到
   * §32 IV 天災事變的認定區（review B7）。藏不藏都不影響安全 ——
   * `resolveEmergencyDeclaration` 自己會擋 —— 但把一個按下去必定被拒的
   * 表單放在主管面前，只會讓他以為系統壞了。
   */
  mayDeclareEmergency?: boolean;
  /**
   * Info: (20260818 - Julian) 給值才顯示撤回鈕（我的加班用，待簽清單不給）。
   *
   * 與 `decidable` 互斥不是巧合：**撤回只有申請人做得到，簽核只有主管做得到**。
   * 主管想讓一張單消失，正確的動作是駁回 —— 那會留下他的名字。
   */
  withdrawable?: boolean;
  onChanged?: () => void | Promise<void>;
}> = ({
  requests,
  emptyKey,
  decidable = false,
  mayDeclareEmergency = false,
  withdrawable = false,
  onChanged = undefined,
}) => {
  const { t } = useTranslation();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Info: (20260818 - Julian) 錯誤碼另外留一份：訊息是給人看的，碼是給程式判斷的
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [approvedMinutes, setApprovedMinutes] = useState<
    Record<string, number>
  >({});
  const [emergencyOn, setEmergencyOn] = useState<Record<string, boolean>>({});
  const [emergencyUrl, setEmergencyUrl] = useState<Record<string, string>>({});
  const [emergencyAt, setEmergencyAt] = useState<Record<string, string>>({});
  const [withdrawReason, setWithdrawReason] = useState<Record<string, string>>(
    {},
  );

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
    body: Record<string, unknown> | null,
    /**
     * Info: (20260818 - Julian) 未登記錯誤碼時要退回哪一句。核准／駁回與撤回
     * 是不同的動作，共用「簽核失敗」會讓撤回失敗時的訊息指錯方向。
     */
    fallbackKey = "hr_management.overtime.error_decide",
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
      /**
       * Info: (20260818 - Julian) 只有核准會回認列／未核准／補休三個數字。
       * 駁回與撤回回的是單子本身，沒有這些欄位 —— 不檢查就會印出
       * 「認列 undefined 分」那種訊息。
       */
      const result = response.payload;
      if (
        result !== null &&
        result !== undefined &&
        typeof result.recognizedMinutes === "number"
      ) {
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
      setError(t(errorI18nKeyOf(caught, fallbackKey, OVERTIME_ERROR_I18N_KEY)));
    } finally {
      setActingId(null);
    }
  };

  if (requests.length === 0) {
    return <p className="text-sm text-gray-400">{t(emptyKey)}</p>;
  }

  // Info: (20260818 - Julian) 兩段說明只在真的有單可簽／可撤時才出現
  const hasPending = requests.some(
    (item) => item.status === OvertimeRequestStatus.PENDING,
  );

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
           * 事變的法定報備，它是一個**合法性依據**；若只是主管的例外核准說明，
           * 它是一筆**違規紀錄**。把後者當成前者，等於讓系統對勞動檢查宣稱
           * 一件不成立的合法性。
           *
           * Info: (20260819 - Julian) §32 IV 那一側現在有落腳處了（review B7）：
           * 認定由 `HR_ADMIN` 在上面的核准區給出，並強制附報備紀錄與報備時點。
           * 但**這顆按鈕仍然按不下去** —— 它要處理的是超限那一種，而
           * 「超限但有報備」與「超限就是違法」該落成哪一種紀錄，還沒有決定。
           *
           * 尚未回原文核對的是 §32 IV 的法定書表格式與必填欄位（報備時限與
           * 受理機關已在條文層面確認）。因此這裡只放出入口，不改變阻擋行為。
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
                  {/**
                   * Info: (20260819 - Julian) 標記連到報備紀錄（review B7）。
                   * 一個寫著「天災事變·加倍發給」卻點不進去的標記，
                   * 看的人沒有辦法判斷它是不是真的報備過 —— 而那正是
                   * 這一欄從自填布林值改成強制記載的理由。
                   */}
                  {item.isEmergency &&
                    (item.emergencyReportUrl === null ? (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                        <Siren className="size-3" />
                        {t("hr_management.overtime.list_emergency_badge")}
                      </span>
                    ) : (
                      <a
                        href={item.emergencyReportUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 underline decoration-orange-300 underline-offset-2 hover:bg-orange-200"
                      >
                        <Siren className="size-3" />
                        {t("hr_management.overtime.list_emergency_badge")}
                      </a>
                    ))}
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

                {/**
                 * Info: (20260819 - Julian) §32 IV 天災事變的認定（review B7）。
                 *
                 * **這不是核准的一部分，是另一個人做的另一件事。** 它自己按、
                 * 自己送到 `.../emergency`，送完單子仍停在待簽核 —— 主管接著
                 * 會看到「天災事變」的標記再決定核不核。做成核准的一個欄位
                 * 會撞上一個空集合：核准要求「管得到他的主管」，認定要求
                 * `HR_ADMIN`，一般組織裡沒有人同時是兩者。
                 *
                 * 兩格都必填：認定的後果是整段工資跳到加倍發給，而「已報備」
                 * 是一件對外發生的事。沒有紀錄就沒有認定 —— repository 端的
                 * `assertOvertimeEmergencyRecord` 會再擋一次，這裡只是讓人
                 * 不必按下去才知道。
                 */}
                {mayDeclareEmergency && !item.isEmergency && (
                  <div className="w-full">
                    <label className="flex items-start gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={emergencyOn[item.id] ?? false}
                        onChange={(event) =>
                          setEmergencyOn((current) => ({
                            ...current,
                            [item.id]: event.target.checked,
                          }))
                        }
                        className="mt-0.5 size-4 shrink-0 rounded border-gray-300"
                      />
                      <span>
                        {t("hr_management.overtime.field_emergency")}
                        <span className="mt-0.5 block leading-relaxed text-gray-400">
                          {t("hr_management.overtime.field_emergency_hint")}
                        </span>
                      </span>
                    </label>

                    {emergencyOn[item.id] === true && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs text-gray-600">
                          {t("hr_management.overtime.field_emergency_report")}
                          <input
                            type="url"
                            value={emergencyUrl[item.id] ?? ""}
                            onChange={(event) =>
                              setEmergencyUrl((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-gray-600">
                          {t(
                            "hr_management.overtime.field_emergency_reported_at",
                          )}
                          <input
                            type="datetime-local"
                            value={emergencyAt[item.id] ?? ""}
                            onChange={(event) =>
                              setEmergencyAt((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 tabular-nums"
                          />
                        </label>

                        <button
                          type="button"
                          disabled={
                            actingId === item.id ||
                            (emergencyUrl[item.id] ?? "").trim() === "" ||
                            (emergencyAt[item.id] ?? "") === ""
                          }
                          onClick={() =>
                            decide(
                              item,
                              overtimeRequestEmergencyApi(item.id),
                              {
                                reportUrl: emergencyUrl[item.id] ?? "",
                                reportedAt: new Date(
                                  emergencyAt[item.id] ?? "",
                                ).toISOString(),
                              },
                              "hr_management.overtime.error_declare_emergency",
                            )
                          }
                          className="self-end rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                        >
                          {t("hr_management.overtime.action_declare_emergency")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/**
             * Info: (20260818 - Julian) 撤回區：只有申請人自己、只在待簽核。
             *
             * 事後補單要填理由才送得出去 —— 那是收回一句對已發生事實的陳述，
             * 方向對雇主有利、對勞工不利，一筆沒有理由的撤回事後判斷不出
             * 它是自願的還是被要求的。事前申請不必填。
             */}
            {withdrawable && item.status === OvertimeRequestStatus.PENDING && (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                {item.filingType === OvertimeFilingType.POST_HOC && (
                  <label className="flex flex-1 flex-col gap-1 text-xs text-gray-600">
                    {t("hr_management.overtime.field_withdraw_reason")}
                    <input
                      type="text"
                      value={withdrawReason[item.id] ?? ""}
                      maxLength={OVERTIME_REASON_MAX_LENGTH}
                      onChange={(event) =>
                        setWithdrawReason((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder={t(
                        "hr_management.overtime.field_withdraw_reason_placeholder",
                      )}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                    />
                  </label>
                )}

                <button
                  type="button"
                  disabled={
                    actingId === item.id ||
                    (item.filingType === OvertimeFilingType.POST_HOC &&
                      (withdrawReason[item.id] ?? "").trim().length === 0)
                  }
                  onClick={() =>
                    decide(
                      item,
                      overtimeRequestWithdrawApi(item.id),
                      { reason: (withdrawReason[item.id] ?? "").trim() },
                      "hr_management.overtime.error_withdraw",
                    )
                  }
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 ring-1 ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actingId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="size-3.5" />
                  )}
                  {t("hr_management.overtime.action_withdraw")}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/**
       * Info: (20260818 - Julian) 兩段規則說明擺在清單末端，每種各一次。
       *
       * 它們講的是**規則**不是這一列的狀況 —— 逐列重印一次，讀者第二次就開始
       * 略過它，而第一次真正需要它的人反而被淹沒在重複裡。清單愈長愈明顯：
       * 五張待簽核的單就是五段一模一樣的灰字。
       *
       * 條件是「有沒有那個動作可做」而不是「清單空不空」：一份全是已核准
       * 的清單上掛一句撤回說明，同樣是噪音。
       */}
      {decidable && hasPending && (
        <p className="px-1 text-xs leading-relaxed text-gray-400">
          {t("hr_management.overtime.field_approved_minutes_hint")}
        </p>
      )}
      {withdrawable && hasPending && (
        <p className="px-1 text-xs leading-relaxed text-gray-400">
          {t("hr_management.overtime.action_withdraw_hint")}
        </p>
      )}
    </div>
  );
};

export default OvertimeRequestList;
