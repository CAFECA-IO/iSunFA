import React from "react";
import { useTranslation } from "@/i18n/i18n_context";
import KanbanCard from "@/components/admin/mission_board/kanban_card";
import { ITask } from "@/interfaces/mission_board";

interface IKanbanColumnProps {
  title: string;
  columnTasks: ITask[];
  refObj: React.RefObject<HTMLDivElement | null>;
  activeTab: "global" | "my";
  systemAdminAddress: string | null;
  actionLoading: number | null;
  expandedTasks: number[];
  toggleExpand: (taskId: number) => void;
  copiedId: string | null;
  handleCopy: (text: string, id: string) => void;
  handleCancelTask: (taskId: number) => void;
  handleBumpTask: (taskId: number) => void;
}

export default function KanbanColumn({
  title,
  columnTasks,
  refObj,
  activeTab,
  systemAdminAddress,
  actionLoading,
  expandedTasks,
  toggleExpand,
  copiedId,
  handleCopy,
  handleCancelTask,
  handleBumpTask,
}: IKanbanColumnProps) {
  const { t } = useTranslation();

  return (
    <div
      ref={refObj}
      className="flex h-full min-h-[500px] flex-col rounded-2xl border border-gray-200/60 bg-gray-100/50 p-4"
    >
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 className="text-sm font-bold tracking-wider text-gray-700 uppercase">
          {title}
        </h3>
        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-bold text-gray-500 shadow-sm">
          {columnTasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {columnTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-8 text-sm text-gray-400">
            {t("admin_mission_board.labels.no_missions")!}
          </div>
        ) : (
          columnTasks.map((task) => (
            <KanbanCard
              key={task.taskId}
              task={task}
              activeTab={activeTab}
              systemAdminAddress={systemAdminAddress}
              actionLoading={actionLoading}
              isExpanded={expandedTasks.includes(task.taskId)}
              toggleExpand={toggleExpand}
              copiedId={copiedId}
              handleCopy={handleCopy}
              handleCancelTask={handleCancelTask}
              handleBumpTask={handleBumpTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
