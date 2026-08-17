"use client";

import { FC } from "react";
import { CalendarOff, Loader2, Send } from "lucide-react";
import { ILeaveTodayEntry } from "@/interfaces/leave";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260814 - Julian) 現場頁的「今日請假」區塊。
 *
 * 在此之前請假的人在這一頁上完全不存在：沒有打卡所以不在班，而未到工的判定
 * 硬性 gate 在 `dayType === WORK`。人手不足要能銷假，前提是先看得到誰在放假。
 *
 * 名單對所有員工開放；徵詢入口只給主管（計畫書 §8.5）。
 *
 * Info: (20260817 - Julian) **不再顯示假別。** 這一頁對全體員工開放，
 * 而病假、生理假、產假、家庭照顧假會直接揭露健康與生育狀況（ADR 018 Tier 2）。
 * 這一區要回答的是「今天人手夠不夠」，那個問題只需要知道誰不在。
 * 主管在銷假徵詢的畫面上仍看得到假別 —— 那是他要做判斷的依據。
 */
const LeaveTodayPanel: FC<{
  entries: ILeaveTodayEntry[];
  canRequestRecall: boolean;
  pendingLeaveDayId: string | null;
  onRequestRecall: (entry: ILeaveTodayEntry) => void;
}> = ({ entries, canRequestRecall, pendingLeaveDayId, onRequestRecall }) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <CalendarOff className="size-4 text-amber-500" />
        {t("hr_management.attendance_presence.leave_title", {
          count: entries.length,
        })}
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">
          {t("hr_management.attendance_presence.leave_empty")}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.leaveDayId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {entry.name}
                  <span className="ml-2 font-mono text-xs text-gray-400">
                    {entry.employeeNo}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-500">
                  {t("hr_management.attendance_presence.leave_on_leave")}
                  {entry.jobTitle ? `　${entry.jobTitle}` : ""}
                  {entry.departmentName ? `　${entry.departmentName}` : ""}
                </div>
              </div>

              {/**
               * Info: (20260814 - Julian) 已有待回應徵詢時換成狀態文字，而不是讓人再按一次 ——
               * 按下去得到 409，等於用錯誤訊息當說明。
               */}
              {entry.hasPendingRecall ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {t("hr_management.attendance_presence.leave_recall_pending")}
                </span>
              ) : (
                canRequestRecall && (
                  <button
                    type="button"
                    disabled={pendingLeaveDayId === entry.leaveDayId}
                    onClick={() => onRequestRecall(entry)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pendingLeaveDayId === entry.leaveDayId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {t("hr_management.attendance_presence.leave_recall_action")}
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {/**
       * Info: (20260817 - Julian) 提示文案改為說明「這裡刻意看不到假別」——
       * 看得到名字卻看不到原因，若不說明，使用者只會以為是壞掉了。
       */}
      <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
        {t("hr_management.attendance_presence.leave_hint")}
      </p>
    </div>
  );
};

export default LeaveTodayPanel;
