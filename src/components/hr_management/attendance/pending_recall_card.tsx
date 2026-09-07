"use client";

import { leaveRecallRespondApi } from "@/constants/attendance";
import { FC, useState } from "react";
import { Check, Loader2, MailQuestion, X } from "lucide-react";
import {
  LeaveRecallDecision,
  LEAVE_RECALL_NOTE_MAX_LENGTH,
} from "@/constants/leave";
import { ILeaveRecallView } from "@/interfaces/leave";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260814 - Julian) 打卡頁上的待回應銷假徵詢（A14）。
 *
 * 同意與婉拒**同等份量**，不做成「同意」大按鈕加一行小字「不要」——
 * 勞基法 §38 III 要的是協商，把拒絕做得比接受難按，就是用版面施壓。
 *
 * 同意的那一刻才會改班表；在此之前這一天仍然是假，員工不會被算進未到工。
 */
const PendingRecallCard: FC<{
  recall: ILeaveRecallView;
  onResponded: () => void;
}> = ({ recall, onResponded }) => {
  const { t } = useTranslation();

  const [decliningNote, setDecliningNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<LeaveRecallDecision | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const respond = async (decision: LeaveRecallDecision) => {
    setSubmitting(decision);
    setError(null);

    try {
      await request(leaveRecallRespondApi(recall.recallId), {
        method: "POST",
        body: JSON.stringify({
          decision,
          note: decliningNote?.trim() || undefined,
        }),
      });
      onResponded();
    } catch {
      setError(t("hr_management.attendance.recall_error"));
      setSubmitting(null);
    }
  };

  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 lg:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <MailQuestion className="size-4" />
        {t("hr_management.attendance.recall_title")}
      </div>

      <p className="mt-2 text-sm text-amber-900">
        {t("hr_management.attendance.recall_from", {
          name: recall.requestedByName,
          employeeNo: recall.requestedByEmployeeNo,
          date: recall.workDate,
          shift: recall.shiftName,
        })}
      </p>

      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm text-gray-700">
        <div className="text-xs font-medium text-gray-500">
          {t("hr_management.attendance.recall_reason_label")}
        </div>
        <div className="mt-0.5 leading-relaxed">{recall.reason}</div>
      </div>

      {/**
       * Info: (20260814 - Julian) 說清楚拒絕是允許的，而且不必給理由。
       * 少了這一句，畫面上只有一個「同意」和一個「婉拒」，讀起來像在問「要不要配合」。
       */}
      <p className="mt-3 text-xs leading-relaxed text-amber-800">
        {t("hr_management.attendance.recall_notice")}
      </p>

      {decliningNote !== null && (
        <textarea
          rows={2}
          value={decliningNote}
          maxLength={LEAVE_RECALL_NOTE_MAX_LENGTH}
          onChange={(event) => setDecliningNote(event.target.value)}
          placeholder={t("hr_management.attendance.recall_note_placeholder")}
          className="mt-3 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm text-gray-800"
        />
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() =>
            decliningNote === null
              ? setDecliningNote("")
              : respond(LeaveRecallDecision.DECLINE)
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting === LeaveRecallDecision.DECLINE ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          {t("hr_management.attendance.recall_decline")}
        </button>

        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => respond(LeaveRecallDecision.ACCEPT)}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {submitting === LeaveRecallDecision.ACCEPT ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {t("hr_management.attendance.recall_accept")}
        </button>
      </div>
    </div>
  );
};

export default PendingRecallCard;
