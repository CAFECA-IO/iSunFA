import { useEffect, useState, useCallback } from "react";
import { Cpu, Server, Monitor, Info, CheckCircle2 } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { checkDockerInstalled, getSystemHardwareInfo, checkDockerRunning, startDockerEngine } from "@/app/admin/setup/_api/docker.api";

interface IHardwareInfo {
  osType: string;
  osRelease: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemGB: string;
}

export function Step1VerifyEngine({ isActive, isCompleted, onNext }: IStepProps) {
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
        setErrorMessage("Docker is not installed or not found in PATH.");
        return;
      }
      setDockerVersion(installedResult.output || "");

      // Info: (20260413 - Luphia) Check Daemon Running
      let runResult = await checkDockerRunning();
      if (!runResult.success) {
        await startDockerEngine();
        await new Promise((resolve) => setTimeout(resolve, 5000));
        runResult = await checkDockerRunning();
        if (!runResult.success) {
          setStatus(StepStatus.ERROR);
          setErrorMessage("Docker is installed but daemon is not running. Automatic start failed. Please start Docker Engine manually.");
          return;
        }
      }

      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 1200); 
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [status, onNext]);

  useEffect(() => {
    if (isActive && status === StepStatus.IDLE) {
      void setTimeout(execute, 0);
    }
  }, [isActive, status, execute]);

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={1}
      title="Step 1: System & Docker Engine Verification"
      description="Verifying hardware, Docker CLI, and active daemon state."
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
    >
      {(isActive || isCompleted) && (
        <div className="mt-6 flex flex-col gap-4">
          
          {hwInfo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-4 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-slate-400" /> Host Hardware
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100">
                  <div className="p-2 bg-blue-50 rounded-md shrink-0">
                    <Server className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Operating System</div>
                    <div className="text-sm font-medium text-slate-700 truncate">{hwInfo.osType} {hwInfo.arch}</div>
                    <div className="text-xs text-slate-400 truncate">{hwInfo.osRelease}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100">
                  <div className="p-2 bg-indigo-50 rounded-md shrink-0">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Compute</div>
                    <div className="text-sm font-medium text-slate-700 truncate">{hwInfo.cpuCores} Cores</div>
                    <div className="text-xs text-slate-400 truncate" title={hwInfo.cpuModel}>{hwInfo.cpuModel}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100 col-span-2">
                  <div className="p-2 bg-emerald-50 rounded-md shrink-0">
                    <Info className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Memory Allocation</div>
                    <div className="text-sm font-medium text-slate-700">{hwInfo.totalMemGB} GB Total RAM detected</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {dockerVersion && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center justify-between gap-4 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-emerald-900 mb-0.5">Docker Engine Running</h4>
                  <p className="text-xs text-emerald-700 font-mono truncate bg-emerald-100/50 px-2 py-0.5 rounded inline-block">
                    {dockerVersion.trim()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isActive && status === StepStatus.ERROR && (
            <div className="mt-2 text-center">
              <button onClick={() => { setStatus(StepStatus.IDLE); setErrorMessage(""); }} className="text-sm px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition font-medium shadow-sm">
                Retry Engine Detection
              </button>
            </div>
          )}
        </div>
      )}
    </StepCard>
  );
}
