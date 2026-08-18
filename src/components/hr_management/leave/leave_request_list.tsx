"use client";

import { FC, useState } from "react";
import { ChevronRight, Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { LeaveRequestStatus } from "@/constants/leave";
import { ILeaveRequestSummary } from "@/interfaces/leave_request";
import { leaveRequestApi } from "@/constants/leave_api";
import { leaveRequestDetailRoute } from "@/constants/hr_management";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { LEAVE_ERROR_I18N_KEY } from "@/lib/utils/leave_error_message";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

const STATUS_STYLE: Readonly<Record<string, string>> = {
  [LeaveRequestStatus.PENDING]: "bg-sky-100 text-sky-700",
  [LeaveRequestStatus.APPROVED]: "bg-emerald-100 text-emerald-700",
  [LeaveRequestStatus.REJECTED]: "bg-rose-100 text-rose-700",
  [LeaveRequestStatus.WITHDRAWN]: "bg-gray-200 text-gray-600",
};

const STATUS_I18N_KEY: Readonly<Record<string, string>> = {
  [LeaveRequestStatus.PENDING]: "hr_management.leave.status_pending",
  [LeaveRequestStatus.APPROVED]: "hr_management.leave.status_approved",
  [LeaveRequestStatus.REJECTED]: "hr_management.leave.status_rejected",
  [LeaveRequestStatus.WITHDRAWN]: "hr_management.leave.status_withdrawn",
};

/**
 * Info: (20260817 - Julian) 假單清單。我的假單與待簽清單共用。
 *
 * ## 為什麼不顯示事由
 *
 * 事由是密文入庫的 Tier 2 個資（病名、家屬狀況、司法事由）。
 * 清單是一個會被投影在會議室螢幕上的畫面 —— 明細頁再看即可。
 * 清單只回答「誰、什麼假、幾天、卡在哪一關」，那足以決定要不要點進去。
 *
 * ## 為什麼要顯示「第幾關 / 共幾關」
 *
 * 「等主管簽」與「等三關裡的第二關」對申請人是完全不同的資訊 ——
 * 後者答得出「還要多久」。`pendingStepOrder` 與 `totalSteps` 就是為此存在。
 */
const LeaveRequestList: FC<{
  requests: ILeaveRequestSummary[];
  emptyKey: string;
  /** Info: (20260817 - Julian) 有值時，該狀態的單會出現撤回按鈕（只有申請人看得到自己的） */
  withdrawableStatus?: LeaveRequestStatus;
  onChanged: () => void | Promise<void>;
}> = ({
  requests,
  emptyKey,
  // Info: (20260817 - Julian) 未給即不顯示撤回按鈕（待簽清單就是這種）
  withdrawableStatus = undefined,
  onChanged,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async (requestId: string) => {
    setPendingId(requestId);
    setError(null);
    try {
      await request(leaveRequestApi(requestId), { method: "DELETE" });
      await onChanged();
    } catch (caught) {
      setError(
        t(
          errorI18nKeyOf(
            caught,
            "hr_management.leave.error_withdraw",
            LEAVE_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setPendingId(null);
    }
  };

  if (requests.length === 0) {
    return <p className="text-sm text-gray-400">{t(emptyKey)}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {requests.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
              <span className="font-medium">{item.leavePolicyName}</span>
              <span className="text-gray-500 tabular-nums">
                {item.firstWorkDate}
                {item.lastWorkDate !== item.firstWorkDate &&
                  ` – ${item.lastWorkDate}`}
              </span>
              <span className="text-gray-500 tabular-nums">
                {item.totalDays.toFixed(1)} {t("hr_management.leave.unit_day")}
              </span>
            </div>

            <div className="mt-0.5 text-xs text-gray-500">
              <span className="font-mono">{item.employeeNo}</span>{" "}
              {item.employeeName}
              {/* Info: (20260817 - Julian) 「第幾關 / 共幾關」才答得出「還要多久」 */}
              {item.pendingStepOrder !== null && (
                <span className="ml-2">
                  {t("hr_management.leave.list_step_progress", {
                    current: item.pendingStepOrder + 1,
                    total: item.totalSteps,
                    approver: item.pendingApproverName ?? "—",
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_STYLE[item.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {t(STATUS_I18N_KEY[item.status] ?? item.status)}
            </span>

            {/**
             * Info: (20260817 - Julian) 事由只在明細頁看得到（會留個資軌跡），
             * 因此清單必須有一個明確的入口 —— 而不是讓整列可點：
             * 整列可點會讓「撤回」按鈕變成一個踩雷區。
             */}
            <button
              type="button"
              onClick={() => router.push(leaveRequestDetailRoute(item.id))}
              className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50"
            >
              {t("hr_management.leave.action_detail")}
              <ChevronRight className="size-3.5" />
            </button>

            {withdrawableStatus && item.status === withdrawableStatus && (
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => withdraw(item.id)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-300 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {pendingId === item.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Undo2 className="size-3.5" />
                )}
                {t("hr_management.leave.action_withdraw")}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeaveRequestList;
