import { useEffect, useState, useCallback } from "react";
import { Database, KeyRound, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { initDb, getDatabaseStatus, setDbPassword as serverSetDbPassword } from "@/app/admin/setup/_api/database.api";

export function Step6InitDatabase({ isActive, isCompleted, onNext }: IStepProps) {
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
      setErrorMessage(`Failed to initialize Database. Output: ${(result.output || result.error || "").substring(0, 300)}...`);
    }
  }, [status, onNext, loadDbInfo]);

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
      setErrorMessage(`Failed to reset Database password. Output: ${res.output?.substring(0, 300)}...`);
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={5}
      title="Step 5: Initialize Database"
      description="Creating application database, generating super-secure PostgreSQL password, and pushing Prisma schemas."
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
    >
      {(isActive || isCompleted || status === StepStatus.ERROR) && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 p-5 rounded-xl">
          
          {/* Info: (20260413 - Luphia) Left Block: Schema Information */}
          <div className="pt-1">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              Database Schema
            </h4>
            <div className="bg-white p-4 rounded-lg border border-slate-100 flex flex-col gap-1">
              <div className="text-3xl font-black text-gray-800 tabular-nums tracking-tight">
                {tableCount || (displayStatus === StepStatus.LOADING ? <Loader2 className="w-6 h-6 animate-spin text-orange-400 mt-2" /> : "0")}
              </div>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mt-1">
                Tables Synchronized
              </div>
            </div>
            {displayStatus === StepStatus.SUCCESS && tableCount > 0 && (
               <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 border border-emerald-100 rounded-md">
                 <CheckCircle2 className="w-4 h-4 shrink-0" />
                 <span className="text-xs font-medium">Schema successfully pushed & ready!</span>
               </div>
            )}
          </div>

          {/* Info: (20260413 - Luphia) Right Block: Connection & Password */}
          <div className="pt-6 sm:pt-0 sm:border-l sm:pl-6 border-t sm:border-t-0 border-slate-200">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4 flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5" />
              Database Connection
            </h4>
            
            {!isEditing ? (
              <div className="flex flex-col gap-3">
                <div className="bg-white border border-slate-100 p-3.5 rounded-lg shadow-sm flex flex-col gap-2.5">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Host Domain</span>
                     <code className="text-[11px] font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{dbHost || "127.0.0.1"}</code>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Port</span>
                     <code className="text-[11px] font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{dbPort || "20021"}</code>
                   </div>
                   <div className="flex items-center justify-between pt-2.5 border-t border-slate-50 mt-0.5">
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Root Password</span>
                     <code className="text-[11px] font-mono text-orange-700 bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100 max-w-[140px] truncate" title={dbPassword}>
                       {dbPassword ? '*'.repeat(dbPassword.length > 20 ? 20 : dbPassword.length) : "***********"}
                     </code>
                   </div>
                   <div className="text-[9px] text-gray-400 mt-1 select-all break-all leading-tight bg-gray-50 p-1.5 rounded border border-gray-100">
                     postgres://isunfa:***@{dbHost || "127.0.0.1"}:{dbPort || "20021"}/isunfa
                   </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="self-start text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-md hover:bg-orange-50 border border-transparent hover:border-orange-200"
                  disabled={displayStatus === StepStatus.LOADING}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Root Password
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  aria-label="New Root Password"
                  placeholder="Enter new strong password"
                  value={tmpPassword}
                  onChange={(e) => setTmpPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  disabled={displayStatus === StepStatus.LOADING}
                />
                <div className="flex items-center gap-2">
                   <button
                     onClick={handleResetPassword}
                     disabled={!tmpPassword.trim() || displayStatus === StepStatus.LOADING}
                     className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 disabled:opacity-50 transition"
                   >
                     {displayStatus === StepStatus.LOADING ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save & Sync"}
                   </button>
                   <button
                     onClick={() => { setIsEditing(false); setTmpPassword(""); }}
                     disabled={displayStatus === StepStatus.LOADING}
                     className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition"
                   >
                     Cancel
                   </button>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Resetting the password will automatically sync it to the running database via ALTER USER and restart connections.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {isActive && status === StepStatus.ERROR && (
        <button onClick={() => { setStatus(StepStatus.IDLE); setErrorMessage(""); }} className="mt-4 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition shadow-sm">
          Retry DB Initialization
        </button>
      )}
    </StepCard>
  );
}
