import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState, useCallback } from "react";
import { Cpu, Server, Info, CheckCircle2, Loader2 } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  checkDockerInstalled,
  getSystemHardwareInfo,
  checkDockerRunning,
} from "@/app/admin/setup/_api/docker.api";

interface IHardwareInfo {
  osType: string;
  osRelease: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemGB: string;
}

export function SetupVerifyEngine({
  isActive,
  isCompleted,
  onNext,
  onReset,
}: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dockerVersion, setDockerVersion] = useState<string>("");
  const [hwInfo, setHwInfo] = useState<IHardwareInfo | null>(null);

  const execute = useCallback(async () => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    try {
      const hw = await getSystemHardwareInfo();
      setHwInfo(hw);

      // Info: (20260413 - Luphia) Check Docker Installed
      const installedResult = await checkDockerInstalled();
      if (!installedResult.success) {
        setStatus(StepStatus.ERROR);
        setErrorMessage(t('admin_setup.step1.err_not_installed'));
        return;
      }
      setDockerVersion(installedResult.output || "");

      const runResult = await checkDockerRunning();
      if (!runResult.success) {
        setStatus(StepStatus.ERROR);
        setErrorMessage(t('admin_setup.step1.err_not_running'));
        return;
      }

      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 1200);
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [status, onNext, t]);

  useEffect(() => {
    if (isActive && status === StepStatus.IDLE) {
      void setTimeout(execute, 0);
    }
  }, [isActive, status, execute]);

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={1}
      title={t('admin_setup.step1.title')}
      description={t('admin_setup.step1.desc')}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status !== StepStatus.SUCCESS ? (
          <button
            onClick={status === StepStatus.ERROR ? () => {
              setStatus(StepStatus.IDLE);
              setErrorMessage("");
            } : execute}
            disabled={status === StepStatus.LOADING}
            className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center"
          >
            {status === StepStatus.LOADING ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('admin_setup.step1.validating')}
              </>
            ) : status === StepStatus.ERROR ? (
              t('admin_setup.step1.retry_detection')
            ) : (
              t('admin_setup.step1.start_detection')
            )}
          </button>
        ) : null
      }
    >
      {(isActive || isCompleted) && (
        <div className="mt-6 flex flex-col gap-4">
          {hwInfo && (
            <div className="mt-5">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">
                {t('admin_setup.step1.host_hw')}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
                  <div className="shrink-0 rounded-md bg-blue-50 p-2">
                    <Server className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {t('admin_setup.step1.os')}
                    </div>
                    <div className="truncate text-sm font-medium text-slate-700">
                      {hwInfo.osType} {hwInfo.arch}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {hwInfo.osRelease}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
                  <div className="shrink-0 rounded-md bg-indigo-50 p-2">
                    <Cpu className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {t('admin_setup.step1.compute')}
                    </div>
                    <div className="truncate text-sm font-medium text-slate-700">
                      {hwInfo.cpuCores} {t('admin_setup.step1.cores')}
                    </div>
                    <div
                      className="truncate text-xs text-slate-400"
                      title={hwInfo.cpuModel}
                    >
                      {hwInfo.cpuModel}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3">
                  <div className="shrink-0 rounded-md bg-emerald-50 p-2">
                    <Info className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="mb-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {t('admin_setup.step1.memory_alloc')}
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {hwInfo.totalMemGB} {t('admin_setup.step1.mem_detected')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {dockerVersion && displayStatus === StepStatus.SUCCESS && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-5 transition-all">
              <div className="flex min-w-0 items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <h4 className="mb-0.5 text-sm font-bold text-emerald-900">
                    {t('admin_setup.step1.docker_running')}
                  </h4>
                  <p className="inline-block truncate rounded bg-emerald-100/50 px-2 py-0.5 font-mono text-xs text-emerald-700">
                    {dockerVersion.trim()}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </StepCard>
  );
}
