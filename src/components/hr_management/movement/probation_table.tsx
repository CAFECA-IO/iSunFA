"use client";

import { FC, useMemo } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Send } from "lucide-react";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import {
  ChecklistState,
  CHECKLIST_STATE_STYLE,
  HrDashboardRole,
  HR_PENDING_ACTION_CLASS,
  PROBATION_MILESTONES,
  PROBATION_MILESTONE_I18N_KEY,
  PROBATION_RESULT_I18N_KEY,
  PROBATION_RESULT_STYLE,
  PROBATION_SCORE_MAX,
} from "@/constants/hr_management";
import { IProbationMetrics, IProbationRow } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IProbationTableProps {
  rows: IProbationRow[];
  metrics: IProbationMetrics;
  /** Info: (20260811 - Julian) HR 看到催辦與發送表單，主管看到填寫考核表 */
  role: HrDashboardRole;
  onOpenReview: (row: IProbationRow) => void;
  /**
   * Info: (20260811 - Julian) 點姓名開啟該員工的任務清單抽屜。
   * 回傳 false 代表這個人目前沒有進行中的到離職案件（例如試用期中但早就報到完了），
   * 此時姓名不做成連結 —— 給了入口卻打開一個空抽屜比沒有入口更糟。
   */
  onOpenCase: (employeeId: string) => boolean;
  hasCase: (employeeId: string) => boolean;
}

const METRIC_CARDS = [
  {
    key: "endingThisMonth",
    icon: CalendarClock,
    iconClass: "text-sky-500",
    labelKey: "hr_management.movement.metric_ending",
  },
  {
    key: "overdue",
    icon: AlertTriangle,
    iconClass: "text-rose-500",
    labelKey: "hr_management.movement.metric_overdue",
  },
  {
    key: "passedThisMonth",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    labelKey: "hr_management.movement.metric_passed",
  },
] as const;

/**
 * Info: (20260811 - Julian) 試用期考核清單。
 *
 * 三個節點（30 天關懷／60 天面談／85 天最終考核）畫成一條小進度，
 * 而不是三個獨立欄位：它們是有先後的同一件事，分成三欄會讓人以為可以跳著做。
 */
