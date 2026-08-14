"use client";

import { ATTENDANCE_API } from "@/constants/attendance";
import { FC, Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Loader2 } from "lucide-react";
import { LEAVE_RECALL_REASON_MAX_LENGTH } from "@/constants/leave";
import { ILeaveTodayEntry } from "@/interfaces/leave";
import { IShiftPatternSummary } from "@/interfaces/attendance";
import { formatMinuteOfDay } from "@/lib/utils/attendance_format";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260814 - Julian) 發起銷假徵詢（A12）。
 *
 * 送出**不會改動任何排班** —— 徵詢期間假仍然生效，只有員工在自己的打卡頁按同意
 * 才會投影回 `EmployeeShiftDay`（勞基法 §38 III：特休期日由勞工排定，雇主僅得協商調整）。
 *
 * 班別與原因都必填：員工要同意的是一個具體的班，而原因是「企業經營上之急迫需求」
 * 的書面記載，不是備註欄。
 */
const LeaveRecallDialog: FC<{
  entry: ILeaveTodayEntry | null;
  onClose: () => void;
  onSubmitted: () => void;
}> = ({ entry, onClose, onSubmitted }) => {
  const { t } = useTranslation();

  const [patterns, setPatterns] = useState<IShiftPatternSummary[]>([]);
  const [shiftPatternId, setShiftPatternId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Info: (20260814 - Julian) 每次開啟都重取並清空，避免上一位的原因被誤送給下一位
  useEffect(() => {
    if (!entry) return;

    setReason("");
    setError(null);

    request<IEnvelopeLike<IShiftPatternSummary[]>>(ATTENDANCE_API.SHIFT_PATTERN)
      .then((response) => {
        const list = response.payload ?? [];
        setPatterns(list);
        setShiftPatternId(list[0]?.id ?? "");
      })
      .catch(() =>
        setError(t("hr_management.attendance_presence.recall_error")),
      );
  }, [entry, t]);

  const submit = async () => {
    if (!entry || !shiftPatternId || reason.trim().length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      await request(ATTENDANCE_API.LEAVE_RECALL, {
        method: "POST",
        body: JSON.stringify({
          leaveDayId: entry.leaveDayId,
          shiftPatternId,
          reason: reason.trim(),
        }),
      });
      onSubmitted();
      onClose();
    } catch {
      setError(t("hr_management.attendance_presence.recall_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition show={entry !== null} as={Fragment}>
      <Dialog as="div" className="relative z-9998" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 z-9999 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:scale-95"
            >
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
                <DialogTitle className="text-lg font-semibold text-gray-800">
                  {t("hr_management.attendance_presence.recall_title")}
                </DialogTitle>

                <p className="mt-2 text-sm text-gray-500">
                  {t("hr_management.attendance_presence.recall_desc", {
                    name: entry?.name ?? "",
                    employeeNo: entry?.employeeNo ?? "",
                    date: entry?.workDate ?? "",
                  })}
                </p>

                <label className="mt-5 block text-sm font-medium text-gray-700">
                  {t("hr_management.attendance_presence.recall_shift_label")}
                  <select
                    value={shiftPatternId}
                    onChange={(event) => setShiftPatternId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  >
                    {patterns.map((pattern) => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}　
                        {formatMinuteOfDay(
                          pattern.window.windowStartMinute,
                          t("hr_management.attendance.next_day"),
                        )}
                        –
                        {formatMinuteOfDay(
                          pattern.window.windowEndMinute,
                          t("hr_management.attendance.next_day"),
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block text-sm font-medium text-gray-700">
                  {t("hr_management.attendance_presence.recall_reason_label")}
                  <textarea
                    rows={3}
                    value={reason}
                    maxLength={LEAVE_RECALL_REASON_MAX_LENGTH}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t(
                      "hr_management.attendance_presence.recall_reason_placeholder",
                    )}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  />
                </label>

                {/**
                 * Info: (20260814 - Julian) 明講「送出不會改動班表」——
                 * 主管以為按下去人就回來了，是這個流程最可能的誤解。
                 */}
                <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
                  {t("hr_management.attendance_presence.recall_notice")}
                </p>

                {error && (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                  >
                    {t("hr_management.attendance_presence.recall_cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={
                      submitting ||
                      !shiftPatternId ||
                      reason.trim().length === 0
                    }
                    onClick={submit}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    {t("hr_management.attendance_presence.recall_submit")}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LeaveRecallDialog;
