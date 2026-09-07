"use client";

import { use } from "react";
import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import LeaveRequestDetailBody from "@/components/hr_management/leave/leave_request_detail_body";
import { useDocumentTitle } from "@/hooks/use_document_title";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 假單明細。
 *
 * 路徑放在 `leave/request/[request_id]` 而不是 `leave/[request_id]`：
 * 後者會與 `leave/approval` 這個靜態片段共存於同一層。Next.js 會讓靜態優先，
 * 所以它能跑 —— 但下一個加靜態子頁的人得先知道這件事才不會踩到，
 * 而那個知識不會寫在任何地方。多一層 `request/` 讓它不必被知道。
 */
export default function LeaveRequestDetailPage({
  params,
}: {
  params: Promise<{ request_id: string }>;
}) {
  const { t } = useTranslation();
  const { request_id: requestId } = use(params);

  useDocumentTitle(
    `iSunFA - ${t("hr_management.system_name")} | ${t("hr_management.leave.detail_title")}`,
  );

  return (
    <AttendanceAuthGate>
      <LeaveRequestDetailBody requestId={requestId} />
    </AttendanceAuthGate>
  );
}