const ProbationTable: FC<IProbationTableProps> = ({
  rows,
  metrics,
  role,
  onOpenReview,
  onOpenCase,
  hasCase,
}) => {
  const { t } = useTranslation();

  const columns = useMemo<IDataTableColumn<IProbationRow>[]>(
    () => [
      {
        key: "employee",
        label: t("hr_management.movement.th_employee"),
        render: (row) => {
          const inner = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
                {getEmployeeInitials(row.employeeName)}
              </span>
              <div className="min-w-0">
                <div
                  className={`truncate font-semibold text-gray-800 ${hasCase(row.employeeId) ? "underline-offset-2 hover:underline" : ""}`}
                >
                  {row.employeeName}
                </div>
                <div className="mt-0.5 truncate text-xs text-gray-400">
                  {row.departmentName ?? t("hr_management.value.none")}
                </div>
              </div>
            </>
          );

          if (!hasCase(row.employeeId)) {
            return <div className="flex items-center gap-3">{inner}</div>;
          }

          return (
            <button
              type="button"
              onClick={() => onOpenCase(row.employeeId)}
              className="flex items-center gap-3 text-left"
            >
              {inner}
            </button>
          );
        },
      },
      {
        key: "hireDate",
        label: t("hr_management.movement.th_hire_date"),
        render: (row) => (
          <span className="text-sm text-gray-600">{row.hireDate}</span>
        ),
      },
      {
        key: "probationEnd",
        label: t("hr_management.movement.th_probation_end"),
        render: (row) => (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-600">
                {row.probationEndDate}
              </span>
              {/* Info: (20260812 - Julian) 標示這個日期是被考核延長的 */}
              {row.isExtended && (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                  {t("hr_management.movement.probation_extended_badge")}
                </span>
              )}
            </div>
            <div
              className={`text-xs ${row.isOverdue ? "font-semibold text-red-600" : "text-gray-400"}`}
            >
              {row.isOverdue
                ? t("hr_management.movement.probation_overdue_days", {
                    days: Math.abs(row.daysUntilEnd),
                  })
                : t("hr_management.movement.days_until", {
                    days: row.daysUntilEnd,
                  })}
            </div>
          </div>
        ),
      },
      {
        key: "manager",
        label: t("hr_management.movement.th_manager"),
        render: (row) => (
          <span className="text-sm text-gray-600">
            {row.managerName ?? t("hr_management.value.none")}
          </span>
        ),
      },
      {
        key: "milestones",
        label: t("hr_management.movement.th_milestones"),
        render: (row) => (
          <div className="flex items-center gap-1.5">
            {PROBATION_MILESTONES.map((milestone) => (
              <span
                key={milestone}
                title={t(PROBATION_MILESTONE_I18N_KEY[milestone])}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${CHECKLIST_STATE_STYLE[row.milestones[milestone]]}`}
              >
                {t(PROBATION_MILESTONE_I18N_KEY[milestone])}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "alert",
        label: t("hr_management.movement.th_status"),
        render: (row) => <MovementAlertBadge alert={row.alert} />,
      },
      {
        key: "result",
        label: t("hr_management.movement.th_result"),
        render: (row) =>
          row.result ? (
            <div className="flex flex-col items-start gap-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PROBATION_RESULT_STYLE[row.result]}`}
              >
                {t(PROBATION_RESULT_I18N_KEY[row.result])}
              </span>
              {/**
               * Info: (20260811 - Julian) 平均分跟著結果一起出現。
               * 只寫結果的話，「延長試用」看不出是差 0.1 還是差 2 分 ——
               * 而那正是 HR 之後要不要追蹤這個人的依據。
               */}
              {row.score !== null && (
                <span className="text-xs text-gray-400">
                  {t("hr_management.movement.score_value", {
                    score: row.score.toFixed(1),
                    max: PROBATION_SCORE_MAX.toFixed(1),
                  })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${CHECKLIST_STATE_STYLE[ChecklistState.PENDING]}`}
              >
                {t("hr_management.movement.result_pending")}
              </span>
              {/* Info: (20260811 - Julian) 草稿標記 */}
              {row.isDraft && (
                <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  {t("hr_management.movement.review_draft_badge")}
                </span>
              )}
            </div>
          ),
      },
      {
        key: "action",
        label: t("hr_management.movement.th_action"),
        align: "right",
        render: (row) =>
          role === HrDashboardRole.MANAGER ? (
            <button
              type="button"
              onClick={() => onOpenReview(row)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
            >
              {t("hr_management.movement.action_fill_review")}
            </button>
          ) : (
            <div className="flex items-center justify-end gap-2">
              {/* ToDo: (20260811 - Julian) 通知 API 完成後接上寄送與催辦 */}
              <button
                type="button"
                title={t("hr_management.value.feature_pending")}
                disabled
                className={`inline-flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 ${HR_PENDING_ACTION_CLASS}`}
              >
                <Send className="h-3.5 w-3.5 shrink-0" />
                {t("hr_management.movement.action_send_form")}
              </button>
              <button
                type="button"
                title={t("hr_management.value.feature_pending")}
                disabled
                className={`inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 ${HR_PENDING_ACTION_CLASS}`}
              >
                {t("hr_management.movement.action_urge")}
              </button>
            </div>
          ),
      },
    ],
    [t, role, onOpenReview, onOpenCase, hasCase],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-400 uppercase">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${card.iconClass}`} />
                {t(card.labelKey)}
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-800">
                  {metrics[card.key]}
                </span>
                <span className="text-xs text-gray-400">
                  {t("hr_management.value.headcount_unit")}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <DataTable<IProbationRow>
        columns={columns}
        data={rows}
        rowKey={(row) => row.employeeId}
        emptyStateText={t("hr_management.movement.probation_empty")}
      />
    </div>
  );
};

export default ProbationTable;
