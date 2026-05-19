import { useEffect, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, ExternalLink } from "lucide-react";
import { StepCard } from "@/components/admin/setup/step_card";
import { IStepProps, StepStatus } from "@/components/admin/setup/setup_types";
import {
  getAdminWalletInfo,
  toggleMining,
} from "@/app/admin/setup/_api/database.api";
import { useTranslation } from "@/i18n/i18n_context";
import { MoneyUtil } from "@/lib/utils/money";

export function SetupFundWallet({
  isActive,
  isCompleted,
  onNext,
  onReset,
}: IStepProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StepStatus>(StepStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [walletInfo, setWalletInfo] = useState<{
    address: string;
    balance: string;
    isfBalance?: string;
  } | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [miningLoading, setMiningLoading] = useState(false);

  const execute = useCallback(async () => {
    if (status !== StepStatus.IDLE) return;
    setStatus(StepStatus.LOADING);
    try {
      const result = await getAdminWalletInfo();
      if (result.success && result.address && result.balance) {
        setWalletInfo({
          address: result.address,
          balance: result.balance,
          isfBalance: result.isfBalance,
        });
        setIsMining(result.isMining ?? false);

        if (MoneyUtil.toDecimal(result.balance).gte(1)) {
          setStatus(StepStatus.SUCCESS);
          setTimeout(onNext, 800);
        } else {
          setStatus(StepStatus.ERROR);
        }
      } else {
        setStatus(StepStatus.ERROR);
        setErrorMessage(
          `${t("admin_setup.step3.err_wallet_info")}${result.error}`,
        );
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
          setWalletInfo((prev) => ({
            ...prev,
            address: result.address!,
            balance: result.balance!,
            isfBalance: result.isfBalance,
          }));
          setIsMining(result.isMining ?? false);

          if (
            status !== StepStatus.SUCCESS &&
            MoneyUtil.toDecimal(result.balance).gte(1)
          ) {
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
      setErrorMessage(
        `${t("admin_setup.step3.err_mining")}${(result as { error?: string }).error || (result as { output?: string }).output}`,
      );
    }
    setMiningLoading(false);
  };

  const handleRefreshBalance = async () => {
    setStatus(StepStatus.LOADING);
    const result = await getAdminWalletInfo();
    if (result.success && result.address && result.balance) {
      setWalletInfo((prev) => ({
        ...prev,
        address: result.address!,
        balance: result.balance!,
        isfBalance: result.isfBalance,
      }));
      setIsMining(result.isMining ?? false);
      if (MoneyUtil.toDecimal(result.balance).gte(1)) {
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
          <button
            onClick={handleRefreshBalance}
            disabled={status === StepStatus.LOADING}
            className="flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-orange-700 disabled:opacity-50"
          >
            {t("admin_setup.step3.refresh_btn")}
          </button>
        )
      }
    >
      {(isActive || isCompleted || status === StepStatus.ERROR) &&
        walletInfo && (
          <div className="mt-5 grid grid-cols-1 gap-6 rounded-xl border border-slate-100 bg-slate-50 p-5 lg:grid-cols-12">
            {/* Info: (20260413 - Luphia) Left Column: Financials & Node Operations */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Info: (20260413 - Luphia) Balance Status */}
              <div>
                <h4 className="mb-4 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  {t("admin_setup.step3.awaiting")}
                </h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3">
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${MoneyUtil.toDecimal(walletInfo.balance).gte(1) ? "bg-green-500" : "animate-pulse bg-red-500"}`}
                    />
                    <div>
                      <div className="mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                        ISC Balance
                      </div>
                      <div
                        className={`text-lg font-bold tracking-tight ${MoneyUtil.toDecimal(walletInfo.balance).gte(1) ? "text-gray-900" : "text-red-600"}`}
                      >
                        {MoneyUtil.toDecimal(walletInfo.balance).toFixed(2)}{" "}
                        <span className="text-xs font-medium text-gray-500">
                          ISC
                        </span>
                      </div>
                    </div>
                  </div>

                  {walletInfo.isfBalance !== undefined && (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                          ISF Token Balance
                        </div>
                        <div className="text-lg font-bold tracking-tight text-gray-900">
                          {MoneyUtil.toDecimal(walletInfo.isfBalance).toFixed(
                            2,
                          )}{" "}
                          <span className="text-xs font-medium text-gray-500">
                            ISF
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {MoneyUtil.toDecimal(walletInfo.balance).lt(1) && (
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <div className="rounded-md border border-orange-200 bg-orange-100 px-3 py-2 text-xs leading-relaxed font-semibold text-orange-800">
                      <span className="mb-1 flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        {t("admin_setup.step3.waiting_deposit")}
                      </span>
                      {t("admin_setup.step3.awaiting_desc")}
                    </div>
                  </div>
                )}
              </div>

              {/* Info: (20260413 - Luphia) Node Mining Action */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  {t("admin_setup.step3.node_mining")}
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleMining}
                    disabled={miningLoading}
                    className={`${isMining ? "bg-orange-600" : "bg-gray-200"} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:outline-none ${miningLoading ? "cursor-not-allowed opacity-50" : ""}`}
                    role="switch"
                    aria-checked={isMining}
                  >
                    <span className="sr-only">Toggle mining</span>
                    <span
                      aria-hidden="true"
                      className={`${isMining ? "translate-x-5" : "translate-x-0"} pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white ring-0 transition duration-200 ease-in-out`}
                    >
                      {miningLoading && (
                        <Loader2 className="h-3 w-3 animate-spin text-orange-600" />
                      )}
                    </span>
                  </button>

                  <span className="min-w-[60px] text-left text-sm font-medium">
                    {isMining ? (
                      <span className="flex items-center gap-1.5 text-orange-600">
                        <span className="-200 h-2 w-2 animate-pulse rounded-full bg-orange-600" />
                        {t("admin_setup.step3.active")}
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        {t("admin_setup.step3.off")}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                  {isMining
                    ? t("admin_setup.step3.mining_on")
                    : t("admin_setup.step3.mining_off")}
                </p>
              </div>
            </div>

            {/* Info: (20260413 - Luphia) Right Column: Large QR & 1-line Address */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
              <h4 className="mb-4 w-full text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {t("admin_setup.step3.deployer_address")}
              </h4>

              <div className="flex flex-grow items-center justify-center pb-4">
                <div className="inline-block rounded-xl border border-gray-100 bg-white p-3">
                  <QRCodeSVG value={walletInfo.address} size={200} level="H" />
                </div>
              </div>

              <div className="mt-2 flex w-full items-center gap-3 border-t border-slate-100 pt-4">
                <div className="custom-scrollbar min-w-0 flex-1 overflow-x-auto rounded-md border border-gray-200 bg-gray-50">
                  <code className="block px-3 py-2 font-mono text-sm whitespace-nowrap text-gray-700">
                    {walletInfo.address}
                  </code>
                </div>
                <a
                  href={`https://baifa.io/chain/isuncoin/address/${walletInfo.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded border border-transparent p-2 text-orange-600 transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
    </StepCard>
  );
}
