"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "react-qr-code";
import {
  Copy,
  Coins,
  Pickaxe,
  Landmark,
  Network,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { type IBlockchainDashboardData } from "@/services/admin.blockchain.service";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { useTranslation } from "@/i18n/i18n_context";
function usePolling<T>(fetcher: () => Promise<T>, interval = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isValidating, setIsValidating] = useState(false);

  const mutate = useCallback(async () => {
    setIsValidating(true);
    try {
      const res = await fetcher();
      setData(res);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsValidating(false);
    }
  }, [fetcher]);

  useEffect(() => {
    mutate();
    const id = setInterval(mutate, interval);
    const onFocus = () => mutate();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [mutate, interval]);

  return { data, error, isValidating, mutate };
}

export default function BlockchainDashboardPage() {
  const { t } = useTranslation();
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [mintAmount, setMintAmount] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isTogglingMining, setIsTogglingMining] = useState(false);

  const fetcher = useCallback(async () => {
    const res = await request<{
      success: boolean;
      payload: IBlockchainDashboardData;
    }>("/api/v1/admin/blockchain/dashboard");
    if (!res.success) throw new Error("Failed to fetch dashboard data");
    return res.payload;
  }, []);

  const { data, error, isValidating, mutate } = usePolling(fetcher, 10000);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage({ type: "success", text: t("admin_blockchain.page.copied") });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleMining = async () => {
    if (!data) return;
    setIsTogglingMining(true);
    const newState = !data.isMining;
    try {
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      const res = await request<{
        success: boolean;
        payload?: { output?: string };
      }>("/api/v1/admin/blockchain/mining", {
        method: "POST",
        body: JSON.stringify({
          state: newState,
          fido2Signature: {
            authentication,
            challengeToken: token
          }
        }),
      });
      if (res.success) {
        setToastMessage({
          type: "success",
          text: newState ? t("admin_blockchain.page.mining_enabled") : t("admin_blockchain.page.mining_disabled"),
        });
        await mutate();
      }
    } catch (e: unknown) {
      setToastMessage({
        type: "error",
        text: e instanceof Error ? e.message : t("admin_blockchain.page.failed_toggle"),
      });
    } finally {
      setIsTogglingMining(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleMintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(mintAmount);
    if (!amt || amt <= 0) {
      setToastMessage({ type: "error", text: t("admin_blockchain.page.invalid_amount") });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setShowConfirmModal(true);
  };

  const executeMint = async () => {
    setIsMinting(true);
    const amt = parseFloat(mintAmount);
    try {
      const { challenge, token } = await getLoginOptions();
      const authentication = await fido2ClientService.startLogin({ challenge });

      const res = await request<{
        success: boolean;
        payload?: { message?: string };
      }>("/api/v1/admin/blockchain/mint", {
        method: "POST",
        body: JSON.stringify({
          amount: amt,
          fido2Signature: {
            authentication,
            challengeToken: token
          }
        }),
      });
      if (res.success) {
        setShowConfirmModal(false);
        setMintAmount("");
        setToastMessage({
          type: "success",
          text: res.payload?.message || "Minting successful!",
        });
        await mutate();
      }
    } catch (e: unknown) {
      setToastMessage({
        type: "error",
        text: e instanceof Error ? e.message : t("admin_blockchain.page.minting_failed"),
      });
    } finally {
      setIsMinting(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  if (error && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-3 text-red-600">
          <Network className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{t("admin_blockchain.page.connection_failed")}</h2>
        <p className="mt-2 max-w-md text-gray-600">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  const estimatedIscCost =
    data && mintAmount
      ? parseFloat(mintAmount) * parseFloat(data.collateralRate)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl space-y-6">
        {/* Info: (20260416 - Luphia) Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 shadow-lg transition-all
              ${toastMessage.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}
            `}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Network className="h-5 w-5" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-800">
              <Network className="h-8 w-8 text-orange-500" />
              {t("admin_blockchain.page.title")}
            </h1>
            <p className="mt-2 text-gray-500">
              {t("admin_blockchain.page.subtitle")}
            </p>
          </div>
          {isValidating && !data && (
            <div className="flex items-center text-sm font-medium text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("admin_blockchain.page.fetching")}
            </div>
          )}
        </div>

        {/* Info: (20260416 - Luphia) Top Metrics Ribbon */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Info: (20260416 - Luphia) Admin ISC */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Landmark className="h-16 w-16" />
            </div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              {t("admin_blockchain.page.admin_isc")}
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-gray-900">
                {data
                  ? parseFloat(data.adminIscBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                  : "---"}
              </h2>
              <span className="text-sm font-semibold text-gray-500">ISC</span>
            </div>
          </div>

          {/* Info: (20260416 - Luphia) Total System ICP */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Coins className="h-16 w-16" />
            </div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              {t("admin_blockchain.page.system_icp")}
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-emerald-600">
                {data
                  ? parseFloat(data.systemTotalIcp).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                  : "---"}
              </h2>
              <span className="text-sm font-semibold text-emerald-600/70">ICP</span>
            </div>
          </div>

          {/* Info: (20260416 - Luphia) Member Reserve ICP */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm transition hover:shadow-md">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Network className="h-16 w-16 text-emerald-500" />
            </div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-emerald-600/80 uppercase">
              {t("admin_blockchain.page.member_icp")}
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold text-emerald-700">
                  {data
                    ? parseFloat(data.membershipSystemIcpInventory).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                    : "---"}
                </h2>
                <span className="text-sm font-semibold text-emerald-600/70">ICP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info: (20260416 - Luphia) Main Operations & Treasury Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Info: (20260416 - Luphia) Operations Column */}
          <div className="space-y-6 lg:col-span-2">

            {/* Info: (20260416 - Luphia) Mint Form */}
            <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-white to-orange-50/30 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="shrink-0 rounded-2xl bg-orange-100 p-4 text-orange-600 shadow-inner hidden sm:block">
                  <Coins className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1 w-full">
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="shrink-0 rounded-xl bg-orange-100 p-2 text-orange-600 shadow-inner sm:hidden">
                      <Coins className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {t("admin_blockchain.page.mint_icp")}
                    </h3>
                  </div>
                  <p className="mt-2 mb-8 text-sm leading-relaxed text-gray-600">
                    {t("admin_blockchain.page.mint_desc")}
                  </p>

                  <form onSubmit={handleMintSubmit} className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1">
                      <label htmlFor="mint-amount" className="sr-only">
                        {t("admin_blockchain.page.amount_aria")}
                      </label>
                      <input
                        id="mint-amount"
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        aria-label={t("admin_blockchain.page.amount_aria")}
                        placeholder={t("admin_blockchain.page.amount_placeholder")}
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        disabled={!data || isMinting}
                        className="w-full rounded-2xl border-2 border-gray-200 py-3.5 pl-5 pr-16 font-semibold text-gray-900 transition hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:outline-none disabled:opacity-50"
                      />
                      <span className="absolute top-1/2 right-5 -translate-y-1/2 font-bold text-gray-400">
                        ICP
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={!data || !mintAmount || isMinting}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-8 py-3.5 font-bold text-white shadow-md transition hover:bg-gray-800 hover:shadow-lg focus:ring-4 focus:ring-gray-900/20 focus:outline-none disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                    >
                      {t("admin_blockchain.page.confirm")} <ArrowRight className="h-5 w-5" />
                    </button>
                  </form>

                  {data && data.collateralRate !== "0.0" && (
                    <div className="mt-6 flex items-center gap-3 rounded-xl bg-orange-50/50 px-4 py-3 text-sm text-orange-800">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      <span className="font-medium">
                        {t("admin_blockchain.page.live_rate")}
                      </span>
                      <span className="ml-auto font-bold">
                        1 ICP ≈ {parseFloat(data.collateralRate).toLocaleString()} ISC
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info: (20260416 - Luphia) Mining Status */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div
                className={`absolute top-0 left-0 h-full w-1.5 ${data?.isMining ? "bg-emerald-500" : "bg-gray-300"}`}
              />
              <div className="flex items-center justify-between pl-3 sm:pl-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-2xl p-3 shadow-inner ${data?.isMining ? "bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100" : "bg-gray-100 text-gray-400"}`}
                  >
                    <Pickaxe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {t("admin_blockchain.page.consensus_node")}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      {data?.isMining
                        ? t("admin_blockchain.page.mining_active")
                        : t("admin_blockchain.page.mining_paused")}
                    </p>
                  </div>
                </div>
                <button
                  disabled={!data || isTogglingMining}
                  onClick={handleToggleMining}
                  aria-label="Toggle Mining"
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus:ring-4 focus:ring-emerald-500/20 focus:outline-none disabled:opacity-50 ${data?.isMining ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${data?.isMining ? "translate-x-7" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>

          </div>

          {/* Info: (20260416 - Luphia) Treasury Details Column */}
          <div className="lg:col-span-1">
            <div className="flex h-full flex-col items-center justify-between rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="w-full">
                <div className="mb-8 flex items-center gap-3 border-b border-gray-100 pb-4">
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">{t("admin_blockchain.page.admin_treasury")}</h3>
                </div>

                <div className="group relative mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 transition hover:border-orange-300 hover:bg-orange-50/30">
                  {data ? (
                    <div className="overflow-hidden rounded-xl bg-white p-2 shadow-sm transition transform group-hover:scale-105">
                      <QRCode
                        value={data.address}
                        size={200}
                        style={{ height: "100%", width: "100%" }}
                      />
                    </div>
                  ) : (
                    <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-gray-200" />
                  )}
                </div>
              </div>

              <div className="mt-8 w-full text-center">
                <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">
                  {t("admin_blockchain.page.public_address")}
                </p>
                {data ? (
                  <button
                    onClick={() => handleCopy(data.address)}
                    className="group flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 transition hover:border-orange-300 hover:bg-white hover:shadow-md active:bg-orange-50"
                  >
                    <span className="max-w-[85%] text-gray-600 truncate font-mono text-sm font-medium transition group-hover:text-orange-700">
                      {data.address}
                    </span>
                    <Copy className="h-4 w-4 text-gray-400 transition group-hover:text-orange-500 shrink-0" />
                  </button>
                ) : (
                  <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info: (20260416 - Luphia) Confirmation Modal */}
        {showConfirmModal && data && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {t("admin_blockchain.page.modal_title")}
                </h3>
                <p className="mb-6 text-sm text-gray-500">
                  {t("admin_blockchain.page.modal_desc")}
                </p>

                <div className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 font-mono text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t("admin_blockchain.page.mint_amount")}</span>
                    <span className="font-bold text-emerald-600">
                      +{mintAmount} ICP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t("admin_blockchain.page.mint_est_days")}</span>
                    <span className="font-bold text-gray-700">
                      ~{data.totalMembers > 0 && parseFloat(mintAmount) > 0 ? Math.floor(parseFloat(mintAmount) / (data.totalMembers * 5)) : "0"} {t("admin_blockchain.page.days")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t("admin_blockchain.page.col_rate")}</span>
                    <span className="text-gray-700">{data.collateralRate}</span>
                  </div>
                  <div className="my-2 h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t("admin_blockchain.page.total_deduction")}</span>
                    <span className="font-bold text-red-500">
                      -
                      {estimatedIscCost.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      ISC
                    </span>
                  </div>
                </div>

                {parseFloat(data.adminIscBalance) < estimatedIscCost && (
                  <div className="mb-6 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    <Network className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      {t("admin_blockchain.page.insufficient_prefix")} {estimatedIscCost}
                      {t("admin_blockchain.page.insufficient_mid")} {data.adminIscBalance} ISC.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isMinting}
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
                  >
                    {t("admin_blockchain.page.cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={
                      isMinting ||
                      parseFloat(data.adminIscBalance) < estimatedIscCost
                    }
                    onClick={executeMint}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 font-semibold text-white hover:bg-orange-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {t("admin_blockchain.page.pending")}
                      </>
                    ) : (
                      t("admin_blockchain.page.sign_tx")
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
