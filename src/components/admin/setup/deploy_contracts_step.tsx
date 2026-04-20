import { useState, useCallback, useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { useTranslation } from "@/i18n/i18n_context";
import { CURRENCY_UNIT } from "@/constants/price";

export interface IDependencyCheck {
  source: string;
  sourceAddress: string;
  target: string;
  targetAddress: string;
  valid: boolean;
}

export function SetupDeployContracts({ isActive, isCompleted, onNext, onReset }: IStepProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deployProgress, setDeployProgress] = useState<string>("");
  const [contractAddresses, setContractAddresses] = useState<{ name: string; address: string }[] | null>(null);
  const [dependencyResults, setDependencyResults] = useState<IDependencyCheck[]>([]);

  // Info: (20260416 - Luphia) Expose the configuration argument for the Deployment Action
  const [collateralRate, setCollateralRate] = useState<string>("0.05");

  const [hasExisting, setHasExisting] = useState<boolean>(false);

  const callSetupApi = useCallback(async (action: string, args: unknown[] = []) => {
    const res = await fetch(`/api/v1/admin/setup/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args })
    });

    let parsed;
    try {
      parsed = await res.json();
    } catch (e) {
      if (!res.ok) throw new Error(`HTTP Error ${res.status}: Server might be restarting`);
      throw e;
    }

    if (!parsed.success) throw new Error(parsed.message || "Unknown API Error");
    return parsed.payload;
  }, []);

  useEffect(() => {
    if (isActive && !isCompleted) {
      callSetupApi("checkHasExistingContracts").then((exists) => setHasExisting(exists as boolean));
    }
  }, [isActive, isCompleted, callSetupApi]);

  const execute = useCallback(async (useExisting: boolean = false) => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    setDeployProgress("");

    // Info: (20260412 - Luphia) Start polling deployment progress
    const intervalId = setInterval(async () => {
      try {
        const log = await callSetupApi("getDeployProgress");
        if (log) setDeployProgress(log as string);
      } catch { }
    }, 1500);

    let result: { success: boolean; output: string; pending?: boolean } = { success: false, output: "" };

    try {
      result = await callSetupApi("deployContracts", [parseFloat(collateralRate), useExisting]);
    } catch {
      // Info: (20260418 - Luphia) In case of unexpected proxy drop, it is likely already deploying in the background.
      result = { success: true, pending: true, output: "Reconnecting to deployment thread..." };
    }

    if (result.pending) {
      result.output = await new Promise<string>((resolve) => {
        const sid = setInterval(async () => {
          try {
            const log = await callSetupApi("getDeployProgress") as string;
            setDeployProgress(log || "");

            if (log && log.includes("===== DEPLOYMENT SUMMARY =====")) {
              clearInterval(sid);
              resolve(log);
            } else if (log && log.includes("Failed:") && !log.includes("Warning:")) {
              clearInterval(sid);
              resolve(log);
            }
          } catch { }
        }, 1500);
      });
      result.success = result.output.includes("===== DEPLOYMENT SUMMARY =====");
    }

    // Info: (20260412 - Luphia) Stop any duplicate fallback polling and grab final output
    clearInterval(intervalId);
    setDeployProgress(result.output || "");

    if (result.success) {
      const kyc = result.output.match(/DynamicKYCMembership:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const treasury = result.output.match(/CreditPoint:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const sub = result.output.match(/SubscriptionManager:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const membership = result.output.match(/MembershipSystem:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const ep = result.output.match(/EntryPoint:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const factory = result.output.match(/Fido2AccountFactory:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const missionBoard = result.output.match(/MissionBoard:\s+(0x[a-fA-F0-9]{40})/)?.[1];

      const addresses = [];
      if (kyc) addresses.push({ name: "Dynamic KYC Membership", address: kyc });
      if (treasury) addresses.push({ name: "Credit Point (ERC3643)", address: treasury });
      if (sub) addresses.push({ name: "Subscription Manager", address: sub });
      if (membership) addresses.push({ name: "Membership System", address: membership });
      if (missionBoard) addresses.push({ name: "Mission Board", address: missionBoard });
      if (ep) addresses.push({ name: "EntryPoint (ERC4337)", address: ep });
      if (factory) addresses.push({ name: "FIDO2 Account Factory", address: factory });

      setContractAddresses(addresses.length > 0 ? addresses : null);

      setDeployProgress((prev) => prev + "\n[Validator] Verifying contract dependencies... Please wait.");
      try {
        const verifyObj = await callSetupApi("verifyContractDependencies") as { success: boolean, results: IDependencyCheck[] };
        if (verifyObj && verifyObj.success) {
          setDependencyResults(verifyObj.results);
        }
      } catch (err) {
        console.warn("Failed to verify contract dependencies:", err);
      }

      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 2500);
    } else {
      setStatus(StepStatus.ERROR);
      // Info: (20260418 - Luphia) 確保擷取結尾的錯誤訊息，而不是前面被截斷的成功日誌
      const outMsg = result.output.length > 500 ? "..." + result.output.substring(result.output.length - 500) : result.output;
      setErrorMessage(`${t("admin_setup.step4.err_deploy")}\n${outMsg}`);
    }
  }, [status, onNext, t, collateralRate, callSetupApi]);

  // Info: (20260416 - Luphia) Removed auto-deployment upon active status tracking to give room to configure the deployment param

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;
  const isInputInvalid = isNaN(parseFloat(collateralRate)) || parseFloat(collateralRate) < 1e-9 || parseFloat(collateralRate) > 100;

  return (
    <StepCard
      step={4}
      title={t("admin_setup.step4.title")}
      description={t("admin_setup.step4.desc")}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && status === StepStatus.ERROR ? (
          <button onClick={() => { setStatus(StepStatus.IDLE); setErrorMessage(""); }} className="text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">
            {t("admin_setup.step4.retry_btn")}
          </button>
        ) : isCompleted ? (
          <button
            onClick={() => { setContractAddresses(null); setDependencyResults([]); setStatus(StepStatus.IDLE); setErrorMessage(""); }}
            disabled={status === StepStatus.LOADING}
            className="text-sm px-4 py-1.5 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition"
          >
            {t("admin_setup.step4.re_deploy_btn")}
          </button>
        ) : isActive && status === StepStatus.IDLE ? (
          <div className="flex items-center gap-3">
            {hasExisting && (
              <button
                onClick={() => execute(true)}
                className="text-sm px-4 py-2 bg-emerald-600 font-bold tracking-wider text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                {t("admin_setup.step4.use_existing_btn")}
              </button>
            )}
            <button
              onClick={() => execute(false)}
              disabled={isInputInvalid}
              className="text-sm px-4 py-2 bg-orange-600 font-bold tracking-wider text-white rounded-lg hover:bg-orange-700 transition shadow-sm disabled:opacity-50"
            >
              {t("admin_setup.step4.start_deployment_btn")}
            </button>
          </div>
        ) : null
      }
    >
      {/* Info: (20260416 - Luphia) Show Configuration Panel if idle */}
      {isActive && status === StepStatus.IDLE && !isCompleted && (
        <div className="mt-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          {hasExisting && (
            <div className="mb-5 p-3 sm:px-4 bg-sky-50 border border-sky-100 rounded-lg text-[13px] text-sky-800 flex flex-col gap-1">
              <span className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {t("admin_setup.step4.existing_found_title")}</span>
              <span className="opacity-90">{t("admin_setup.step4.existing_found_desc")}</span>
            </div>
          )}
          <h4 className="text-sm font-bold text-gray-800 mb-2">{t("admin_setup.step4.network_economics")}</h4>
          <p className="text-xs text-gray-500 mb-5">
            {t("admin_setup.step4.col_rate_desc")}
          </p>

          <div className="flex flex-col gap-2">
            <label htmlFor="collateral-rate" className="text-xs font-semibold text-gray-700">
              {t("admin_setup.step4.col_rate_label")}
            </label>
            <input
              id="collateral-rate"
              name="collateralRate"
              type="number"
              step="any"
              value={collateralRate}
              min={1e-9}
              max={100}
              onChange={(e) => setCollateralRate(e.target.value)}
              placeholder={t("admin_setup.step4.col_rate_placeholder")}
              aria-label={t("admin_setup.step4.col_rate_label")}
              className="text-gray-500 w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {isInputInvalid && (
              <span className="text-[11px] text-red-500">
                {t("admin_setup.step4.col_rate_err")}
              </span>
            )}
            <div className="mt-2 text-[11px] text-gray-400 bg-gray-50 p-3 rounded border border-gray-100 flex items-center gap-2 max-w-sm">
              <span className="shrink-0 text-yellow-700 px-1 py-0.5 rounded font-mono font-bold tracking-wide">
                1 {CURRENCY_UNIT.ICP} = {parseFloat(collateralRate) || 0} {CURRENCY_UNIT.ISC}
              </span>
            </div>
          </div>
        </div>
      )}

      {isActive && status === StepStatus.LOADING && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg max-h-48 overflow-y-auto custom-scrollbar flex flex-col-reverse">
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words leading-relaxed mb-0">
              {deployProgress || t("admin_setup.step4.init_msg")}
            </pre>
          </div>

          {/* Info: (20260412 - Luphia) Dynamic Live Contract List */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-6 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
              {t("admin_setup.step4.deploy_btn")}
            </h4>
            <div className="space-y-3">
              {[
                { id: "DynamicKYCMembership", label: "Dynamic KYC Membership" },
                { id: "CreditPoint", label: "Credit Point (ERC3643)" },
                { id: "SubscriptionManager", label: "Subscription Manager" },
                { id: "MembershipSystem", label: "Membership System" },
                { id: "MissionBoard", label: "Mission Board" },
                { id: "EntryPoint", label: "EntryPoint (ERC4337)" },
                { id: "Fido2AccountFactory", label: "FIDO2 Account Factory" }
              ].map((contract, i) => {
                const isDeploying = deployProgress.includes(`Deploying ${contract.id}...`);
                const deployedMatch = deployProgress.match(new RegExp(`-> ${contract.id} deployed to:\\s+(0x[a-fA-F0-9]{40})`));
                const address = deployedMatch ? deployedMatch[1] : null;

                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <span className="text-[12px] font-medium text-gray-500 flex items-center gap-2.5">
                      {address ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : (isDeploying ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" /> : <div className="w-4 h-4 border-2 border-gray-200 rounded-full" />)}
                      {contract.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {address ? (
                        <>
                          <code className="text-[12px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {address.substring(0, 10)}...{address.substring(address.length - 8)}
                          </code>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-mono tracking-wider">
                          {isDeploying ? t("admin_setup.step4.deploying") : t("admin_setup.step4.pending")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info: (20260412 - Luphia) Final display when succeeded */}
      {isCompleted && contractAddresses && (
        <div className="mt-5 bg-slate-50 border border-slate-100 p-5 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {t("admin_setup.step4.completed")}
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contractAddresses.map((c, i) => (
              <div key={i} className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-slate-100 ">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{c.name}</span>
                <code className="text-xs sm:text-sm font-mono text-gray-800 break-all bg-gray-50 px-2 py-1 rounded shrink-0 leading-relaxed truncate">
                  {c.address}
                </code>
              </div>
            ))}
          </div>

          {dependencyResults.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center gap-2">
                {t("admin_setup.step4.dependency_verified")}
              </h4>
              <div className="flex flex-col gap-2">
                {dependencyResults.map((dep, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] px-3 py-1.5 bg-white border border-slate-100 rounded">
                    <span className="text-slate-600 font-mono tracking-tight">{dep.source} <span className="opacity-50 mx-1">→</span> {dep.target}</span>
                    {dep.valid ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle2 className="w-3 h-3" /> {t("admin_setup.step4.valid")}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-500 font-bold">{t("admin_setup.step4.invalid")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </StepCard>
  );
}
