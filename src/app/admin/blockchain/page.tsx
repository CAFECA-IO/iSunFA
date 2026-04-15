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
    setToastMessage({ type: "success", text: "Copied to clipboard" });
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
          text: `Mining ${newState ? "Enabled" : "Disabled"} Successfully.`,
        });
        await mutate();
      }
    } catch (e: unknown) {
      setToastMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to toggle mining.",
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
      setToastMessage({ type: "error", text: "Invalid mint amount." });
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
        text: e instanceof Error ? e.message : "Minting failed.",
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
        <h2 className="text-xl font-bold text-gray-800">Connection Failed</h2>
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
              Blockchain Dashboard
            </h1>
            <p className="mt-2 text-gray-500">
              Monitor native assets, system registries, and proof of work nodes.
            </p>
          </div>
          {isValidating && !data && (
            <div className="flex items-center text-sm font-medium text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching
              ledger...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Info: (20260416 - Luphia) Left Column: Wallet QR & Info */}
          <div className="space-y-6 lg:col-span-1">
            {/* Info: (20260416 - Luphia) QR Code Section */}
            <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex w-full items-center gap-2">
                <Landmark className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-gray-800">Admin Treasury</h3>
              </div>
              <div className="group relative rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
                {data ? (
                  <QRCode
                    value={data.address}
                    size={200}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                ) : (
                  <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-gray-100" />
                )}
              </div>

              <div className="mt-6 w-full text-center">
                <p className="mb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Public Address
                </p>
                {data ? (
                  <button
                    onClick={() => handleCopy(data.address)}
                    className="group flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <span className="max-w-[80%] truncate font-mono text-sm">
                      {data.address}
                    </span>
                    <Copy className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                  </button>
                ) : (
                  <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
                )}
              </div>
            </div>

            {/* Info: (20260416 - Luphia) Mining Control */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div
                className={`absolute top-0 left-0 h-full w-1 ${data?.isMining ? "bg-emerald-400" : "bg-gray-300"}`}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2 ${data?.isMining ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    <Pickaxe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Consensus Node
                    </h3>
                    <p className="text-xs text-gray-500">
                      {data?.isMining
                        ? "Mining Active (5 Threads)"
                        : "Mining Paused"}
                    </p>
                  </div>
                </div>
                <button
                  disabled={!data || isTogglingMining}
                  onClick={handleToggleMining}
                  aria-label="Toggle Mining"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 ${data?.isMining ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${data?.isMining ? "trangray-x-6" : "trangray-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info: (20260416 - Luphia) Right Column: Metrics & Actions */}
          <div className="space-y-6 lg:col-span-2">
            {/* Info: (20260416 - Luphia) System Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Info: (20260416 - Luphia) Admin ISC */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Admin Wallet ISC
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {data
                      ? parseFloat(data.adminIscBalance).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 4 },
                      )
                      : "---"}
                  </h2>
                  <span className="text-sm font-medium text-gray-500">ISC</span>
                </div>
              </div>
              {/* Info: (20260416 - Luphia) Admin ICP */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Admin Wallet ICP
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {data
                      ? parseFloat(data.adminIcpInventory).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 4 },
                      )
                      : "---"}
                  </h2>
                  <span className="text-sm font-medium text-gray-500">ICP</span>
                </div>
              </div>
              {/* Info: (20260416 - Luphia) Member System ISC */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Member System ISC
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {data
                      ? parseFloat(data.membershipIscBalance).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 4 },
                      )
                      : "---"}
                  </h2>
                  <span className="text-sm font-medium text-gray-500">ISC</span>
                </div>
              </div>
              {/* Info: (20260416 - Luphia) Total ICP Supply */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  System ICP Supply
                </p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold text-emerald-600">
                    {data
                      ? parseFloat(data.systemTotalIcp).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 4 },
                      )
                      : "---"}
                  </h2>
                  <span className="text-sm font-medium text-gray-500">ICP</span>
                </div>
              </div>
              {/* Info: (20260416 - Luphia) Member System ICP Inventory & Water Level */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:col-span-2">
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Member System ICP Reserve
                </p>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 justify-between">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-emerald-600">
                      {data
                        ? parseFloat(data.membershipSystemIcpInventory).toLocaleString(
                          undefined,
                          { maximumFractionDigits: 4 },
                        )
                        : "---"}
                    </h2>
                    <span className="text-sm font-medium text-gray-500">ICP</span>
                  </div>
                  {data && (
                    <div className="text-xs text-gray-500 mt-2 sm:mt-0 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <div>
                        <p>Members: <span className="font-semibold text-gray-700">{data.totalMembers.toLocaleString()}</span> (Burn: 5 ICP/day)</p>
                        <p>Est. Water Level: <span className="font-semibold text-gray-700">{data.totalMembers > 0 ? Math.floor(parseFloat(data.membershipSystemIcpInventory) / (data.totalMembers * 5)) : "∞"} days</span> left</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info: (20260416 - Luphia) Mint ICP Action */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl bg-orange-50 p-3 text-orange-500">
                  <Coins className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-800">
                    Mint Credit Points (ICP)
                  </h3>
                  <p className="mt-1 mb-6 text-sm text-gray-500">
                    Minting ICP requires providing an equivalent amount of ISC
                    based on the real-time collateral rate. The minted ICP will
                    be placed in the Member System inventory.
                  </p>

                  <form onSubmit={handleMintSubmit} className="flex gap-3">
                    <div className="relative flex-1">
                      <label htmlFor="mint-amount" className="sr-only">
                        Mint ICP Amount
                      </label>
                      <input
                        id="mint-amount"
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        aria-label="Enter ICP amount to mint"
                        placeholder="Enter ICP amount to mint..."
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        disabled={!data || isMinting}
                        className="w-full rounded-xl border border-gray-300 py-3 pr-12 pl-4 font-medium text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:opacity-50"
                      />
                      <span className="absolute top-1/2 right-4 -translate-y-1/2 font-semibold text-gray-400">
                        ICP
                      </span>
                    </div>
                    <button
                      type="submit"
                      disabled={!data || !mintAmount || isMinting}
                      className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:outline-none disabled:bg-gray-400"
                    >
                      Confirm <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>

                  {data && data.collateralRate !== "0.0" && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                      <span className="text-gray-500">
                        Live Collateral Rate:
                      </span>
                      <span className="font-medium text-gray-700">
                        1 ICP ≈{" "}
                        {parseFloat(data.collateralRate).toLocaleString()} ISC
                      </span>
                    </div>
                  )}
                </div>
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
                  Confirm Mint Transaction
                </h3>
                <p className="mb-6 text-sm text-gray-500">
                  Review the collateral cost before signing the transaction.
                </p>

                <div className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 font-mono text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Mint Amount:</span>
                    <span className="font-bold text-emerald-600">
                      +{mintAmount} ICP
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Collateral Rate:</span>
                    <span className="text-gray-700">{data.collateralRate}</span>
                  </div>
                  <div className="my-2 h-px bg-gray-200" />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Deduction:</span>
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
                      Insufficient ISC balance. You need {estimatedIscCost} ISC
                      but only have {data.adminIscBalance}.
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
                    Cancel
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
                        <Loader2 className="h-4 w-4 animate-spin" /> Pending...
                      </>
                    ) : (
                      "Sign Transaction"
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
