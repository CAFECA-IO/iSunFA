import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { deployContracts, getDeployProgress } from "@/services/deploy.service";

export function Step5DeployContracts({ isActive, isCompleted, onNext }: IStepProps) {
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deployProgress, setDeployProgress] = useState<string>("");
  const [contractAddresses, setContractAddresses] = useState<{ name: string; address: string }[] | null>(null);

  const execute = useCallback(async () => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    setDeployProgress("");

    // Info: (20260412 - Luphia) Start polling deployment progress
    const intervalId = setInterval(async () => {
      try {
        const log = await getDeployProgress();
        if (log) setDeployProgress(log);
      } catch { }
    }, 1500);

    let result: { success: boolean; output: string } = { success: false, output: "" };

    try {
      result = await deployContracts();
    } catch (err) {
      /**
       * Info: (20260413 - Luphia) Server reloads when .env.setup is updated at the end of deployment, 
       * causing the fetch to drop. We pause to let it restart, then fetch the fast-path result.
       */
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        result = await deployContracts();
      } catch (innerErr) {
        result = { success: false, output: String(err) + " / " + String(innerErr) };
      }
    }

    // Info: (20260412 - Luphia) Stop polling and grab final output
    clearInterval(intervalId);
    setDeployProgress(result.output || "");

    if (result.success) {
      const kyc = result.output.match(/KYCRegistry:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const dmc = result.output.match(/DynamicMembershipCard:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const treasury = result.output.match(/CreditPoint:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const sub = result.output.match(/SubscriptionManager:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const ep = result.output.match(/EntryPoint:\s+(0x[a-fA-F0-9]{40})/)?.[1];
      const factory = result.output.match(/Fido2AccountFactory:\s+(0x[a-fA-F0-9]{40})/)?.[1];

      const addresses = [];
      if (kyc) addresses.push({ name: "KYC Registry", address: kyc });
      if (dmc) addresses.push({ name: "Dynamic Membership Card", address: dmc });
      if (treasury) addresses.push({ name: "Credit Point (ERC3643)", address: treasury });
      if (sub) addresses.push({ name: "Subscription Manager", address: sub });
      if (ep) addresses.push({ name: "EntryPoint (ERC4337)", address: ep });
      if (factory) addresses.push({ name: "FIDO2 Account Factory", address: factory });

      setContractAddresses(addresses.length > 0 ? addresses : null);
      setStatus(StepStatus.SUCCESS);
      setTimeout(onNext, 1500);
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(`Failed to deploy contracts. Output: ${result.output.substring(0, 300)}...`);
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
      step={4}
      title="Step 4: Deploy Smart Contracts"
      description="Automatically deploying protocol contracts (Credit Point, KYC Registry, etc) to EVM."
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
    >
      {isActive && status === StepStatus.ERROR && (
        <button onClick={() => { setStatus(StepStatus.IDLE); setErrorMessage(""); }} className="mt-3 text-sm px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition">
          Retry Deploy
        </button>
      )}

      {isActive && status === StepStatus.LOADING && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg shadow-inner max-h-48 overflow-y-auto custom-scrollbar flex flex-col-reverse">
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words leading-relaxed mb-0">
              {deployProgress || "Initializing EVM deployment...\nWaiting for compiler..."}
            </pre>
          </div>

          {/* Info: (20260412 - Luphia) Dynamic Live Contract List */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-6 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
              Deploying Contracts
            </h4>
            <div className="space-y-3">
              {[
                { id: "KYCRegistry", label: "KYC Registry" },
                { id: "DynamicMembershipCard", label: "Dynamic Membership Card" },
                { id: "CreditPoint", label: "Credit Point (ERC3643)" },
                { id: "SubscriptionManager", label: "Subscription Manager" },
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
                          {isDeploying ? "DEPLOYING" : "PENDING"}
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
              Deployment Successful
            </h4>
            <button
              onClick={() => { setContractAddresses(null); setStatus(StepStatus.IDLE); setErrorMessage(""); }}
              disabled={status === StepStatus.LOADING}
              className="text-xs px-3 py-1.5 bg-orange-600 text-white font-medium rounded hover:bg-orange-700 transition shadow-sm"
            >
              Re-Deploy
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contractAddresses.map((c, i) => (
              <div key={i} className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{c.name}</span>
                <code className="text-xs sm:text-sm font-mono text-gray-800 break-all bg-gray-50 px-2 py-1 rounded shrink-0 leading-relaxed truncate">
                  {c.address}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </StepCard>
  );
}
