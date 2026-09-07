"use client";

import { FC } from "react";
import { Building2, CalendarDays, Check, UserRound, X } from "lucide-react";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import MovementProgressBar from "@/components/hr_management/movement/movement_progress_bar";
import {
  HANDOVER_CATEGORY_I18N_KEY,
  PROCESS_TASK_TYPE_I18N_KEY,
  ProcessTaskStatus,
} from "@/constants/hr_management";
import { IMovementCase } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { groupHandoverTasks } from "@/lib/utils/hr_movement";
import { useTranslation } from "@/i18n/i18n_context";

interface IMovementTaskDrawerProps {
  movementCase: IMovementCase | null;
  onClose: () => void;
  onToggleTask: (taskId: string, isDone: boolean) => void;
}

/**
 * Info: (20260811 - Julian) 案件細節的滑出式抽屜，看板與報到列表共用。
 *
 * 任務依四個面向分組顯示，即使是報到案件也一樣 —— 報到同樣跨 HR／IT／總務，
 * 分組之後 HR 一眼看得出卡在哪個單位，而不是一條 12 項的流水清單。
 *
 * ToDo: (20260811 - Julian) 勾選目前只改記憶體，重整會回復。
 * 接上 `/api/v1/hr/process_task` 後改為送出並以回傳結果為準。
 */
const MovementTaskDrawer: FC<IMovementTaskDrawerProps> = ({
  movementCase,
  onClose,
  onToggleTask,
}) => {
  const { t } = useTranslation();

  if (!movementCase) return null;

  const groups = groupHandoverTasks(movementCase.tasks).filter(
    (group) => group.tasks.length > 0,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-gray-900/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={movementCase.employeeName}
        className="relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl"
      >
        <header className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
            {getEmployeeInitials(movementCase.employeeName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-base font-bold text-gray-800">
              {movementCase.employeeName}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] font-normal text-gray-500">
                {movementCase.employeeNo}
              </span>
              <MovementAlertBadge alert={movementCase.alert} compact />
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 className="size-3 shrink-0" />
                {movementCase.departmentName ?? t("hr_management.value.none")}・
                {movementCase.jobTitle ?? t("hr_management.value.none")}
              </span>
              <span className="flex items-center gap-1">
                <UserRound className="size-3 shrink-0" />
                {movementCase.managerName ?? t("hr_management.value.none")}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-4 shrink-0" />
          </button>
        </header>

        <div className="border-b border-gray-100 px-5 py-4">
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDays className="size-4 shrink-0 text-orange-500" />
            {t(PROCESS_TASK_TYPE_I18N_KEY[movementCase.taskType])}
            <span className="font-semibold text-gray-800">
              {movementCase.keyDate}
            </span>
          </p>
          <div className="mt-3">
            <MovementProgressBar
              completed={movementCase.completedTaskCount}
              total={movementCase.totalTaskCount}
              label={t("hr_management.movement.task_progress")}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <section key={group.category} className="mb-5 last:mb-0">
              <h3 className="mb-2 flex items-baseline justify-between text-xs font-bold tracking-wider text-gray-400 uppercase">
                {t(HANDOVER_CATEGORY_I18N_KEY[group.category])}
                <span className="font-mono text-[11px] font-normal">
                  {group.completedCount}/{group.tasks.length}
                </span>
              </h3>
              <ul className="flex flex-col gap-1">
                {group.tasks.map((task) => {
                  const isDone = task.status !== ProcessTaskStatus.PENDING;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id, !isDone)}
                        aria-pressed={isDone}
                        className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                      >
                        <span
                          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isDone
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isDone && <Check className="size-3 shrink-0" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}
                          >
                            {task.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-400">
                            {task.assigneeName}・{task.dueDate}
                            {task.note ? `・${task.note}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default MovementTaskDrawer;
