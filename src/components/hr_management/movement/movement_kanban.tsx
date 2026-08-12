"use client";

import { DragEvent, FC, useState } from "react";
import { CalendarDays, Info, UserRound } from "lucide-react";
import MovementAlertBadge from "@/components/hr_management/movement/movement_alert_badge";
import MovementProgressBar from "@/components/hr_management/movement/movement_progress_bar";
import {
  MOVEMENT_STAGES,
  MOVEMENT_STAGE_ACCENT,
  MOVEMENT_STAGE_I18N_KEY,
  MovementStage,
  ProcessTaskType,
} from "@/constants/hr_management";
import { IMovementCase } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IMovementKanbanProps {
  cases: IMovementCase[];
  onSelect: (movementCase: IMovementCase) => void;
  onMoveStage: (caseId: string, stage: MovementStage) => void;
}

/**
 * Info: (20260811 - Julian) 概覽看板。
 * 拖拽用原生 HTML5 Drag and Drop，不引入拖拽套件。
 */
const MovementKanban: FC<IMovementKanbanProps> = ({
  cases,
  onSelect,
  onMoveStage,
}) => {
  const { t } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<MovementStage | null>(null);

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    stage: MovementStage,
  ) => {
    event.preventDefault();
    const caseId = event.dataTransfer.getData("text/plain") || draggingId;
    if (caseId) onMoveStage(caseId, stage);
    setDraggingId(null);
    setHoverStage(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Info: (20260811 - Julian) 看板的操作說明 */}
      <p className="flex items-start gap-1.5 text-xs text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("hr_management.movement.kanban_hint")}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MOVEMENT_STAGES.map((stage) => {
          const columnCases = cases.filter((item) => item.stage === stage);
          const isHovered = hoverStage === stage;

          return (
            <div
              key={stage}
              role="group"
              aria-label={`${t(MOVEMENT_STAGE_I18N_KEY[stage])} ${columnCases.length}`}
              onDragOver={(event) => {
                event.preventDefault();
                setHoverStage(stage);
              }}
              onDragLeave={() =>
                setHoverStage((prev) => (prev === stage ? null : prev))
              }
              onDrop={(event) => handleDrop(event, stage)}
              className={`flex min-h-[16rem] flex-col rounded-xl border bg-gray-50/60 transition-colors ${
                isHovered
                  ? "border-orange-400 bg-orange-50/60"
                  : "border-gray-200"
              }`}
            >
              <div
                className={`flex items-center gap-2 rounded-t-xl border-b border-gray-200 px-3 py-2.5 ${MOVEMENT_STAGE_ACCENT[stage]}`}
              >
                <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                  {t(MOVEMENT_STAGE_I18N_KEY[stage])}
                </h3>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
                  {columnCases.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {columnCases.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">
                    {t("hr_management.movement.kanban_empty")}
                  </p>
                ) : (
                  columnCases.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingId(item.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setHoverStage(null);
                      }}
                      onClick={() => onSelect(item)}
                      className={`w-full cursor-grab rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-all active:cursor-grabbing ${
                        draggingId === item.id
                          ? "opacity-50"
                          : "hover:border-orange-300 hover:shadow"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-600">
                          {getEmployeeInitials(item.employeeName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {item.employeeName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {item.departmentName ??
                              t("hr_management.value.none")}
                            ・{item.jobTitle ?? t("hr_management.value.none")}
                          </p>
                        </div>
                        <MovementAlertBadge alert={item.alert} compact />
                      </div>

                      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                        <UserRound className="h-3 w-3 shrink-0" />
                        {item.managerName ?? t("hr_management.value.none")}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs">
                        <CalendarDays className="h-3 w-3 shrink-0 text-gray-400" />
                        <span className="text-gray-500">
                          {item.taskType === ProcessTaskType.ONBOARDING
                            ? t("hr_management.movement.expected_hire_date")
                            : t("hr_management.movement.expected_leave_date")}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {item.keyDate}
                        </span>
                      </p>

                      <div className="mt-2.5">
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MovementKanban;
