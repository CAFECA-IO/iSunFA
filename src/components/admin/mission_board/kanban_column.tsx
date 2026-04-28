import React from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import KanbanCard from '@/components/admin/mission_board/kanban_card';
import { ITask } from '@/interfaces/mission_board';

interface IKanbanColumnProps {
  title: string;
  columnTasks: ITask[];
  refObj: React.RefObject<HTMLDivElement | null>;
  activeTab: 'global' | 'my';
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
  handleBumpTask
}: IKanbanColumnProps) {
  const { t } = useTranslation();

  return (
    <div ref={refObj} className="flex flex-col bg-gray-100/50 rounded-2xl border border-gray-200/60 p-4 h-full min-h-[500px]">
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
        <span className="bg-white border border-gray-200 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{columnTasks.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {columnTasks.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 text-sm">
            {String(t("admin_mission_board.labels.no_missions"))}
          </div>
        ) : (
          columnTasks.map(task => (
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
