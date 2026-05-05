import {
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileWarning,
  XCircle,
  Zap,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ITask, TaskStatus } from "@/interfaces/mission_board";
import { formatDate } from "@/lib/utils/date";

export const getWaitTime = (createdAtSecs: number) => {
  const diff = Math.floor(Date.now() / 1000) - createdAtSecs;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`;
};

interface IKanbanCardProps {
  task: ITask;
  activeTab: "global" | "my";
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
  handleBumpTask,
}: IKanbanCardProps) {
  const { t } = useTranslation();

  return (
    <div className="group animate-in fade-in zoom-in overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-colors duration-300 hover:border-gray-300">
      <div
        className="flex cursor-pointer flex-col gap-4 p-4 transition-colors outline-none hover:bg-gray-50/50 focus:ring-2 focus:ring-indigo-500 focus:ring-inset sm:p-5"
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
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-100 bg-gray-50 font-mono text-sm font-bold text-gray-500">
              #{task.taskId}
            </div>
            <div className="truncate rounded border border-gray-200/60 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
              {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium whitespace-nowrap text-gray-400">
            <Clock className="h-3 w-3" />
            {activeTab === "my" && task.status === TaskStatus.Open
              ? `${getWaitTime(task.createdAt)} (Waiting)`
              : formatDate(
                  new Date(task.createdAt * 1000).toISOString(),
                  "MM/dd HH:mm",
                )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
              {t("admin_mission_board.labels.reward")}
            </span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm leading-none font-black text-gray-900">
                {task.reward}
              </span>
              <span className="text-[10px] font-bold text-gray-400">ICP</span>
            </div>
          </div>
          {(() => {
            const totalTokens = task.submissions.reduce(
              (sum, sub) =>
                sum + Math.round(parseFloat(sub.consumedTokens) * 1e18),
              0,
            );
            const rewardICP = parseFloat(task.reward);
            const tokenPerICP =
              rewardICP > 0
                ? (totalTokens / rewardICP).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })
                : "0";

            return (
              <>
                <div className="mx-1.5 h-6 w-px flex-shrink-0 bg-gray-200"></div>
                <div className="flex min-w-0 flex-col">
                  <span
                    className="truncate text-[9px] font-bold tracking-widest text-gray-400 uppercase"
                    title={t("admin_mission_board.labels.consumedTokens")}
                  >
                    {t("admin_mission_board.labels.consumedTokens")}
                  </span>
                  <div className="mt-0.5 flex w-full items-baseline gap-1">
                    <span className="truncate text-sm leading-none font-black text-indigo-600">
                      {totalTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mx-1.5 h-6 w-px flex-shrink-0 bg-gray-200"></div>
                <div className="flex min-w-0 flex-col pr-2">
                  <span
                    className="truncate text-[9px] font-bold tracking-widest text-gray-400 uppercase"
                    title={t("admin_mission_board.labels.tokens_per_icp")!}
                  >
                    {t("admin_mission_board.labels.tokens_per_icp")}
                  </span>
                  <div className="mt-0.5 flex w-full items-baseline gap-1">
                    <span className="truncate text-sm leading-none font-black text-emerald-600">
                      {tokenPerICP}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

          <button className="ml-auto rounded border border-gray-100 bg-white text-gray-300 shadow-sm transition-colors group-hover:text-indigo-500">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {(task._trueStatus ?? task.status) === TaskStatus.Open &&
          task.creator.toLowerCase() === systemAdminAddress?.toLowerCase() && (
            <div className="mt-2 flex gap-2 border-t border-gray-100/80 pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelTask(task.taskId);
                }}
                disabled={
                  actionLoading === task.taskId || task.submissionCount > 0
                }
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-all hover:scale-[1.02] hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === task.taskId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}{" "}
                取消任務
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBumpTask(task.taskId);
                }}
                disabled={actionLoading === task.taskId}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 shadow-sm transition-all hover:scale-[1.02] hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === task.taskId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}{" "}
                增加懸賞
              </button>
            </div>
          )}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50/50 p-4">
          <h4 className="mb-3 border-b border-gray-200 pb-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            {t("admin_mission_board.labels.submissions")}
          </h4>

          {task.submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-white py-3 text-center text-xs text-gray-400 italic">
              No submissions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {task.submissions.map((sub) => (
                <div
                  key={sub.subIndex}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 rounded border border-gray-100 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                      {sub.submitter.slice(0, 6)}...{sub.submitter.slice(-4)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(sub.submitter, `sub-${sub.subIndex}`);
                        }}
                        className="text-gray-400 transition-colors hover:text-indigo-500"
                      >
                        {copiedId === `sub-${sub.subIndex}` ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {sub.isRejected ? (
                      <span className="inline-flex items-center gap-1 rounded border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        <FileWarning className="h-3 w-3" /> Rej
                      </span>
                    ) : task.status === TaskStatus.Closed ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> App
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5 text-[10px]">
                    <span className="font-bold text-gray-400 uppercase">
                      Tokens
                    </span>
                    <span className="font-mono font-black text-indigo-600">
                      {Math.round(
                        parseFloat(sub.consumedTokens) * 1e18,
                      ).toLocaleString()}
                    </span>
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
