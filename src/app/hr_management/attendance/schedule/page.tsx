"use client";

import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import SchedulePageBody from "@/components/hr_management/attendance/schedule_page_body";
import { useDocumentTitle } from "@/hooks/use_document_title";
import { useTranslation } from "@/i18n/i18n_context";

export default function AttendanceSchedulePage() {
  const { t } = useTranslation();
  useDocumentTitle(
    `iSunFA - ${t("hr_management.system_name")} | ${t("hr_management.attendance_schedule.title")}`,
  );

  // Info: (20260813 - Julian) Main body。未登入時閘門會擋住，子元件不會 mount
  return (
    <AttendanceAuthGate>
      <SchedulePageBody />
    </AttendanceAuthGate>
  );
}
