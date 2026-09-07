"use client";

import { FC, useMemo } from "react";
import { Eye, ShieldAlert, ShieldCheck } from "lucide-react";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import {
  OFFBOARDING_LIST_MODES,
  OFFBOARDING_LIST_MODE_I18N_KEY,
  OffboardingListMode,
} from "@/constants/hr_management";
import {
  IOffboardingCase,
  IOffboardingProgress,
} from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingTableProps {
  cases: IOffboardingCase[];
  listMode: OffboardingListMode;
  onListModeChange: (mode: OffboardingListMode) => void;
  /** Info: (20260811 - Julian) 三段進度由呼叫端算好，這裡只負責畫 */
  progressOf: (offboardingCase: IOffboardingCase) => IOffboardingProgress;
  onOpenCase: (caseId: string) => void;
}

const SEGMENT_KEYS = [
  "hr_management.offboarding.progress_handover",
  "hr_management.offboarding.progress_asset",
  "hr_management.offboarding.progress_finalization",
] as const;

/**
 * Info: (20260811 - Julian) 離職交接清單。
 * 列出三段進度：「工作交接」、「資產回收」、「HR 結案」
 */
const OffboardingTable: FC<IOffboardingTableProps> = ({
  cases,
  listMode,
  onListModeChange,
  progressOf,
  onOpenCase,
}) => {
  const { t } = useTranslation();

  const columns = useMemo<IDataTableColumn<IOffboardingCase>[]>(
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
              <div className="mt-0.5 truncate text-xs text-gray-400">
                {row.departmentName ?? t("hr_management.value.none")}・
                {row.jobTitle ?? t("hr_management.value.none")}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "leaveDate",
        label: t("hr_management.movement.expected_leave_date"),
        render: (row) => (
          <span className="text-sm text-gray-600">{row.keyDate}</span>
        ),
      },
      {
        key: "notice",
        label: t("hr_management.offboarding.th_notice"),
        render: (row) => (
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${
              row.isNoticeSatisfied ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {row.isNoticeSatisfied ? (
              <ShieldCheck className="size-3.5 shrink-0" />
            ) : (
              <ShieldAlert className="size-3.5 shrink-0" />
            )}
            {t("hr_management.offboarding.notice_days", {
              actual: row.actualNoticeDays,
              required: row.requiredNoticeDays,
            })}
          </div>
        ),
      },
      {
        key: "progress",
        // Info: (20260811 - Julian) 三段進度並排成一欄
        label: t("hr_management.offboarding.th_handover_progress"),
        render: (row) => {
          const progress = progressOf(row);
          const percents = [
            progress.handoverPercent,
            progress.assetPercent,
            progress.finalizationPercent,
          ];
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {percents.map((percent, index) => (
                <span
                  key={SEGMENT_KEYS[index]}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                    percent === 100
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t(SEGMENT_KEYS[index])} {percent}%
                </span>
              ))}
            </div>
          );
        },
      },
      {
        key: "alert",
        label: t("hr_management.movement.th_status"),
        render: (row) => <MovementAlertBadge alert={row.alert} />,
      },
      {
        key: "action",
        label: t("hr_management.movement.th_action"),
        align: "right",
        render: (row) => (
          <button
            type="button"
            onClick={() => onOpenCase(row.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              row.isCompleted
                ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
          >
            {/* Info: (20260811 - Julian) 已結案的案件顯示「檢視」鈕 */}
            {row.isCompleted && <Eye className="size-3.5 shrink-0" />}
            {row.isCompleted
              ? t("hr_management.offboarding.view_process")
              : t("hr_management.offboarding.open_process")}
          </button>
        ),
      },
    ],
    [t, progressOf, onOpenCase],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 self-start rounded-xl bg-gray-100 p-1">
        {OFFBOARDING_LIST_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onListModeChange(mode)}
            aria-pressed={listMode === mode}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              listMode === mode
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t(OFFBOARDING_LIST_MODE_I18N_KEY[mode])}
          </button>
        ))}
      </div>

      <DataTable<IOffboardingCase>
        columns={columns}
        data={cases}
        rowKey={(row) => row.id}
        onRowClick={(row) => onOpenCase(row.id)}
        emptyStateText={t("hr_management.movement.offboarding_empty")}
      />
    </div>
  );
};

export default OffboardingTable;
