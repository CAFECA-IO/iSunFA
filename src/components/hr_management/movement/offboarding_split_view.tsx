"use client";

import { FC } from "react";
import { Check, ShieldAlert, ShieldCheck } from "lucide-react";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import MovementProgressBar from "@/components/hr_management/movement/movement_progress_bar";
import {
  HANDOVER_CATEGORY_I18N_KEY,
  OFFBOARDING_LIST_MODES,
  OFFBOARDING_LIST_MODE_I18N_KEY,
  OffboardingListMode,
  ProcessTaskStatus,
} from "@/constants/hr_management";
import { IOffboardingCase } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { groupHandoverTasks } from "@/lib/utils/hr_movement";
import { useTranslation } from "@/i18n/i18n_context";

interface IOffboardingSplitViewProps {
  cases: IOffboardingCase[];
  listMode: OffboardingListMode;
  onListModeChange: (mode: OffboardingListMode) => void;
  selectedId: string | null;
  onSelect: (caseId: string) => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
}

/**
 * Info: (20260811 - Julian) 離職交接的分割版面。
 *
 * 左 1/3 是列表、右 2/3 是離職人員的交接矩陣。
 * 矩陣依四個負責單位分組，方便 HR 檢視離職交接卡住的問題是出在哪一環。
 */
const OffboardingSplitView: FC<IOffboardingSplitViewProps> = ({
  cases,
  listMode,
  onListModeChange,
  selectedId,
  onSelect,
  onToggleTask,
}) => {
  const { t } = useTranslation();

  const selected =
    cases.find((item) => item.id === selectedId) ?? cases[0] ?? null;
  const groups = selected ? groupHandoverTasks(selected.tasks) : [];

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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Info: (20260811 - Julian) 左側：離職人員清單 */}
        <div className="flex flex-col gap-2">
          {cases.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
              {t("hr_management.movement.offboarding_empty")}
            </p>
          ) : (
            cases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={selected?.id === item.id ? "true" : undefined}
                className={`w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-colors ${
                  selected?.id === item.id
                    ? "border-orange-500 ring-2 ring-orange-500/20"
                    : "border-gray-200 hover:border-orange-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
                    {getEmployeeInitials(item.employeeName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {item.employeeName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {item.departmentName ?? t("hr_management.value.none")}
                    </p>
                  </div>
                  <MovementAlertBadge alert={item.alert} compact />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  {t("hr_management.movement.expected_leave_date")}{" "}
                  <span className="font-semibold text-gray-700">
                    {item.keyDate}
                  </span>
                </p>

                <p
                  className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                    item.isNoticeSatisfied
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {item.isNoticeSatisfied ? (
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {item.isNoticeSatisfied
                    ? t("hr_management.movement.notice_ok", {
                        days: item.requiredNoticeDays,
                      })
                    : t("hr_management.movement.notice_short", {
                        days: item.requiredNoticeDays,
                      })}
                </p>

                <div className="mt-2">
                  <MovementProgressBar
                    completed={item.completedTaskCount}
                    total={item.totalTaskCount}
                    label={t("hr_management.movement.task_progress")}
                  />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Info: (20260811 - Julian) 右側：跨部門交接矩陣 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="py-16 text-center text-sm text-gray-400">
              {t("hr_management.movement.offboarding_select_hint")}
            </p>
          ) : (
            <>
              <header className="border-b border-gray-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-gray-800">
                    {selected.employeeName}
                  </p>
                  <MovementAlertBadge alert={selected.alert} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {selected.jobTitle ?? t("hr_management.value.none")}・
                  {t("hr_management.movement.notice_required", {
                    days: selected.requiredNoticeDays,
                  })}
                  ・
                  {t("hr_management.movement.notice_actual", {
                    days: selected.actualNoticeDays,
                  })}
                </p>
                <MovementProgressBar
                  completed={selected.completedTaskCount}
                  total={selected.totalTaskCount}
                  label={t("hr_management.movement.task_progress")}
                />
              </header>

              <div className="mt-4 flex flex-col gap-4">
                {groups.map((group) => (
                  <section key={group.category}>
                    <h4 className="mb-2 flex items-baseline justify-between text-xs font-bold tracking-wider text-gray-400 uppercase">
                      {t(HANDOVER_CATEGORY_I18N_KEY[group.category])}
                      <span className="font-mono text-[11px] font-normal">
                        {group.completedCount}/{group.tasks.length}
                      </span>
                    </h4>

                    {group.tasks.length === 0 ? (
                      <p className="rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-400">
                        {t("hr_management.movement.category_empty")}
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {group.tasks.map((task) => {
                          const isDone =
                            task.status !== ProcessTaskStatus.PENDING;
                          return (
                            <li key={task.id}>
                              <button
                                type="button"
                                onClick={() => onToggleTask(task.id, !isDone)}
                                aria-pressed={isDone}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                              >
                                <span
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                    isDone
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {isDone && <Check className="h-3 w-3" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={`block truncate text-sm ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}
                                  >
                                    {task.title}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-gray-400">
                                    {task.assigneeName}・{task.dueDate}
                                    {task.note ? `・${task.note}` : ""}
                                  </span>
                                </span>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    isDone
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {isDone
                                    ? t("hr_management.movement.state_done")
                                    : t("hr_management.movement.state_pending")}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OffboardingSplitView;
