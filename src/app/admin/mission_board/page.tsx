"use client";

import { useState, useEffect, useRef } from 'react';
import { Target, FileText, Activity, AlertCircle, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, Clock, FileWarning, Users } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import AdminPageHeader from '@/components/admin/common/admin_page_header';
import AdminMetricCard from '@/components/admin/common/admin_metric_card';
import WalkingRobot, { IRobotRef } from '@/components/admin/mission_board/walking_robot';
import { ITask, TaskStatus } from '@/interfaces/mission_board';
import { request } from "@/lib/utils/request";
import { formatDate } from "@/lib/utils/date";

export default function AdminMissionBoardPage() {
  const { t } = useTranslation();

  // Info: (20260420 - Luphia) Decoupled States
  const [apiTasks, setApiTasks] = useState<ITask[]>([]);
  const [displayTasks, setDisplayTasks] = useState<ITask[]>([]);
  const displayTasksRef = useRef<ITask[]>([]); // Info: (20260420 - Luphia) Track without triggering infinite loops in exact diffing

  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const robotRef = useRef<IRobotRef>(null);

  const openColRef = useRef<HTMLDivElement>(null);
  const pendingColRef = useRef<HTMLDivElement>(null);
  const closedColRef = useRef<HTMLDivElement>(null);

  // Info: (20260420 - Luphia) Sync columns physical coords for robot to dispatch moves
  useEffect(() => {
    const syncPositions = () => {
      if (robotRef.current) {
        if (openColRef.current) {
          const rect = openColRef.current.getBoundingClientRect();
          robotRef.current.setZonePosition("OPEN", { x: rect.left + rect.width / 2, y: rect.top });
        }
        if (pendingColRef.current) {
          const rect = pendingColRef.current.getBoundingClientRect();
          robotRef.current.setZonePosition("PENDING_REVIEW", { x: rect.left + rect.width / 2, y: rect.top });
        }
        if (closedColRef.current) {
          const rect = closedColRef.current.getBoundingClientRect();
          robotRef.current.setZonePosition("CLOSED", { x: rect.left + rect.width / 2, y: rect.top });
        }
      }
    };

    // Info: (20260420 - Luphia) Slight delay to ensure DOM rendered layout
    setTimeout(syncPositions, 500);
    window.addEventListener("resize", syncPositions);
    return () => window.removeEventListener("resize", syncPositions);
  }, []);

  // Info: (20260420 - Luphia) Poll API Engine
  useEffect(() => {
    let isInitialLoad = true;
    const fetchTasks = async () => {
      try {
        const { payload } = await request<{ payload: ITask[] }>("/api/v1/admin/mission_board");
        if (payload) {
          setApiTasks(payload);
        }
      } catch (error) {
        console.error("Failed to fetch mission board:", error);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };
    fetchTasks();
    const intervalId = setInterval(fetchTasks, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Info: (20260420 - Luphia) Visual/Robot Orchestration Engine (Diff computing)
  const isInitialSyncRef = useRef(true);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (apiTasks.length === 0) return;

    if (isInitialSyncRef.current) {
      isInitialSyncRef.current = false;
      isInitializingRef.current = true;

      // Info: (20260420 - Luphia) 1. Move ALL to OPEN
      apiTasks.forEach((apiTask) => {
        robotRef.current?.queueAction({ type: "PICKUP", targetZone: "SPAWN", blockId: apiTask.taskId });
        robotRef.current?.queueAction({
          type: "DROP", targetZone: "OPEN", blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks(prev => {
              if (prev.some(t => t.taskId === apiTask.taskId)) return prev;
              const updated = [...prev, { ...apiTask, status: TaskStatus.Open }];
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
      });

      // Info: (20260420 - Luphia) 2. Move non-open to PENDING_REVIEW
      const nonOpen = apiTasks.filter(t => t.status !== TaskStatus.Open);
      nonOpen.forEach((apiTask) => {
        robotRef.current?.queueAction({
          type: "PICKUP", targetZone: "OPEN", blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks(prev => {
              const updated = prev.filter(t => t.taskId !== apiTask.taskId);
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
        robotRef.current?.queueAction({
          type: "DROP", targetZone: "PENDING_REVIEW", blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks(prev => {
              const updated = [...prev.filter(t => t.taskId !== apiTask.taskId), { ...apiTask, status: TaskStatus.PendingReview }];
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
      });

      // Info: (20260420 - Luphia) 3. Move closed tasks to CLOSED
      const closedTasks = apiTasks.filter(t => t.status === TaskStatus.Closed);
      closedTasks.forEach((apiTask) => {
        robotRef.current?.queueAction({
          type: "PICKUP", targetZone: "PENDING_REVIEW", blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks(prev => {
              const updated = prev.filter(t => t.taskId !== apiTask.taskId);
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
        robotRef.current?.queueAction({
          type: "DROP", targetZone: "CLOSED", blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks(prev => {
              const updated = [...prev.filter(t => t.taskId !== apiTask.taskId), { ...apiTask, status: TaskStatus.Closed }];
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
      });

      // Info: (20260420 - Luphia) End of Initialization Sequence Marker
      robotRef.current?.queueAction({
        type: "DROP", targetZone: "wander", blockId: 0,
        onComplete: () => {
          isInitializingRef.current = false;
        }
      });

      return;
    }

    if (isInitializingRef.current) {
      // Info: (20260420 - Luphia) Do not run diff engine while initialization animation plays
      return;
    }

    const currentDisplay = displayTasksRef.current;
    const getZone = (status: TaskStatus) => status === TaskStatus.Closed ? "CLOSED" : status === TaskStatus.PendingReview ? "PENDING_REVIEW" : "OPEN";

    apiTasks.forEach(apiTask => {
      const displayTask = currentDisplay.find(d => d.taskId === apiTask.taskId);

      if (!displayTask) {
        // Info: (20260420 - Luphia) New Task spawn
        robotRef.current?.queueAction({
          type: "PICKUP",
          targetZone: "SPAWN",
          blockId: apiTask.taskId
        });
        robotRef.current?.queueAction({
          type: "DROP",
          targetZone: getZone(apiTask.status),
          blockId: apiTask.taskId,
          onComplete: () => {
            setDisplayTasks(prev => {
              if (prev.some(t => t.taskId === apiTask.taskId)) return prev;
              const updated = [apiTask, ...prev];
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
      } else if (displayTask.status !== apiTask.status) {
        // Info: (20260420 - Luphia) Status Transition
        const oldZone = getZone(displayTask.status);
        const newZone = getZone(apiTask.status);

        robotRef.current?.queueAction({
          type: "PICKUP",
          targetZone: oldZone,
          blockId: apiTask.taskId,
          onComplete: () => {
            // Info: (20260420 - Luphia) Card disappears from old zone
            setDisplayTasks(prev => {
              const updated = prev.filter(t => t.taskId !== apiTask.taskId);
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });

        // Info: (20260420 - Luphia) Robot walks to new zone
        robotRef.current?.queueAction({
          type: "DROP",
          targetZone: newZone,
          blockId: apiTask.taskId,
          onComplete: () => {
            // Info: (20260420 - Luphia) Card appears in new zone
            setDisplayTasks(prev => {
              const updated = [apiTask, ...prev.filter(t => t.taskId !== apiTask.taskId)];
              displayTasksRef.current = updated;
              return updated;
            });
          }
        });
      } else {
        // Info: (20260420 - Luphia) Minor background updates (like submissions increments). Update stealthily!
        setDisplayTasks(prev => {
          const updated = prev.map(t => t.taskId === apiTask.taskId ? apiTask : t);
          displayTasksRef.current = updated;
          return updated;
        });
      }
    });

    // Info: (20260420 - Luphia) Cleanup deleted tasks (if they mysteriously vanish from blockchain)
    currentDisplay.forEach(dTask => {
      if (!apiTasks.find(a => a.taskId === dTask.taskId)) {
        setDisplayTasks(prev => {
          const updated = prev.filter(t => t.taskId !== dTask.taskId);
          displayTasksRef.current = updated;
          return updated;
        });
      }
    });

  }, [apiTasks]);

  const toggleExpand = (taskId: number) => {
    setExpandedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const kpis = {
    totalMissions: apiTasks.length,
    openMissions: apiTasks.filter(t => t.status === TaskStatus.Open).length,
    pendingMissions: apiTasks.filter(t => t.status === TaskStatus.PendingReview).length,
    totalRewards: apiTasks.reduce((sum, t) => sum + parseFloat(t.reward), 0),
    totalParticipants: new Set(apiTasks.flatMap(t => t.submissions.map(s => s.submitter))).size,
  };

  // Info: (20260420 - Luphia) UI Components
  const KanbanCard = ({ task }: { task: ITask }) => {
    const isExpanded = expandedTasks.includes(task.taskId);
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
          {/* Info: (20260420 - Luphia) Header row */}
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
              {formatDate(new Date(task.createdAt * 1000).toISOString(), "MM/dd HH:mm")}
            </div>
          </div>

          {/* Info: (20260420 - Luphia) Metrics row */}
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
        </div>

        {isExpanded && (
          <div className="bg-gray-50/50 border-t border-gray-200 p-4">
            <div className="mb-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("admin_mission_board.labels.view_content")}:</span>
              <a
                href={`https://ipfs.io/ipfs/${task.contentCid}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-mono truncate bg-indigo-50 px-2 py-1.5 rounded border border-indigo-100/50"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{task.contentCid}</span>
              </a>
            </div>

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
  };

  const renderKanbanColumn = (status: TaskStatus, title: string, refObj: React.RefObject<HTMLDivElement | null>) => {
    const columnTasks = displayTasks.filter(t => t.status === status);

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
            columnTasks.map(task => <KanbanCard key={task.taskId} task={task} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <WalkingRobot ref={robotRef} />

      <div className="mx-auto max-w-7xl space-y-6 relative z-10">
        <AdminPageHeader
          icon={Target}
          title={String(t("admin_mission_board.page.title"))}
          subtitle={String(t("admin_mission_board.page.subtitle"))}
        />

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <AdminMetricCard title={t("admin_mission_board.kpi.total_missions")} value={kpis.totalMissions.toString()} icon={FileText} colorTheme="blue" />
          <AdminMetricCard title={t("admin_mission_board.kpi.open_missions")} value={kpis.openMissions.toString()} icon={Target} colorTheme="emerald" />
          <AdminMetricCard title={t("admin_mission_board.kpi.pending_reviews")} value={kpis.pendingMissions.toString()} icon={Activity} colorTheme="orange" />
          <AdminMetricCard title={t("admin_mission_board.kpi.total_participants")} value={kpis.totalParticipants.toString()} icon={Users} colorTheme="gray" />
          <AdminMetricCard title={t("admin_mission_board.kpi.total_rewards")} value={kpis.totalRewards.toLocaleString()} unit="ICP" icon={AlertCircle} colorTheme="rose" />
        </div>

        {/* Kanban Board Layout */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">{t("admin_mission_board.labels.loading")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {renderKanbanColumn(TaskStatus.Open, String(t("admin_mission_board.tabs.open")), openColRef)}
            {renderKanbanColumn(TaskStatus.PendingReview, String(t("admin_mission_board.tabs.pending_review")), pendingColRef)}
            {renderKanbanColumn(TaskStatus.Closed, String(t("admin_mission_board.tabs.closed")), closedColRef)}
          </div>
        )}
      </div>
    </div>
  );
}
