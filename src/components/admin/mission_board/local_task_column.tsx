import { ILocalMission } from "@/interfaces/mission_board";
import {
  Play,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { useState } from "react";
import ConfirmModal from "@/components/common/confirm_modal";
import { useTranslation } from "@/i18n/i18n_context";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { XCircle, Loader2 } from "lucide-react";

interface IProps {
  title: string;
  missions: ILocalMission[];
}

export default function LocalTaskColumn({ title, missions }: IProps) {
  const { t } = useTranslation();
  const [logModal, setLogModal] = useState<{
    isOpen: boolean;
    logs: { filename: string; content: string }[];
  }>({ isOpen: false, logs: [] });
  const [actionLoading, setActionLoading] = useState<{
    id: string;
    type: "restart" | "cancel";
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fadeCanceledIds, setFadeCanceledIds] = useState<string[]>([]);

  const performAction = async (
    folderId: string,
    action: "restart" | "cancel",
  ) => {
    setActionLoading({ id: folderId, type: action });
    try {
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      await request(`/api/v1/admin/mission_board/local/${folderId}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action,
          fido2Signature: {
            authentication,
            challengeToken: token,
          },
        }),
      });
      // Info: (20260426 - Luphia) Optimistically trigger a refetch or reload if needed, but the polling will catch it
      if (action === "cancel") {
        setFadeCanceledIds((prev) => [...prev, folderId]);
      }
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex min-h-[500px] flex-col rounded-2xl border border-gray-200/60 bg-gray-100/50 p-4 shadow-inner">
      <div className="mb-4 flex items-center justify-between px-2">
        <h3 className="text-sm font-extrabold tracking-wide text-gray-700">
          {title}
        </h3>
        <span className="rounded-full border border-gray-100 bg-white px-2.5 py-1 text-xs font-bold text-gray-500 shadow-sm">
          {missions.length}
        </span>
      </div>

      <div className="relative flex flex-col gap-4">
        {missions.map((mission) => (
          <div
            key={mission.folderId}
            className={`group relative overflow-hidden rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-500 hover:border-emerald-200 hover:shadow-md ${fadeCanceledIds.includes(mission.folderId) ? "pointer-events-none scale-95 opacity-0" : "scale-100 opacity-100"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-500">
                {mission.folderId.substring(0, 8)}..._
                {mission.folderId.split("_").pop()}
              </span>
              {mission.status === "executing" && (
                <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
                  <Clock className="h-3 w-3 animate-spin" />{" "}
                  {t("admin_mission_board.local_task.executing")!}
                </span>
              )}
              {mission.status === "completed" && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                  <CheckCircle className="h-3 w-3" />{" "}
                  {t("admin_mission_board.local_task.completed")!}
                </span>
              )}
              {mission.status === "failed" && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                  <AlertTriangle className="h-3 w-3" />{" "}
                  {t("admin_mission_board.local_task.failed")!}
                </span>
              )}
              {mission.status === "pending" && (
                <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-bold text-gray-500">
                  <Clock className="h-3 w-3" />{" "}
                  {t("admin_mission_board.local_task.pending")!}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {mission.failureCount > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-red-50 p-2 text-xs text-red-500">
                  <span>
                    {t("admin_mission_board.local_task.failure_count")!}{" "}
                    {mission.failureCount}
                  </span>
                  <button
                    onClick={() =>
                      setLogModal({ isOpen: true, logs: mission.failedLogs })
                    }
                    className="flex items-center gap-1 underline underline-offset-2 hover:text-red-700"
                  >
                    <FileText className="h-3.5 w-3.5" />{" "}
                    {t("admin_mission_board.local_task.view_log")!}
                  </button>
                </div>
              )}

              {mission.status === "failed" && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => performAction(mission.folderId, "cancel")}
                    disabled={actionLoading?.id === mission.folderId}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 shadow-sm transition-all hover:scale-[1.02] hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 active:scale-[0.98] disabled:opacity-50"
                  >
                    {actionLoading?.id === mission.folderId &&
                    actionLoading?.type === "cancel" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {t("admin_mission_board.local_task.cancel_task")!}
                  </button>
                  <button
                    onClick={() => performAction(mission.folderId, "restart")}
                    disabled={actionLoading?.id === mission.folderId}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:scale-[1.02] hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 active:scale-[0.98] disabled:opacity-50"
                  >
                    {actionLoading?.id === mission.folderId &&
                    actionLoading?.type === "restart" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {t("admin_mission_board.local_task.restart_task")!}
                  </button>
                </div>
              )}

              {mission.status !== "failed" &&
                mission.status !== "completed" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => performAction(mission.folderId, "cancel")}
                      disabled={actionLoading?.id === mission.folderId}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {actionLoading?.id === mission.folderId &&
                      actionLoading?.type === "cancel" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {t("admin_mission_board.local_task.cancel_task")!}
                    </button>
                  </div>
                )}
            </div>
          </div>
        ))}
        {missions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">
              {t("admin_mission_board.local_task.no_tasks")!}
            </p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ isOpen: false, logs: [] })}
        title={t("admin_mission_board.local_task.failure_logs")!}
        message={
          <div className="mt-2 max-h-96 space-y-4 overflow-y-auto text-left">
            {logModal.logs.map((log, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="mb-2 text-xs font-bold text-gray-500">
                  {log.filename}
                </div>
                <pre className="font-mono text-xs whitespace-pre-wrap text-red-600">
                  {log.content}
                </pre>
              </div>
            ))}
          </div>
        }
        confirmText={t("common.close")!}
      />

      <ConfirmModal
        isOpen={!!actionError}
        onClose={() => setActionError(null)}
        title={t("common.error")!}
        message={actionError}
        confirmText={t("common.ok")!}
      />
    </div>
  );
}
