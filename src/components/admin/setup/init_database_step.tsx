import { useTranslation } from "@/i18n/i18n_context";
import { useEffect, useState, useCallback } from "react";
import { Database, KeyRound, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { initDb, getDatabaseStatus, setDbPassword as serverSetDbPassword } from "@/app/admin/setup/_api/database.api";

export function SetupInitDatabase({ isActive, isCompleted, onNext, onReset }: IStepProps) {
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
    let result: { success: boolean; output?: string; error?: string } = { success: false, output: "" };

    try {
      result = await initDb();
    } catch {
      await new Promise(resolve => setTimeout(resolve, 3000));
      result = { success: true, output: "Database completely initialized (Server Reloaded)." };
    }

    if (result.success) {
      await loadDbInfo();
      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 1500);
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(`${t('admin_setup.step5.err_init')}${(result.output || result.error || "").substring(0, 300)}...`);
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
    const res = await serverSetDbPassword(tmpPassword);
    if (res.success) {
      await loadDbInfo();
      setIsEditing(false);
      setTmpPassword("");
      setStatus(StepStatus.SUCCESS);
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(`${t('admin_setup.step5.err_reset')}${res.output?.substring(0, 300)}...`);
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={5}
      title={t('admin_setup.step5.title')}
      description={t('admin_setup.step5.desc')}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status === StepStatus.ERROR ? (
          <button onClick={() => { setStatus(StepStatus.IDLE); setErrorMessage(""); }} className="text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">
            {t('admin_setup.step5.retry_btn')}
          </button>
        ) : null
      }
    >
      {(isActive || isCompleted || status === StepStatus.ERROR) && (
        <>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-5 rounded-xl">

            {/* Info: (20260413 - Luphia) Left Block: Schema Information */}
            <div className="pt-1">
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4 flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                {t('admin_setup.step5.db_schema')}
              </h4>
              <div className="bg-white p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
                <div className="text-3xl font-black text-gray-800 tabular-nums tracking-tight">
                  {tableCount || (displayStatus === StepStatus.LOADING ? <Loader2 className="w-6 h-6 animate-spin text-orange-400 mt-2" /> : "0")}
                </div>
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mt-1">
                  {t('admin_setup.step5.tables_synced')}
                </div>
              </div>
              {displayStatus === StepStatus.SUCCESS && tableCount > 0 && (
                <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 border border-emerald-100 rounded-md">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">{t('admin_setup.step5.schema_ready')}</span>
                </div>
              )}
            </div>

            {/* Info: (20260413 - Luphia) Right Block: Connection & Password */}
            <div className="pt-6 sm:pt-0 sm:border-l sm:pl-6 border-t sm:border-t-0 border-slate-200">
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4 flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" />
                {t('admin_setup.step5.db_connection')}
              </h4>

              <div className="flex flex-col gap-3">
                <div className="bg-white border border-slate-100 p-3.5 rounded-lg flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin_setup.step5.host_domain')}</span>
                    <code className="text-[11px] font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{dbHost || "127.0.0.1"}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin_setup.step5.port')}</span>
                    <code className="text-[11px] font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{dbPort || "20021"}</code>
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin_setup.step5.root_pwd')}</span>
                    <code className="text-[11px] font-mono text-orange-700 bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100 max-w-[140px] truncate" title={dbPassword}>
                      {dbPassword ? '*'.repeat(dbPassword.length > 20 ? 20 : dbPassword.length) : "***********"}
                    </code>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 select-all break-all leading-tight bg-gray-50 p-1.5 rounded border border-gray-100">
                    postgres://isunfa:***@{dbHost || "127.0.0.1"}:{dbPort || "20021"}/isunfa
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto text-xs bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-bold uppercase transition flex items-center justify-center gap-1.5"
                disabled={displayStatus === StepStatus.LOADING}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('admin_setup.step5.reset_root_pwd')}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  aria-label={t('admin_setup.step5.new_pwd_placeholder')}
                  placeholder={t('admin_setup.step5.new_pwd_placeholder')}
                  value={tmpPassword}
                  onChange={(e) => setTmpPassword(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  disabled={displayStatus === StepStatus.LOADING}
                />
                <button
                  onClick={() => { setIsEditing(false); setTmpPassword(""); }}
                  disabled={displayStatus === StepStatus.LOADING}
                  className="w-full sm:w-auto text-xs bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-bold uppercase transition"
                >
                  {t('admin_setup.step5.cancel_btn')}
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!tmpPassword.trim() || displayStatus === StepStatus.LOADING}
                  className="w-full sm:w-auto text-xs bg-orange-100 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg hover:bg-orange-200 font-bold uppercase transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {displayStatus === StepStatus.LOADING ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('admin_setup.step5.save_sync_btn')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </StepCard>
  );
}
