"use client";

import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import MyOvertimePageBody from "@/components/hr_management/overtime/my_overtime_page_body";
import { useDocumentTitle } from "@/hooks/use_document_title";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 我的加班。
 *
 * 沿用簽到的登入閘門，理由同「我的請假」：前提相同（要有綁定員工檔的
 * 登入帳號），而多寫一個一模一樣的閘門只會多一份要同步的東西。
 */
export default function MyOvertimePage() {
  const { t } = useTranslation();
  useDocumentTitle(
    `iSunFA - ${t("hr_management.system_name")} | ${t("hr_management.overtime.title")}`,
  );

  return (
    <AttendanceAuthGate>
      <MyOvertimePageBody />
    </AttendanceAuthGate>
  );
}
