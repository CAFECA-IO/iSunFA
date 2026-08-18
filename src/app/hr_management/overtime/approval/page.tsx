"use client";

import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import OvertimeApprovalPageBody from "@/components/hr_management/overtime/overtime_approval_page_body";
import { useDocumentTitle } from "@/hooks/use_document_title";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 加班簽核。
 *
 * 這一頁對所有人開放，內容由「我管得到誰」決定 —— 不是主管的人打開它
 * 會看到空清單，而那是正確的：「你沒有要簽的單」與「你沒有權限」是兩件事，
 * 用 403 表達前者會讓一個剛被升為主管的人以為系統壞了。
 */
export default function OvertimeApprovalPage() {
  const { t } = useTranslation();
  useDocumentTitle(
    `iSunFA - ${t("hr_management.system_name")} | ${t("hr_management.overtime.approval_page_title")}`,
  );

  return (
    <AttendanceAuthGate>
      <OvertimeApprovalPageBody />
    </AttendanceAuthGate>
  );
}
