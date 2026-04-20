"use client";

import { useState, useEffect } from 'react';
import { Target, FileText, Activity, AlertCircle, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, Clock, FileWarning, Users } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import AdminPageHeader from '@/components/admin/common/admin_page_header';
import AdminMetricCard from '@/components/admin/common/admin_metric_card';
import { ITask, TaskStatus } from '@/interfaces/mission_board';
import { request } from "@/lib/utils/request";
import { formatDate } from "@/lib/utils/date";

export default function AdminMissionBoardPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "pending_review" | "disputed" | "closed">("all");
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let isInitialLoad = true;
    const fetchTasks = async () => {
      try {
        const { payload } = await request<{ payload: ITask[] }>("/api/v1/admin/mission_board");
        if (payload) {
          setTasks(payload);
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

  const toggleExpand = (taskId: number) => {
    setExpandedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return task.status === TaskStatus.Open;
    if (activeTab === "pending_review") return task.status === TaskStatus.PendingReview;
    if (activeTab === "disputed") return task.status === TaskStatus.Disputed;
    if (activeTab === "closed") return task.status === TaskStatus.Closed;
    return true;
  });

  const kpis = {
    totalMissions: tasks.length,
    openMissions: tasks.filter(t => t.status === TaskStatus.Open).length,
    pendingMissions: tasks.filter(t => t.status === TaskStatus.PendingReview).length,
    totalRewards: tasks.reduce((sum, t) => sum + parseFloat(t.reward), 0),
    totalParticipants: new Set(tasks.flatMap(t => t.submissions.map(s => s.submitter))).size,
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Open: return "bg-blue-50 text-blue-700 ring-blue-100";
      case TaskStatus.PendingReview: return "bg-orange-50 text-orange-700 ring-orange-100";
      case TaskStatus.Disputed: return "bg-red-50 text-red-700 ring-red-100";
      case TaskStatus.Closed: return "bg-emerald-50 text-emerald-700 ring-emerald-100";
      default: return "bg-gray-50 text-gray-700 ring-gray-100";
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Open: return t("admin_mission_board.tabs.open");
      case TaskStatus.PendingReview: return t("admin_mission_board.tabs.pending_review");
      case TaskStatus.Disputed: return t("admin_mission_board.tabs.disputed");
      case TaskStatus.Closed: return t("admin_mission_board.tabs.closed");
      default: return String(t("admin_mission_board.labels.unknown"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={Target}
          title={String(t("admin_mission_board.page.title"))}
          subtitle={String(t("admin_mission_board.page.subtitle"))}
        />

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <AdminMetricCard
            title={t("admin_mission_board.kpi.total_missions")}
            value={kpis.totalMissions.toString()}
            icon={FileText}
            colorTheme="blue"
          />
          <AdminMetricCard
            title={t("admin_mission_board.kpi.open_missions")}
            value={kpis.openMissions.toString()}
            icon={Target}
            colorTheme="emerald"
          />
          <AdminMetricCard
            title={t("admin_mission_board.kpi.pending_reviews")}
            value={kpis.pendingMissions.toString()}
            icon={Activity}
            colorTheme="orange"
          />
          <AdminMetricCard
            title={t("admin_mission_board.kpi.total_participants")}
            value={kpis.totalParticipants.toString()}
            icon={Users}
            colorTheme="gray"
          />
          <AdminMetricCard
            title={t("admin_mission_board.kpi.total_rewards")}
            value={kpis.totalRewards.toLocaleString()}
            unit="ICP"
            icon={AlertCircle}
            colorTheme="rose"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Info: (20260421 - Luphia) Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-50/50 p-2 border-b border-gray-100">
            {["all", "open", "pending_review", "disputed", "closed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "all" | "open" | "pending_review" | "disputed" | "closed")}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === tab ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                  }`}
              >
                {String(t(`admin_mission_board.tabs.${tab}`))}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="text-center py-10 text-gray-400">{t("admin_mission_board.labels.loading")}</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-medium">
                {t("admin_mission_board.labels.no_missions")}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isExpanded = expandedTasks.includes(task.taskId);
                return (
                  <div key={task.taskId} className="group rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:border-gray-300 transition-colors">
                    <div
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50/50 outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
                      onClick={() => toggleExpand(task.taskId)}
                      role="button"
                      aria-label="Toggle missing details"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(task.taskId);
                        }
                      }}
                    >
                      {/* Info: (20260420 - Luphia) Left: Status & Identity */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 text-gray-500 border border-gray-100 rounded-lg font-bold font-mono">
                          #{task.taskId}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                            <span className="font-mono bg-gray-100 border border-gray-200/60 px-1.5 py-0.5 rounded text-xs text-gray-500">
                              {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(new Date(task.createdAt * 1000).toISOString(), "yyyy-MM-dd HH:mm")}
                          </div>
                        </div>
                      </div>

                      {/* Info: (20260420 - Luphia) Right: KPI Numbers */}
                      <div className="flex items-center gap-8 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t("admin_mission_board.labels.reward")}</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-black text-gray-900 leading-none">{task.reward}</span>
                            <span className="text-xs text-gray-400 font-bold">ICP</span>
                          </div>
                        </div>

                        {(() => {
                          const totalTokens = task.submissions.reduce((sum, sub) => sum + Math.round(parseFloat(sub.consumedTokens) * 1e18), 0);
                          const rewardICP = parseFloat(task.reward);
                          if (task.submissionCount > 0 && rewardICP > 0) {
                            const tokenPerICP = (totalTokens / rewardICP).toLocaleString(undefined, { maximumFractionDigits: 0 });
                            return (
                              <div className="hidden sm:flex flex-col items-end border-l border-gray-200 pl-8">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t("admin_mission_board.labels.tokens_per_icp")}</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                  <span className="text-xl font-black text-indigo-600 leading-none">{tokenPerICP}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="flex items-center gap-4 border-l border-gray-200 pl-6 sm:pl-8">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t("admin_mission_board.labels.submissions")}</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-xl font-black text-gray-700 leading-none">{task.submissionCount}</span>
                            </div>
                          </div>
                          <button className="text-gray-300 group-hover:text-indigo-500 transition-colors p-1 bg-gray-50 rounded-md">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info: (20260420 - Luphia) Expanded Details */}
                    {isExpanded && (
                      <div className="bg-gray-50/50 border-t border-gray-200 p-4 sm:p-5">
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("admin_mission_board.labels.view_content")}:</span>
                          <a
                            href={`https://ipfs.io/ipfs/${task.contentCid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-mono truncate max-w-full sm:max-w-md bg-indigo-50 px-2 py-1 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {task.contentCid}
                          </a>
                        </div>

                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">{t("admin_mission_board.labels.submissions")}</h4>

                        {task.submissions.length === 0 ? (
                          <p className="text-sm text-gray-400 italic py-4 text-center bg-white rounded-lg border border-dashed border-gray-200">No submissions yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {task.submissions.map((sub) => (
                              <div key={sub.subIndex} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="flex-shrink-0 font-bold text-gray-400 border border-gray-100 bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center">
                                    {sub.subIndex}
                                  </div>
                                  <div className="flex flex-col gap-1.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 shrink-0">
                                        {t("admin_mission_board.labels.submitter")}
                                      </span>
                                      <span className="font-mono text-gray-600 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-xs flex items-center gap-1.5">
                                        {sub.submitter.slice(0, 6)}...{sub.submitter.slice(-4)}
                                        <button onClick={(e) => { e.stopPropagation(); handleCopy(sub.submitter, `sub-${sub.subIndex}`); }} className="hover:text-indigo-500 text-gray-400 transition-colors">
                                          {copiedId === `sub-${sub.subIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 shrink-0">{t("admin_mission_board.labels.view_result")}</span>
                                      <a
                                        href={`https://ipfs.io/ipfs/${sub.resultCid}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 hover:text-indigo-700 font-mono text-xs truncate max-w-[120px] sm:max-w-xs hover:underline underline-offset-2"
                                      >
                                        {sub.resultCid}
                                      </a>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between lg:justify-end gap-6 border-t border-gray-100 lg:border-t-0 pt-3 lg:pt-0">
                                  <div className="flex flex-col lg:items-end">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest shrink-0">Tokens Used</span>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                      <span className="text-xl font-black text-indigo-600 leading-none">
                                        {Math.round(parseFloat(sub.consumedTokens) * 1e18).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex justify-end min-w-[80px]">
                                    {sub.isRejected ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                                        <FileWarning className="w-3.5 h-3.5" /> Rejected
                                      </span>
                                    ) : task.status === TaskStatus.Closed ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>

                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
