"use client";

import { FC, useMemo } from "react";
import { Bell } from "lucide-react";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import MovementProgressBar from "@/components/hr_management/movement/movement_progress_bar";
import {
  ChecklistState,
  CHECKLIST_STATE_I18N_KEY,
  CHECKLIST_STATE_STYLE,
  HR_PENDING_ACTION_CLASS,
  MOVEMENT_STAGE_I18N_KEY,
  OnboardingQuickFilter,
  ONBOARDING_QUICK_FILTERS,
  ONBOARDING_QUICK_FILTER_I18N_KEY,
} from "@/constants/hr_management";
import { IOnboardingRow } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IOnboardingTableProps {
  rows: IOnboardingRow[];
  activeFilter: OnboardingQuickFilter;
  onFilterChange: (filter: OnboardingQuickFilter) => void;
  onOpenDetail: (row: IOnboardingRow) => void;
}

// Info: (20260811 - Julian) 三個行政欄位共用的狀態標籤
const StateBadge: FC<{ state: ChecklistState }> = ({ state }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${CHECKLIST_STATE_STYLE[state]}`}
    >
      {t(CHECKLIST_STATE_I18N_KEY[state])}
    </span>
  );
};

/**
 * Info: (20260811 - Julian) 新人報到列表。
 *
 * 三個行政欄位（報到前表單／IT 帳號設備／簽署合約）是由任務彙總出來的，
 * 不是獨立欄位：同一件事在抽屜裡勾完，這裡就會跟著變，不會有分歧。
 */
const OnboardingTable: FC<IOnboardingTableProps> = ({
  rows,
  activeFilter,
  onFilterChange,
  onOpenDetail,
}) => {
  const { t } = useTranslation();

  const columns = useMemo<IDataTableColumn<IOnboardingRow>[]>(
    () => [
      {
        key: "employee",
        label: t("hr_management.movement.th_employee"),
        render: (row) => (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
              {getEmployeeInitials(row.employeeName)}
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-gray-800">
                {row.employeeName}
              </div>
              <div className="mt-0.5 font-mono text-xs text-gray-400">
                {row.employeeNo}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "department",
        label: t("hr_management.movement.th_department"),
        render: (row) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-700">
              {row.departmentName ?? t("hr_management.value.none")}
            </div>
            <div className="mt-0.5 truncate text-xs text-gray-400">
              {row.jobTitle ?? t("hr_management.value.none")}
            </div>
          </div>
        ),
      },
      {
        key: "hireDate",
        label: t("hr_management.movement.th_hire_date"),
        render: (row) => (
          <div>
            <div className="text-sm text-gray-600">{row.keyDate}</div>
            <div className="text-xs text-gray-400">
              {row.daysUntilKeyDate > 0
                ? t("hr_management.movement.days_until", {
                    days: row.daysUntilKeyDate,
                  })
                : t("hr_management.movement.days_since", {
                    days: Math.abs(row.daysUntilKeyDate),
                  })}
            </div>
          </div>
        ),
      },
      {
        key: "form",
        label: t("hr_management.movement.th_form"),
        render: (row) => <StateBadge state={row.formState} />,
      },
      {
        key: "equipment",
        label: t("hr_management.movement.th_equipment"),
        render: (row) => <StateBadge state={row.equipmentState} />,
      },
      {
        key: "contract",
        label: t("hr_management.movement.th_contract"),
        render: (row) => <StateBadge state={row.contractState} />,
      },
      {
        key: "progress",
        label: t("hr_management.movement.th_progress"),
        render: (row) => (
          <div className="w-36">
            <MovementProgressBar
              completed={row.completedTaskCount}
              total={row.totalTaskCount}
              label={t("hr_management.movement.task_progress")}
            />
          </div>
        ),
      },
      {
        key: "stage",
        label: t("hr_management.movement.th_status"),
        render: (row) => (
          <div className="flex flex-col items-start gap-1">
            <MovementAlertBadge alert={row.alert} />
            <span className="text-xs text-gray-400">
              {t(MOVEMENT_STAGE_I18N_KEY[row.stage])}
            </span>
          </div>
        ),
      },
      {
        key: "action",
        label: t("hr_management.movement.th_action"),
        align: "right",
        render: () => (
          <div className="flex items-center justify-end gap-2">
            {/* ToDo: (20260811 - Julian) 通知 API 完成後接上寄送提醒 */}
            <button
              type="button"
              // Info: (20260812 - Julian) 停用後不需擋冒泡，disabled 不會產生 click
              title={t("hr_management.value.feature_pending")}
              disabled
              className={`inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 ${HR_PENDING_ACTION_CLASS}`}
            >
              <Bell className="h-3.5 w-3.5 shrink-0" />
              {t("hr_management.movement.action_remind")}
            </button>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {ONBOARDING_QUICK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onFilterChange(filter)}
            aria-pressed={activeFilter === filter}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === filter
                ? "bg-orange-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t(ONBOARDING_QUICK_FILTER_I18N_KEY[filter])}
          </button>
        ))}
      </div>

      {/* Info: (20260811 - Julian) 整列都是開啟任務清單的入口 */}
      <DataTable<IOnboardingRow>
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        onRowClick={onOpenDetail}
        emptyStateText={t("hr_management.movement.onboarding_empty")}
      />
    </div>
  );
};

export default OnboardingTable;
