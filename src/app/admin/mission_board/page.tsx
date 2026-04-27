"use client";

import { useState, useEffect, useRef } from 'react';
import { Target, FileText, Activity, AlertCircle, Users, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import AdminPageHeader from '@/components/admin/common/admin_page_header';
import AdminMetricCard from '@/components/admin/common/admin_metric_card';
import WalkingRobot, { IRobotRef, RobotActionTarget } from '@/components/admin/mission_board/walking_robot';
import { ITask, TaskStatus } from '@/interfaces/mission_board';
import KanbanColumn from '@/components/admin/mission_board/kanban_column';
import { useMissionBoardDiffEngine } from '@/components/admin/mission_board/use_mission_board_diff_engine';
import { request } from "@/lib/utils/request";
import { useAuth } from '@/contexts/auth_context';
import { getAdminAddressString } from '@/lib/wallet/admin_wallet';
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import ConfirmModal from '@/components/common/confirm_modal';

export default function AdminMissionBoardPage() {
  const { t } = useTranslation();
  useAuth();

  // Info: (20260420 - Luphia) Decoupled States
  const [apiTasks, setApiTasks] = useState<ITask[]>([]);
  const [systemAdminAddress, setSystemAdminAddress] = useState<string | null>(null);
  const [globalDisplayTasks, setGlobalDisplayTasks] = useState<ITask[]>([]);
  const globalDisplayTasksRef = useRef<ITask[]>([]);
  const globalRobotRef = useRef<IRobotRef>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcResult, setGcResult] = useState<{ message: string; details: string[] } | null>(null);

  const handleGC = async () => {
    if (gcLoading) return;
    setGcLoading(true);
    try {
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      const data = await request<{ payload: { deleted: number; details: string[] } }>(`/api/v1/admin/mission_board/gc`, {
        method: "POST",
        body: JSON.stringify({
          action: "gc",
          fido2Signature: {
            authentication,
            challengeToken: token
          }
        }),
      });
      setGcResult({
        message: t("admin_mission_board.gc.success_msg", { count: data.payload?.deleted || 0 }),
        details: data.payload?.details || []
      });
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : String(e));
    }
    setGcLoading(false);
  };

  const handleCancelTask = async (taskId: number) => {
    if (actionLoading) return;
    setActionLoading(taskId);
    try {
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      await request(`/api/v1/admin/mission/${taskId}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "cancel",
          fido2Signature: {
            authentication,
            challengeToken: token
          }
        }),
      });
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : String(e));
    }
    setActionLoading(null);
  };

  const handleBumpTask = async (taskId: number) => {
    if (actionLoading) return;
    setActionLoading(taskId);
    try {
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      await request(`/api/v1/admin/mission/${taskId}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action: "bump",
          fido2Signature: {
            authentication,
            challengeToken: token
          }
        }),
      });
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : String(e));
    }
    setActionLoading(null);
  };

  const openColRef = useRef<HTMLDivElement>(null);
  const pendingColRef = useRef<HTMLDivElement>(null);
  const closedColRef = useRef<HTMLDivElement>(null);

  // Info: (20260420 - Luphia) Sync columns physical coords for robot to dispatch moves
  useEffect(() => {
    const syncPositions = () => {
      const zones: { zone: RobotActionTarget, pos: { x: number, y: number } }[] = [];
      if (openColRef.current) {
        const rect = openColRef.current.getBoundingClientRect();
        zones.push({ zone: "OPEN", pos: { x: rect.left + rect.width / 2, y: rect.top } });
      }
      if (pendingColRef.current) {
        const rect = pendingColRef.current.getBoundingClientRect();
        zones.push({ zone: "PENDING_REVIEW", pos: { x: rect.left + rect.width / 2, y: rect.top } });
      }
      if (closedColRef.current) {
        const rect = closedColRef.current.getBoundingClientRect();
        zones.push({ zone: "CLOSED", pos: { x: rect.left + rect.width / 2, y: rect.top } });
      }

      zones.forEach(z => {
        globalRobotRef.current?.setZonePosition(z.zone, z.pos);
      });
    };

    // Info: (20260420 - Luphia) Slight delay to ensure DOM rendered layout
    setTimeout(syncPositions, 500);
    window.addEventListener("resize", syncPositions);
    return () => window.removeEventListener("resize", syncPositions);
  }, []);

  // Info: (20260420 - Luphia) Poll API Engine
  useEffect(() => {
    getAdminAddressString().then(setSystemAdminAddress).catch(console.error);

    let isInitialLoad = true;
    const fetchTasks = async () => {
      try {
        const res = await request<{ payload: ITask[] }>("/api/v1/admin/mission_board");

        if (res.payload) {
          setApiTasks(res.payload);
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

  useMissionBoardDiffEngine(apiTasks, globalDisplayTasksRef, setGlobalDisplayTasks, globalRobotRef, loading);

  const displayTasks = globalDisplayTasks;

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



  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <WalkingRobot ref={globalRobotRef} className="opacity-100" colorTheme="blue" />

      <div className="mx-auto max-w-7xl space-y-6 relative z-10">
        <AdminPageHeader
          icon={Target}
          title={t("admin_mission_board.page.title")}
          subtitle={t("admin_mission_board.page.subtitle")}
        />

        {/* Info: (20260424 - Luphia) Actions */}
        <div className="flex items-center justify-end relative z-10">
          <button
            onClick={handleGC}
            disabled={gcLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white hover:bg-orange-500 border border-transparent rounded-md text-sm font-semibold transition-all hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 shadow-sm"
          >
            {gcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t("admin_mission_board.gc.btn_text")}
          </button>
        </div>

        {/* Info: (20260424 - Luphia) Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <AdminMetricCard title={t("admin_mission_board.kpi.total_missions")} value={kpis.totalMissions.toString()} icon={FileText} colorTheme="blue" />
          <AdminMetricCard title={t("admin_mission_board.kpi.open_missions")} value={kpis.openMissions.toString()} icon={Target} colorTheme="emerald" />
          <AdminMetricCard title={t("admin_mission_board.kpi.pending_reviews")} value={kpis.pendingMissions.toString()} icon={Activity} colorTheme="orange" />
          <AdminMetricCard title={t("admin_mission_board.kpi.total_participants")} value={kpis.totalParticipants.toString()} icon={Users} colorTheme="gray" />
          <AdminMetricCard title={t("admin_mission_board.kpi.total_rewards")} value={kpis.totalRewards.toLocaleString()} unit="ICP" icon={AlertCircle} colorTheme="rose" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">{t("admin_mission_board.labels.loading")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <KanbanColumn
              title={t("admin_mission_board.tabs.open")}
              columnTasks={displayTasks.filter(t => t.status === TaskStatus.Open)}
              refObj={openColRef}
              activeTab="global"
              systemAdminAddress={systemAdminAddress}
              actionLoading={actionLoading}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              copiedId={copiedId}
              handleCopy={handleCopy}
              handleCancelTask={handleCancelTask}
              handleBumpTask={handleBumpTask}
            />
            <KanbanColumn
              title={t("admin_mission_board.tabs.pending_review")}
              columnTasks={displayTasks.filter(t => t.status === TaskStatus.PendingReview)}
              refObj={pendingColRef}
              activeTab="global"
              systemAdminAddress={systemAdminAddress}
              actionLoading={actionLoading}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              copiedId={copiedId}
              handleCopy={handleCopy}
              handleCancelTask={handleCancelTask}
              handleBumpTask={handleBumpTask}
            />
            <KanbanColumn
              title={t("admin_mission_board.tabs.closed")}
              columnTasks={displayTasks.filter(t => t.status === TaskStatus.Closed)}
              refObj={closedColRef}
              activeTab="global"
              systemAdminAddress={systemAdminAddress}
              actionLoading={actionLoading}
              expandedTasks={expandedTasks}
              toggleExpand={toggleExpand}
              copiedId={copiedId}
              handleCopy={handleCopy}
              handleCancelTask={handleCancelTask}
              handleBumpTask={handleBumpTask}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!actionError}
        onClose={() => setActionError(null)}
        title={t("common.error")}
        message={actionError}
        confirmText={t("common.ok")}
      />
      <ConfirmModal
        isOpen={!!gcResult}
        onClose={() => setGcResult(null)}
        title={t("admin_mission_board.gc.result_title")}
        message={
          <div className="text-left space-y-4">
            <p className="text-gray-700 font-medium">{gcResult?.message}</p>
            {gcResult && gcResult.details.length > 0 && (
              <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200">
                <ul className="list-disc pl-5 text-sm text-gray-600 font-mono space-y-1">
                  {gcResult.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </div>
        }
        confirmText={t("common.close")}
      />
    </div>
  );
}
