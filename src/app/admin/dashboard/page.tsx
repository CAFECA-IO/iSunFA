"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { Activity, Server, Database, HardDrive, LayoutDashboard, Container } from "lucide-react";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import ConfirmModal from "@/components/common/confirm_modal";
import AdminContainerCard from "@/components/admin/dashboard/admin_container_card";
import { useTranslation } from "@/i18n/i18n_context";
import { request, ApiError } from "@/lib/utils/request";
import { SYSTEM_STATUS } from "@/constants/status";

interface IDockerContainer {
  id: string;
  image: string;
  name: string;
  status: string;
  uptime: string;
  rawStatus: string;
}

interface ISystemStatus {
  database: string;
  blockchain: string;
  storage: string;
  docker: string;
  dockerUptime: string;
  containers?: IDockerContainer[];
  timestamp: string;
}

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ISystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [restartingContainer, setRestartingContainer] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string | ReactNode;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: t("common.close"),
      cancelText: undefined,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ success: boolean; payload: ISystemStatus }>(
        "/api/v1/admin/system_healthy"
      );
      if (res.payload) {
        setStatus(res.payload);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.data && typeof e.data === 'object' && 'payload' in e.data && e.data.payload) {
          setStatus(e.data.payload as ISystemStatus);
        } else {
          // Info: (20260420 - Luphia) Fallback regex parser if payload is dropped
          const msg = e.message;
          const match = msg.match(/Database=(.*?), Blockchain=(.*?), Storage=(.*?), Docker=(.*)$/);

          if (match) {
            setStatus({
              database: match[1],
              blockchain: match[2],
              storage: match[3],
              docker: match[4],
              dockerUptime: "---",
              containers: [],
              timestamp: new Date().toISOString()
            });
          } else {
            setStatus({
              database: SYSTEM_STATUS.UNHEALTHY,
              blockchain: SYSTEM_STATUS.UNHEALTHY,
              storage: SYSTEM_STATUS.UNHEALTHY,
              docker: SYSTEM_STATUS.UNHEALTHY,
              dockerUptime: "---",
              containers: [],
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeRestart = async (serviceName: string) => {
    setRestartingContainer(serviceName);
    try {
      const res = await request<{ success: boolean; message: string }>("/api/v1/admin/docker/restart", {
        method: "POST",
        body: JSON.stringify({ serviceName })
      });
      if (res.success) {
        showAlert("Success", res.message || t("admin_dashboard.restart_success"), fetchStatus);
      }
    } catch (e: unknown) {
      showAlert("Error", t("admin_dashboard.failed_restart", { error: (e instanceof ApiError ? e.message : String(e)) }));
    } finally {
      setRestartingContainer(null);
    }
  };

  const handleRestartDocker = (serviceName: string, serviceLabel: string) => {
    showConfirm(
      t("admin_dashboard.confirm_restart_title"),
      t("admin_dashboard.confirm_restart_desc", { serviceLabel }),
      () => executeRestart(serviceName)
    );
  };



  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const mapContainerIcon = (name: string) => {
    if (name.includes('postgres')) return Database;
    if (name.includes('blockchain')) return Activity;
    if (name.includes('storage')) return HardDrive;
    if (name.includes('gateway')) return Server;
    return Container;
  };

  const mapContainerServiceName = (name: string) => {
    if (name.includes('database') || name.includes('postgres')) return 'postgres';
    if (name.includes('blockchain')) return 'blockchain';
    if (name.includes('storage')) return 'storage';
    if (name.includes('gateway')) return 'gateway';
    return name;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <AdminPageHeader
          icon={LayoutDashboard}
          title={t("admin_dashboard.title")}
          subtitle={t("admin_dashboard.subtitle")}
        />

        {loading && !status ? (
          <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        ) : status && status.containers && status.containers.length > 0 ? (
          <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 xl:grid-cols-4">
            {status.containers.map((container) => {
              const Icon = mapContainerIcon(container.name);
              const isRestarting = restartingContainer === mapContainerServiceName(container.name);

              return (
                <AdminContainerCard
                  key={container.id}
                  id={container.id}
                  name={container.name}
                  image={container.image}
                  status={container.status}
                  uptime={container.uptime}
                  icon={Icon}
                  isRestarting={isRestarting}
                  isGlobalRestarting={false}
                  onRestart={() => handleRestartDocker(mapContainerServiceName(container.name), container.name)}
                  texts={{
                    statusLabel: t("admin_dashboard.status"),
                    uptimeLabel: t("admin_dashboard.uptime"),
                    restartBtn: t("admin_dashboard.restart_btn"),
                    restartingBtn: t("admin_dashboard.restarting_btn")
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 border-dashed">
            <Server className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-sm font-semibold text-gray-900">{t("admin_dashboard.no_containers")}</h3>
            <p className="mt-1 text-sm text-gray-500">{t("admin_dashboard.no_containers_desc")}</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
