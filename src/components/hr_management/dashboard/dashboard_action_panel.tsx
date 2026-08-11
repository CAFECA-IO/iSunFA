"use client";

import { FC } from "react";
import { ClipboardCheck, FileWarning, Repeat } from "lucide-react";
import DashboardActionCard, {
  DashboardActionRow,
} from "@/components/hr_management/dashboard/dashboard_action_card";
import {
  DASHBOARD_LIST_LIMIT,
  DOCUMENT_CATEGORY_I18N_KEY,
  PROCESS_TASK_TYPE_I18N_KEY,
  ProcessTaskType,
} from "@/constants/hr_management";
import {
  IDashboardTaskItem,
  IDocumentAlertItem,
  IProbationAlertItem,
} from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardActionPanelProps {
  probationAlerts: IProbationAlertItem[];
  processTasks: IDashboardTaskItem[];
  documentAlerts: IDocumentAlertItem[];
}

// Info: (20260810 - Julian) 剩餘天數的色調：逾期紅、緊急琥珀、其餘中性
function toneClass(daysLeft: number, isUrgent: boolean): string {
  if (daysLeft < 0) return "bg-red-50 text-red-600";
  if (isUrgent) return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

// Info: (20260810 - Julian) 區塊二上半：待處理流程與到期提醒。
const DashboardActionPanel: FC<IDashboardActionPanelProps> = ({
  probationAlerts,
  processTasks,
  documentAlerts,
}) => {
  const { t } = useTranslation();

  // Info: (20260810 - Julian) 逾期、今天、未來三種說法分開，這一區的每一列都要能一眼判斷。
  const formatDays = (
    daysLeft: number,
    overdueKey: string,
    todayKey: string,
    futureKey: string,
  ) => {
    if (daysLeft < 0) return t(overdueKey, { days: Math.abs(daysLeft) });
    if (daysLeft === 0) return t(todayKey);
    return t(futureKey, { days: daysLeft });
  };

  const renderProbation = (item: IProbationAlertItem) => (
    <DashboardActionRow
      key={item.employeeId}
      initials={getEmployeeInitials(item.employeeName)}
      title={item.employeeName}
      subtitle={`${item.departmentName ?? t("hr_management.value.none")}・${item.jobTitle ?? t("hr_management.value.none")}`}
      trailing={
        <>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass(item.daysLeft, item.isUrgent)}`}
          >
            {formatDays(
              item.daysLeft,
              "hr_management.dashboard.probation_overdue",
              "hr_management.dashboard.probation_due_today",
              "hr_management.dashboard.probation_due",
            )}
          </span>
          {/* ToDo: (20260810 - Julian) 考核表單完成後接上 Modal */}
          <button
            type="button"
            className="rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-100"
          >
            {t("hr_management.dashboard.review_action")}
          </button>
        </>
      }
    />
  );

  const renderTask = (item: IDashboardTaskItem) => (
    <DashboardActionRow
      key={item.id}
      initials={getEmployeeInitials(item.employeeName)}
      title={
        <>
          <span
            className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              item.taskType === ProcessTaskType.ONBOARDING
                ? "bg-emerald-50 text-emerald-700"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {t(PROCESS_TASK_TYPE_I18N_KEY[item.taskType])}
          </span>
          {item.title}
        </>
      }
      subtitle={`${item.employeeName}・${item.departmentName ?? t("hr_management.value.none")}`}
      trailing={
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass(item.daysLeft, item.isUrgent)}`}
        >
          {formatDays(
            item.daysLeft,
            "hr_management.dashboard.overdue",
            "hr_management.dashboard.due_today",
            "hr_management.dashboard.due_in",
          )}
        </span>
      }
    />
  );

  const renderDocument = (item: IDocumentAlertItem) => (
    <DashboardActionRow
      key={item.id}
      initials={getEmployeeInitials(item.employeeName)}
      title={
        <>
          <span className="mr-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
            {t(DOCUMENT_CATEGORY_I18N_KEY[item.category])}
          </span>
          {item.title}
        </>
      }
      subtitle={`${item.employeeName}・${t("hr_management.dashboard.expired_on", { date: item.expiredAt })}`}
      trailing={
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass(item.daysLeft, item.isUrgent)}`}
        >
          {formatDays(
            item.daysLeft,
            "hr_management.dashboard.overdue",
            "hr_management.dashboard.due_today",
            "hr_management.dashboard.due_in",
          )}
        </span>
      }
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <DashboardActionCard
        icon={ClipboardCheck}
        iconClass="text-amber-500"
        title={t("hr_management.dashboard.card_probation")}
        total={probationAlerts.length}
        emptyText={t("hr_management.dashboard.empty_probation")}
      >
        {probationAlerts.slice(0, DASHBOARD_LIST_LIMIT).map(renderProbation)}
      </DashboardActionCard>

      <DashboardActionCard
        icon={Repeat}
        iconClass="text-emerald-500"
        title={t("hr_management.dashboard.card_process")}
        total={processTasks.length}
        emptyText={t("hr_management.dashboard.empty_process")}
      >
        {processTasks.slice(0, DASHBOARD_LIST_LIMIT).map(renderTask)}
      </DashboardActionCard>

      <DashboardActionCard
        icon={FileWarning}
        iconClass="text-rose-500"
        title={t("hr_management.dashboard.card_document")}
        total={documentAlerts.length}
        emptyText={t("hr_management.dashboard.empty_document")}
      >
        {documentAlerts.slice(0, DASHBOARD_LIST_LIMIT).map(renderDocument)}
      </DashboardActionCard>
    </div>
  );
};

export default DashboardActionPanel;
