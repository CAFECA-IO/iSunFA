"use client";

import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import LeaveApprovalPageBody from "@/components/hr_management/leave/leave_approval_page_body";
import { useDocumentTitle } from "@/hooks/use_document_title";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 待我簽核。
 *
 * 這一頁對所有人開放，內容由 `listPendingForApprover` 決定 ——
 * 不是主管的人打開它會看到空清單，而那是正確的：
 * 「你沒有要簽的單」與「你沒有權限」是兩件事，用 403 表達前者
 * 會讓一個剛被升為主管的人以為系統壞了。
 */
export default function LeaveApprovalPage() {
  const { t } = useTranslation();
  useDocumentTitle(
    `iSunFA - ${t("hr_management.system_name")} | ${t("hr_management.leave.approval_page_title")}`,
  );

  return (
    <AttendanceAuthGate>
      <LeaveApprovalPageBody />
    </AttendanceAuthGate>
  );
}
