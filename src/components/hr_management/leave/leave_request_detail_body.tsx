"use client";

import { FC, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Loader2,
  Lock,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  leaveRequestApi,
  leaveRequestApproveApi,
  leaveRequestRejectApi,
} from "@/constants/leave_api";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";
import { LeaveDaySegment } from "@/constants/leave_policy";
import { ILeaveRequestDetail } from "@/interfaces/leave_request";
import ApprovalChainView from "@/components/hr_management/leave/approval_chain_view";
import { ApiError, request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

const SEGMENT_I18N_KEY: Readonly<Record<string, string>> = {
  [LeaveDaySegment.FULL]: "hr_management.leave.segment_full",
  [LeaveDaySegment.MORNING]: "hr_management.leave.segment_morning",
  [LeaveDaySegment.AFTERNOON]: "hr_management.leave.segment_afternoon",
  [LeaveDaySegment.CUSTOM]: "hr_management.leave.segment_custom",
};

/**
 * Info: (20260817 - Julian) 假單明細（L12）。
 *
 * ## 這一頁是事由唯一看得到的地方
 *
 * 事由密文入庫（ADR 018 Tier 2），清單端點一律不帶它 ——
 * 清單是會被投影在會議室螢幕上的畫面，而這一頁是一次明確的點擊。
 * 簽核者在這裡看到的東西會留下個資讀取軌跡（`AuditLogAction.READ`）。
 *
 * ## 為什麼把「已加密」這件事顯示給使用者看
 *
 * 不是為了炫技。看得到「事由是加密儲存的、誰看過會被記錄」，
 * 員工才願意寫「回診複檢」而不是「私事」—— 而後者主管判斷不了。
 * 這一行字是那個設計唯一會被使用者感知到的部分。
 */
const LeaveRequestDetailBody: FC<{ requestId: string }> = ({ requestId }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const [detail, setDetail] = useState<ILeaveRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await request<ILeaveRequestDetail>(leaveRequestApi(requestId)));
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : t("hr_management.leave.error_load"),
      );
    } finally {
      setLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (url: string, body: Record<string, string>) => {
    setActing(true);
    setActionError(null);
    try {
      await request(url, { method: "POST", body: JSON.stringify(body) });
      setRejecting(false);
      setRejectReason("");
      await reload();
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : t("hr_management.leave.error_decide"),
      );
    } finally {
      setActing(false);
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

  if (loadError || detail === null) {
    return (
      <div className="p-4 sm:p-6">
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {loadError ?? t("hr_management.leave.error_load")}
        </p>
      </div>
    );
  }

  const { summary } = detail;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.push(HR_MANAGEMENT_ROUTE.LEAVE)}
        className="flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="size-4" />
        {t("hr_management.leave.action_back")}
      </button>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-semibold text-gray-900">
            {summary.leavePolicyName}
          </h2>
          <span className="text-sm text-gray-500">
            {summary.employeeName}
            <span className="ml-1.5 font-mono text-xs text-gray-400">
              {summary.employeeNo}
            </span>
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span className="tabular-nums">
            {summary.firstWorkDate}
            {summary.lastWorkDate !== summary.firstWorkDate &&
              ` – ${summary.lastWorkDate}`}
          </span>
          <span className="tabular-nums">
            {summary.totalDays.toFixed(1)} {t("hr_management.leave.unit_day")}
            <span className="ml-1 text-gray-400">
              （{summary.totalMinutes} {t("hr_management.leave.unit_minute")}）
            </span>
          </span>
        </div>

        {/**
         * Info: (20260817 - Julian) 併休警示要留在單據上。
         *
         * 它是送出當下的事實（`concurrencyWarned`），而不是現在重算的結果 ——
         * 簽核者要知道的是「這個人送出時就已經知道有人同一天請假」。
         */}
        {detail.concurrencyWarned && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {t("hr_management.leave.detail_concurrency_warned")}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Lock className="size-3.5 text-gray-400" />
          {t("hr_management.leave.detail_reason")}
        </h3>

        {detail.reason === null ? (
          /**
           * Info: (20260817 - Julian) 解不開時說出來，而不是顯示成空白。
           * 空白讀起來像「他沒寫」，而那會讓簽核者以為申請人敷衍 ——
           * 實際上是金鑰出了問題，那是維運要處理的事。
           */
          <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-600">
            <KeyRound className="size-4" />
            {t("hr_management.leave.detail_reason_undecryptable")}
          </p>
        ) : (
          <p className="mt-2 text-sm whitespace-pre-wrap text-gray-800">
            {detail.reason}
          </p>
        )}

        <p className="mt-2 text-xs text-gray-400">
          {t("hr_management.leave.detail_reason_audited")}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">
          {t("hr_management.leave.detail_days")}
        </h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {detail.days.map((day) => (
            <li
              key={day.workDate}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700"
            >
              <span className="font-medium tabular-nums">{day.workDate}</span>
              <span className="text-gray-500">
                {t(SEGMENT_I18N_KEY[day.segment] ?? day.segment)}
              </span>
              <span className="text-gray-500 tabular-nums">
                {day.minutes} {t("hr_management.leave.unit_minute")}
                <span className="ml-1 text-gray-400">
                  / {day.dayEquivalentMinutes}
                </span>
              </span>
              {/**
               * Info: (20260817 - Julian) 被銷假的那一天要看得出來。
               * 它仍留在單據上（`LeaveDay` 不刪列）—— 刪掉的話
               * 「他曾經請過這天、後來被銷了」就消失了。
               */}
              {day.recalledAt && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {t("hr_management.leave.detail_day_recalled")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">
          {t("hr_management.leave.detail_chain")}
        </h3>
        <div className="mt-2">
          <ApprovalChainView
            steps={detail.steps.map((step) => ({
              order: step.order,
              nodeKind: step.nodeKind,
              approverName: step.approverName,
              approverJobTitle: step.approverJobTitle,
              status: step.status,
              mergedFromKinds: step.mergedFromKinds,
              escalatedReason: step.escalatedReason,
            }))}
          />
        </div>

        {/**
         * Info: (20260817 - Julian) 簽核意見另外列出來。
         *
         * 不塞進鏈的節點裡：駁回理由通常是整段話，而鏈是一個緊湊的
         * 流程圖 —— 把長文字擠進去會讓「簽到哪一關」變得難讀。
         */}
        {detail.steps.some((step) => step.comment) && (
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
            {detail.steps
              .filter((step) => step.comment)
              .map((step) => (
                <div key={step.order} className="text-sm">
                  <span className="text-xs text-gray-500">
                    {step.approverName}
                    {step.decidedAt && (
                      <span className="ml-1.5 tabular-nums">
                        {step.decidedAt.slice(0, 16).replace("T", " ")}
                      </span>
                    )}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap text-gray-800">
                    {step.comment}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>

      {actionError && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      {/**
       * Info: (20260817 - Julian) 只有**當前待簽的那個人**看得到簽核鈕。
       *
       * 簽過的人與後面幾關的人都看得到這一頁（那是他們的責任的一部分），
       * 但按鈕只給輪到的人 —— 讓一個按下去必定收到
       * `FO_NOT_AUTHORIZED_REVIEWER` 的按鈕存在，是用錯誤訊息當說明。
       */}
      {detail.viewerIsCurrentApprover && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={acting}
              onClick={() => act(leaveRequestApproveApi(requestId), {})}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {acting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t("hr_management.leave.action_approve")}
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => setRejecting(!rejecting)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-300 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <X className="size-4" />
              {t("hr_management.leave.action_reject")}
            </button>
          </div>

          {rejecting && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-rose-50 p-3">
              <label className="text-xs text-rose-800">
                {t("hr_management.leave.field_reject_reason")}
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-gray-800"
                  placeholder={t(
                    "hr_management.leave.field_reject_placeholder",
                  )}
                />
              </label>
              <button
                type="button"
                disabled={acting || rejectReason.trim().length === 0}
                onClick={() =>
                  act(leaveRequestRejectApi(requestId), {
                    comment: rejectReason,
                  })
                }
                className="self-start rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {t("hr_management.leave.action_reject_confirm")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default LeaveRequestDetailBody;
