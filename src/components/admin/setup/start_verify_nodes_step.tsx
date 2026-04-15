import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState, useCallback } from "react";
import { Box, PlayCircle, Clock } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { startDockerCompose, getRunningContainers } from "@/app/admin/setup/_api/docker.api";

interface IContainerInfo {
  id: string;
  image: string;
  name: string;
  status: string;
  description: string;
}

export function SetupStartVerifyNodes({ isActive, isCompleted, onNext, onReset }: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [containers, setContainers] = useState<IContainerInfo[]>([]);

  const guessDescription = useCallback((name: string, image: string) => {
    const n = name.toLowerCase();
    const i = image.toLowerCase();
    if (n.includes("postgres") || n.includes("db") || i.includes("postgres")) return t('admin_setup.step2.desc_db');
    if (n.includes("redis") || i.includes("redis")) return t('admin_setup.step2.desc_cache');
    if (n.includes("ipfs") || n.includes("storage")) return t('admin_setup.step2.desc_storage');
    if (n.includes("ganache") || n.includes("hardhat") || n.includes("node") || n.includes("blockchain")) return t('admin_setup.step2.desc_evm');
    if (n.includes("nginx") || n.includes("proxy") || n.includes("gateway")) return t('admin_setup.step2.desc_proxy');
    return t('admin_setup.step2.desc_app');
  }, [t]);

  const execute = useCallback(async () => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    try {
      const upResult = await startDockerCompose();
      if (!upResult.success) {
        setStatus(StepStatus.ERROR);
        setErrorMessage(`${t('admin_setup.step2.err_start')}${(upResult.output || "").substring(0, 150)}...`);
        return;
      }

      // Info: (20260413 - Luphia) Wait the container initialize
      await new Promise(r => setTimeout(r, 3000));

      const psResult = await getRunningContainers();
      if (psResult.success && psResult.output) {
        const COMPOSE_CONTAINERS = ["gateway", "database", "storage", "blockchain"];
        const lines = psResult.output.trim().split('\n');
        const parsed = lines.map(line => {
          const [id, image, name, runStatus] = line.split('|');
          return {
            id: id || t('admin_setup.step2.unknown'),
            image: image || t('admin_setup.step2.unknown'),
            name: name || t('admin_setup.step2.unknown'),
            status: runStatus || t('admin_setup.step2.unknown'),
            description: guessDescription(name || "", image || ""),
          };
        }).filter(c => c.id !== t('admin_setup.step2.unknown') && COMPOSE_CONTAINERS.includes(c.name));
        setContainers(parsed);
      }

      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 2000); // Info: (20260413 - Luphia) Let the user stay and look at the list of successfully started nodes
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [status, onNext, t, guessDescription]);

  useEffect(() => {
    if (isActive && status === StepStatus.IDLE) {
      void setTimeout(execute, 0);
    }
  }, [isActive, status, execute]);

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={2}
      title={t('admin_setup.step2.title')}
      description={t('admin_setup.step2.desc')}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status === StepStatus.ERROR ? (
          <button onClick={() => { setStatus(StepStatus.IDLE); setErrorMessage(""); }} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center">
            {t('admin_setup.step2.retry_btn')}
          </button>
        ) : null
      }
    >
      {(isActive || isCompleted) && (
        <div className="mt-6 flex flex-col gap-4">

          {containers.length > 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 ">
              <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-slate-400" /> {t('admin_setup.step2.nodes')} ({containers.length})
              </h4>
              <div className="space-y-3">
                {containers.map(c => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-100 transition-all hover:border-slate-300">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-emerald-50 rounded-md shrink-0">
                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-sm font-bold text-slate-800 truncate mb-0.5">{c.name}</h5>
                        <p className="text-xs text-slate-500 max-w-sm">{c.description}</p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end gap-1.5 shrink-0 bg-slate-50/50 p-2 sm:p-0 rounded-md sm:bg-transparent">
                      <div className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {c.image}
                      </div>
                      <div className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {c.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            displayStatus === StepStatus.SUCCESS && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center ">
                <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-700">{t('admin_setup.step2.starting_title')}</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">{t('admin_setup.step2.starting_desc')}</p>
              </div>
            )
          )}
        </div>
      )}
    </StepCard>
  );
}
