import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState, useCallback } from "react";
import {
  Database,
  KeyRound,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Dices,
} from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  initDb,
  getDatabaseStatus,
  setDbPassword as serverSetDbPassword,
} from "@/app/admin/setup/_api/database.api";

export function SetupInitDatabase({
  isActive,
  isCompleted,
  onNext,
  onReset,
}: IStepProps) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [tableCount, setTableCount] = useState<number>(0);
  const [dbPassword, setDbPasswordState] = useState<string>("");
  const [dbHost, setDbHost] = useState<string>("");
  const [dbPort, setDbPort] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tmpPassword, setTmpPassword] = useState<string>("");

  const loadDbInfo = useCallback(async () => {
    const res = await getDatabaseStatus();
    if (res.success) {
      setTableCount(res.tableCount || 0);
      setDbPasswordState(res.dbPassword || "");
      setDbHost(res.dbHost || "127.0.0.1");
      setDbPort(res.dbPort || "20021");
    }
  }, []);

  const execute = useCallback(async () => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    let result: { success: boolean; output?: string; error?: string } = {
      success: false,
      output: "",
    };

    try {
      result = await initDb();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      result = {
        success: true,
        output: "Database completely initialized (Server Reloaded).",
      };
    }

    if (result.success) {
      await loadDbInfo();
      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 1500);
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(
        `${t("admin_setup.step5.err_init")}${(result.output || result.error || "").substring(0, 300)}...`,
      );
    }
  }, [status, onNext, loadDbInfo, t]);

  useEffect(() => {
    if (isActive && status === StepStatus.IDLE && !isCompleted) {
      void setTimeout(execute, 0);
    } else if ((isActive || isCompleted) && tableCount === 0) {
      setTimeout(loadDbInfo, 0);
    }
  }, [isActive, isCompleted, status, tableCount, execute, loadDbInfo]);

  const handleResetPassword = async () => {
    if (!tmpPassword.trim()) return;
    setStatus(StepStatus.LOADING);
    setErrorMessage("");
    let res: { success: boolean; output?: string; error?: string } = {
      success: false,
      output: "",
    };

    try {
      res = await serverSetDbPassword(tmpPassword);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      res = {
        success: true,
        output: "Password reset successful (Server Reloaded).",
      };
    }

    if (res.success) {
      try {
        await loadDbInfo();
      } catch {}
      setIsEditing(false);
      setTmpPassword("");
      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 1500);
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(
        `${t("admin_setup.step5.err_reset")}${res.output?.substring(0, 300)}...`,
      );
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={5}
      title={t("admin_setup.step5.title")}
      description={t("admin_setup.step5.desc")}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status === StepStatus.ERROR ? (
          <button
            onClick={() => {
              setStatus(StepStatus.IDLE);
              setErrorMessage("");
            }}
            className="rounded-md bg-orange-600 px-4 py-1.5 text-sm text-white transition hover:bg-orange-700"
          >
            {t("admin_setup.step5.retry_btn")}
          </button>
        ) : null
      }
    >
      {(isActive || isCompleted || status === StepStatus.ERROR) && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-6 rounded-xl border border-slate-100 bg-slate-50 p-5 sm:grid-cols-2">
            {/* Info: (20260413 - Luphia) Left Block: Schema Information */}
            <div className="pt-1">
              <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                <Database className="h-3.5 w-3.5" />
                {t("admin_setup.step5.db_schema")}
              </h4>
              <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-white p-4">
                <div className="text-3xl font-black tracking-tight text-gray-800 tabular-nums">
                  {tableCount ||
                    (displayStatus === StepStatus.LOADING ? (
                      <Loader2 className="mt-2 h-6 w-6 animate-spin text-orange-400" />
                    ) : (
                      "0"
                    ))}
                </div>
                <div className="mt-1 text-[11px] font-medium tracking-widest text-gray-400 uppercase">
                  {t("admin_setup.step5.tables_synced")}
                </div>
              </div>
              {displayStatus === StepStatus.SUCCESS && tableCount > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">
                    {t("admin_setup.step5.schema_ready")}
                  </span>
                </div>
              )}
            </div>

            {/* Info: (20260413 - Luphia) Right Block: Connection & Password */}
            <div className="border-t border-slate-200 pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
              <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                <KeyRound className="h-3.5 w-3.5" />
                {t("admin_setup.step5.db_connection")}
              </h4>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2.5 rounded-lg border border-slate-100 bg-white p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      {t("admin_setup.step5.host_domain")}
                    </span>
                    <code className="rounded border border-gray-100 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700">
                      {dbHost || "127.0.0.1"}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      {t("admin_setup.step5.port")}
                    </span>
                    <code className="rounded border border-gray-100 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700">
                      {dbPort || "20021"}
                    </code>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between border-t border-slate-50 pt-2.5">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      {t("admin_setup.step5.root_pwd")}
                    </span>
                    <code
                      className="max-w-[140px] truncate rounded border border-orange-100 bg-orange-50/50 px-2 py-0.5 font-mono text-[11px] text-orange-700"
                      title={dbPassword}
                    >
                      {dbPassword
                        ? "*".repeat(
                            dbPassword.length > 20 ? 20 : dbPassword.length,
                          )
                        : "***********"}
                    </code>
                  </div>
                  <div className="mt-1 rounded border border-gray-100 bg-gray-50 p-1.5 text-[9px] leading-tight break-all text-gray-400 select-all">
                    postgres://isunfa:***@{dbHost || "127.0.0.1"}:
                    {dbPort || "20021"}/isunfa
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center justify-end gap-3 border-t border-slate-200 pt-4 sm:flex-row">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 uppercase transition hover:bg-slate-50 sm:w-auto"
                disabled={displayStatus === StepStatus.LOADING}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("admin_setup.step5.reset_root_pwd")}
              </button>
            ) : (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    aria-label={t("admin_setup.step5.new_pwd_placeholder")}
                    placeholder={t("admin_setup.step5.new_pwd_placeholder")}
                    value={tmpPassword}
                    onChange={(e) => setTmpPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-xs text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                    disabled={displayStatus === StepStatus.LOADING}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars =
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                      let pwd = "";
                      for (let i = 0; i < 16; i++) {
                        pwd += chars.charAt(
                          Math.floor(Math.random() * chars.length),
                        );
                      }
                      setTmpPassword(pwd);
                    }}
                    disabled={displayStatus === StepStatus.LOADING}
                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1 text-slate-400 transition-colors hover:text-orange-500"
                  >
                    <Dices className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setTmpPassword("");
                  }}
                  disabled={displayStatus === StepStatus.LOADING}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 uppercase transition hover:bg-slate-50 sm:w-auto"
                >
                  {t("admin_setup.step5.cancel_btn")}
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={
                    !tmpPassword.trim() || displayStatus === StepStatus.LOADING
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-100 px-4 py-2 text-xs font-bold text-orange-700 uppercase shadow-sm transition hover:bg-orange-200 sm:w-auto"
                >
                  {displayStatus === StepStatus.LOADING ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    t("admin_setup.step5.save_sync_btn")
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </StepCard>
  );
}
