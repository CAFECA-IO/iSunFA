"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { Check, Loader2, Stamp, X } from "lucide-react";
import {
  LEAVE_API,
  leaveRequestApproveApi,
  leaveRequestRejectApi,
} from "@/constants/leave_api";
import { ILeaveRequestSummary } from "@/interfaces/leave_request";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { LEAVE_ERROR_I18N_KEY } from "@/lib/utils/leave_error_message";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 待我簽核（L16 / L14 / L15）。
 *
 * ## 為什麼駁回必須填理由、核准可以不填
 *
 * 兩者的不對稱是刻意的。核准是「照著規則走」，沒有額外資訊要傳達；
 * 駁回是**否定一個人的請求**，而他有權知道為什麼 ——
 * 一句「已駁回」會讓他重送一模一樣的單，然後再被駁一次。
 *
 * ## 為什麼不在這一頁顯示事由
 *
 * 事由是密文入庫的 Tier 2 個資。簽核者確實有權看（那是他判斷的依據），
 * 但那應該發生在明細頁的一次明確點擊，而不是在一張會被投影出來的清單上
 * 一次攤開全部門的病名。
 * ToDo: (20260817 - Julian) 明細頁（L12）尚未有畫面；解密與顯示在那裡做。
 */
const LeaveApprovalPageBody: FC = () => {
  const { t } = useTranslation();

  const [pending, setPending] = useState<ILeaveRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setPending(
        await request<ILeaveRequestSummary[]>(LEAVE_API.REQUEST_PENDING),
      );
    } catch (error) {
      setLoadError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.leave.error_load",
            LEAVE_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (
    requestId: string,
    url: string,
    body: Record<string, string>,
  ) => {
    setActingId(requestId);
    setActionError(null);
    try {
      await request(url, { method: "POST", body: JSON.stringify(body) });
      setRejectingId(null);
      setRejectReason("");
      await reload();
    } catch (error) {
      setActionError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.leave.error_decide",
            LEAVE_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        {t("hr_management.leave.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Stamp className="size-4 text-sky-500" />
        {t("hr_management.leave.approval_title", { count: pending.length })}
      </h2>

      {loadError && (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {loadError}
        </p>
      )}

      {actionError && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      {pending.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 ring-1 ring-gray-200">
          {t("hr_management.leave.approval_empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
                    <span className="font-medium">{item.employeeName}</span>
                    <span className="font-mono text-xs text-gray-400">
                      {item.employeeNo}
                    </span>
                    <span>{item.leavePolicyName}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    <span className="tabular-nums">
                      {item.firstWorkDate}
                      {item.lastWorkDate !== item.firstWorkDate &&
                        ` – ${item.lastWorkDate}`}
                    </span>
                    <span className="ml-2 tabular-nums">
                      {item.totalDays.toFixed(1)}{" "}
                      {t("hr_management.leave.unit_day")}
                    </span>
                    {item.pendingStepOrder !== null && (
                      <span className="ml-2">
                        {t("hr_management.leave.list_step_self", {
                          current: item.pendingStepOrder + 1,
                          total: item.totalSteps,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() =>
                      act(item.id, leaveRequestApproveApi(item.id), {})
                    }
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actingId === item.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    {t("hr_management.leave.action_approve")}
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() =>
                      setRejectingId(rejectingId === item.id ? null : item.id)
                    }
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-300 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                    {t("hr_management.leave.action_reject")}
                  </button>
                </div>
              </div>

              {/**
               * Info: (20260817 - Julian) 駁回理由就地展開，不用 modal。
               *
               * 主管一次要處理一疊單子，modal 會讓他每一張都要多按兩次
               * （開、關）。就地展開也讓「哪一張正在被駁回」不會弄錯。
               */}
              {rejectingId === item.id && (
                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-rose-50 p-3">
                  <label className="text-xs text-rose-800">
                    {t("hr_management.leave.field_reject_reason")}
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-gray-800"
                      placeholder={t(
                        "hr_management.leave.field_reject_placeholder",
                      )}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={
                      actingId === item.id || rejectReason.trim().length === 0
                    }
                    onClick={() =>
                      act(item.id, leaveRequestRejectApi(item.id), {
                        comment: rejectReason,
                      })
                    }
                    className="self-start rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {t("hr_management.leave.action_reject_confirm")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveApprovalPageBody;
