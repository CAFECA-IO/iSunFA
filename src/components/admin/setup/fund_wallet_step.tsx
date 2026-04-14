import { useEffect, useState, useCallback } from "react";
import QRCode from "react-qr-code";
import { Loader2, ExternalLink } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import { getAdminWalletInfo, toggleMining } from "@/app/admin/setup/_api/database.api";
import { useTranslation } from "@/i18n/i18n_context";

export function SetupFundWallet({ isActive, isCompleted, onNext, onReset }: IStepProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [walletInfo, setWalletInfo] = useState<{ address: string; balance: string; isfBalance?: string } | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [miningLoading, setMiningLoading] = useState(false);

  const execute = useCallback(async () => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    try {
      const result = await getAdminWalletInfo();
      if (result.success && result.address && result.balance) {
        setWalletInfo({ address: result.address, balance: result.balance, isfBalance: result.isfBalance });
        setIsMining(result.isMining ?? false);

        const bal = Number(result.balance);
        if (bal >= 1) {
          setStatus(StepStatus.SUCCESS);
          setTimeout(onNext, 800);
        } else {
          setStatus(StepStatus.ERROR);
        }
      } else {
        setStatus(StepStatus.ERROR);
        setErrorMessage(`${t("admin_setup.step3.err_wallet_info")}${result.error}`);
      }
    } catch (err: unknown) {
      setStatus(StepStatus.ERROR);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [status, onNext, t]);

  // Info: (20260413 - Luphia) Initial trigger
  useEffect(() => {
    if (isActive && status === StepStatus.IDLE) {
      void setTimeout(execute, 0);
    }
  }, [isActive, status, execute]);

  // Info: (20260413 - Luphia) Polling for real-time funds and mining status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(async () => {
        const result = await getAdminWalletInfo();
        if (result.success && result.address && result.balance) {
          setWalletInfo(prev => ({ ...prev, address: result.address!, balance: result.balance!, isfBalance: result.isfBalance }));
          setIsMining(result.isMining ?? false);

          if (status !== StepStatus.SUCCESS && Number(result.balance) >= 1) {
            setStatus(StepStatus.SUCCESS);
            setTimeout(onNext, 800);
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isActive, status, onNext]);

  const handleToggleMining = async () => {
    setMiningLoading(true);
    const newStatus = !isMining;
    const result = await toggleMining(newStatus);
    if (result.success) {
      setIsMining(newStatus);
    } else {
      setErrorMessage(`${t("admin_setup.step3.err_mining")}${(result as { error?: string }).error || (result as { output?: string }).output}`);
    }
    setMiningLoading(false);
  };

  const handleRefreshBalance = async () => {
    setStatus(StepStatus.LOADING);
    const result = await getAdminWalletInfo();
    if (result.success && result.address && result.balance) {
      setWalletInfo(prev => ({ ...prev, address: result.address!, balance: result.balance!, isfBalance: result.isfBalance }));
      setIsMining(result.isMining ?? false);
      if (Number(result.balance) >= 1) {
        setStatus(StepStatus.SUCCESS);
        setTimeout(onNext, 800);
      } else {
        setStatus(StepStatus.IDLE);
      }
    } else {
      setStatus(StepStatus.ERROR);
      setErrorMessage(`${t("admin_setup.step3.err_refresh")}${result.error}`);
    }
  };

  const displayStatus = isCompleted ? StepStatus.SUCCESS : status;

  return (
    <StepCard
      step={3}
      title={t("admin_setup.step3.title")}
      description={t("admin_setup.step3.desc")}
      isActive={isActive}
      status={displayStatus}
      errorMessage={errorMessage}
      onReset={onReset}
      actionContent={
        isActive && (
          <button onClick={handleRefreshBalance} disabled={status === StepStatus.LOADING} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all flex items-center justify-center">
            {t("admin_setup.step3.refresh_btn")}
          </button>
        )
      }
    >
      {(isActive || isCompleted || status === StepStatus.ERROR) && walletInfo && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 border border-slate-100 p-5 rounded-xl">

          {/* Info: (20260413 - Luphia) Left Column: Financials & Node Operations */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* Info: (20260413 - Luphia) Balance Status */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">{t("admin_setup.step3.awaiting")}</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 ">
                  <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${Number(walletInfo.balance) >= 1 ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">ISC Balance</div>
                    <div className={`text-lg font-bold tracking-tight ${Number(walletInfo.balance) >= 1 ? "text-gray-900" : "text-red-600"}`}>
                      {Number(walletInfo.balance).toFixed(2)} <span className="text-xs font-medium text-gray-500">ISC</span>
                    </div>
                  </div>
                </div>

                {walletInfo.isfBalance !== undefined && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 ">
                    <div className="shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">ISF Token Balance</div>
                      <div className="text-lg font-bold tracking-tight text-gray-900">
                        {Number(walletInfo.isfBalance).toFixed(2)} <span className="text-xs font-medium text-gray-500">ISF</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {Number(walletInfo.balance) < 1 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="text-xs font-semibold text-orange-800 bg-orange-100 px-3 py-2 rounded-md border border-orange-200 leading-relaxed">
                    <span className="flex items-center gap-1.5 mb-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("admin_setup.step3.waiting_deposit")}
                    </span>
                    {t("admin_setup.step3.awaiting_desc")}
                  </div>
                </div>
              )}
            </div>

            {/* Info: (20260413 - Luphia) Node Mining Action */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">{t("admin_setup.step3.node_mining")}</h4>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleMining}
                  disabled={miningLoading}
                  className={`${isMining ? 'bg-orange-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${miningLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={isMining}
                >
                  <span className="sr-only">Toggle mining</span>
                  <span
                    aria-hidden="true"
                    className={`${isMining ? 'translate-x-5' : 'translate-x-0'} pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out`}
                  >
                    {miningLoading && <Loader2 className="w-3 h-3 text-orange-600 animate-spin" />}
                  </span>
                </button>

                <span className="text-sm font-medium min-w-[60px] text-left">
                  {isMining ? (
                    <span className="text-orange-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse -200" />
                      {t("admin_setup.step3.active")}
                    </span>
                  ) : (
                    <span className="text-gray-500">{t("admin_setup.step3.off")}</span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                {isMining ? t("admin_setup.step3.mining_on") : t("admin_setup.step3.mining_off")}
              </p>
            </div>

          </div>

          {/* Info: (20260413 - Luphia) Right Column: Large QR & 1-line Address */}
          <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-xl p-5 justify-between">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold w-full text-center mb-4">{t("admin_setup.step3.deployer_address")}</h4>

            <div className="flex-grow flex items-center justify-center pb-4">
              <div className="bg-white p-3 border border-gray-100 rounded-xl inline-block">
                <QRCode value={walletInfo.address} size={200} level="H" />
              </div>
            </div>

            <div className="mt-2 w-full pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto custom-scrollbar">
                <code className="block text-sm font-mono text-gray-700 px-3 py-2 whitespace-nowrap">
                  {walletInfo.address}
                </code>
              </div>
              <a href={`https://baifa.io/chain/isuncoin/address/${walletInfo.address}`} target="_blank" rel="noreferrer" className="shrink-0 text-orange-600 hover:bg-orange-50 p-2 rounded transition border border-transparent hover:border-orange-200">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      )}
    </StepCard>
  );
}
