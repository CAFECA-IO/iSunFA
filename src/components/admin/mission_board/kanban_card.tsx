import { CheckCircle2, Copy, Check, ChevronDown, ChevronUp, Clock, FileWarning, XCircle, Zap, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import { ITask, TaskStatus } from '@/interfaces/mission_board';
import { formatDate } from "@/lib/utils/date";

export const getWaitTime = (createdAtSecs: number) => {
  const diff = Math.floor(Date.now() / 1000) - createdAtSecs;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`;
};

interface IKanbanCardProps {
  task: ITask;
  activeTab: 'global' | 'my';
  systemAdminAddress: string | null;
  actionLoading: number | null;
  isExpanded: boolean;
  toggleExpand: (taskId: number) => void;
  copiedId: string | null;
  handleCopy: (text: string, id: string) => void;
  handleCancelTask: (taskId: number) => void;
  handleBumpTask: (taskId: number) => void;
}

export default function KanbanCard({
  task,
  activeTab,
  systemAdminAddress,
  actionLoading,
  isExpanded,
  toggleExpand,
  copiedId,
  handleCopy,
  handleCancelTask,
  handleBumpTask
}: IKanbanCardProps) {
  const { t } = useTranslation();

  return (
    <div className="group rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:border-gray-300 transition-colors animate-in fade-in zoom-in duration-300">
      <div
        className="flex flex-col p-4 sm:p-5 cursor-pointer hover:bg-gray-50/50 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors gap-4"
        onClick={() => toggleExpand(task.taskId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpand(task.taskId);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-50 text-gray-500 border border-gray-100 rounded-lg font-bold font-mono text-sm shrink-0">
              #{task.taskId}
            </div>
            <div className="font-mono bg-gray-100 border border-gray-200/60 px-1.5 py-0.5 rounded text-[10px] text-gray-500 truncate">
              {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {activeTab === 'my' && task.status === TaskStatus.Open 
              ? `${getWaitTime(task.createdAt)} (Waiting)` 
              : formatDate(new Date(task.createdAt * 1000).toISOString(), "MM/dd HH:mm")}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t("admin_mission_board.labels.reward")}</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-black text-gray-900 leading-none">{task.reward}</span>
              <span className="text-[10px] text-gray-400 font-bold">ICP</span>
            </div>
          </div>
          {(() => {
            const totalTokens = task.submissions.reduce((sum, sub) => sum + Math.round(parseFloat(sub.consumedTokens) * 1e18), 0);
            const rewardICP = parseFloat(task.reward);
            const tokenPerICP = rewardICP > 0 ? (totalTokens / rewardICP).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0";

            return (
              <>
                <div className="h-6 w-px bg-gray-200 mx-1.5 flex-shrink-0"></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate" title={String(t("admin_mission_board.labels.consumedTokens"))}>{t("admin_mission_board.labels.consumedTokens")}</span>
                  <div className="flex items-baseline gap-1 mt-0.5 w-full">
                    <span className="text-sm font-black text-indigo-600 leading-none truncate">{totalTokens.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-gray-200 mx-1.5 flex-shrink-0"></div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate" title={String(t("admin_mission_board.labels.tokens_per_icp"))}>{t("admin_mission_board.labels.tokens_per_icp")}</span>
                  <div className="flex items-baseline gap-1 mt-0.5 w-full">
                    <span className="text-sm font-black text-emerald-600 leading-none truncate">{tokenPerICP}</span>
                  </div>
                </div>
              </>
            );
          })()}

          <button className="ml-auto text-gray-300 group-hover:text-indigo-500 transition-colors bg-white rounded shadow-sm border border-gray-100">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        { (task._trueStatus ?? task.status) === TaskStatus.Open && task.creator.toLowerCase() === systemAdminAddress?.toLowerCase() && (
          <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100/80">
            <button 
              onClick={(e) => { e.stopPropagation(); handleCancelTask(task.taskId); }}
              disabled={actionLoading === task.taskId || task.submissionCount > 0}
              className="flex flex-1 justify-center items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-full text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {actionLoading === task.taskId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} 取消任務
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleBumpTask(task.taskId); }}
              disabled={actionLoading === task.taskId}
              className="flex flex-1 justify-center items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 rounded-full text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {actionLoading === task.taskId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} 增加懸賞
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-gray-50/50 border-t border-gray-200 p-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">{t("admin_mission_board.labels.submissions")}</h4>

          {task.submissions.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-3 text-center bg-white rounded-lg border border-dashed border-gray-200">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {task.submissions.map((sub) => (
                <div key={sub.subIndex} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="font-mono text-[10px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-600 flex items-center gap-1.5">
                      {sub.submitter.slice(0, 6)}...{sub.submitter.slice(-4)}
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(sub.submitter, `sub-${sub.subIndex}`); }} className="hover:text-indigo-500 text-gray-400 transition-colors">
                        {copiedId === `sub-${sub.subIndex}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {sub.isRejected ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100"><FileWarning className="w-3 h-3" /> Rej</span>
                    ) : task.status === TaskStatus.Closed ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> App</span>
                    ) : null}
                  </div>

                  <div className="bg-gray-50 rounded px-2 py-1.5 flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-400 uppercase">Tokens</span>
                    <span className="font-black text-indigo-600 font-mono">{Math.round(parseFloat(sub.consumedTokens) * 1e18).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
