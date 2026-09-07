"use client";

import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import MyLeavePageBody from "@/components/hr_management/leave/my_leave_page_body";
import { useDocumentTitle } from "@/hooks/use_document_title";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 我的請假。
 *
 * 沿用簽到的登入閘門 —— 兩者的前提相同（要有綁定員工檔的登入帳號），
 * 而多寫一個一模一樣的閘門只會多一份要同步的東西。
 * ToDo: (20260817 - Julian) 閘門的名字綁在 attendance 上已經不準確，
 * 改名為 `HrEmployeeAuthGate` 屬於甲-1 那一輪。
 */
export default function MyLeavePage() {
  const { t } = useTranslation();
  useDocumentTitle(
    `iSunFA - ${t("hr_management.system_name")} | ${t("hr_management.leave.title")}`,
  );

  return (
    <AttendanceAuthGate>
      <MyLeavePageBody />
    </AttendanceAuthGate>
  );
}
