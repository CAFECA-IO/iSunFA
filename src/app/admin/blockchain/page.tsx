"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";

import {
  Network,
  Loader2,
  CheckCircle2,
  Landmark,
  Coins,
  Blocks,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import AdminMetricCard from "@/components/admin/common/admin_metric_card";
import FidoConfirmModal from "@/components/admin/common/fido_confirm_modal";
import BlockchainMintForm from "@/components/admin/blockchain/blockchain_mint_form";
import BlockchainMiningStatus from "@/components/admin/blockchain/blockchain_mining_status";
import BlockchainTreasury from "@/components/admin/blockchain/blockchain_treasury";
import BlockchainPeers from "@/components/admin/blockchain/blockchain_peers";
import { request } from "@/lib/utils/request";
import { type IBlockchainDashboardData } from "@/services/admin.blockchain.service";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { useTranslation } from "@/i18n/i18n_context";
import { CURRENCY_UNIT } from "@/constants/price";
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
    setToastMessage({
      type: "success",
      text: t("admin_blockchain.page.copied"),
    });
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
            challengeToken: token,
          },
        }),
      });
      if (res.success) {
        setToastMessage({
          type: "success",
          text: newState
            ? t("admin_blockchain.page.mining_enabled")
            : t("admin_blockchain.page.mining_disabled"),
        });
        await mutate();
      }
    } catch (e: unknown) {
      setToastMessage({
        type: "error",
        text:
          e instanceof Error
            ? e.message
            : t("admin_blockchain.page.failed_toggle"),
      });
    } finally {
      setIsTogglingMining(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleMintSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(mintAmount);
    if (!amt || amt <= 0) {
      setToastMessage({
        type: "error",
        text: t("admin_blockchain.page.invalid_amount"),
      });
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
            challengeToken: token,
          },
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
        text:
          e instanceof Error
            ? e.message
            : t("admin_blockchain.page.minting_failed"),
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
        <h2 className="text-xl font-bold text-gray-800">
          {t("admin_blockchain.page.connection_failed")}
        </h2>
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
            className={`fixed top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-6 py-3 shadow-lg transition-all ${toastMessage.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"} `}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Network className="h-5 w-5" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
        )}

        <AdminPageHeader
          icon={Network}
          title={t("admin_blockchain.page.title")}
          subtitle={t("admin_blockchain.page.subtitle")}
          rightNode={
            isValidating && !data ? (
              <div className="flex items-center text-sm font-medium text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("admin_blockchain.page.fetching")}
              </div>
            ) : null
          }
        />

        {/* Info: (20260416 - Luphia) Top Metrics Ribbon */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            title={t("admin_blockchain.page.admin_isc")}
            value={
              data
                ? parseFloat(data.adminIscBalance).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : "---"
            }
            unit="ISC"
            icon={Landmark}
            showSmallIcon={false}
            bgIconPosition="top-right"
            containerClassName="bg-white border-gray-200 rounded-2xl"
            titleClassName="text-gray-500"
            valueClassName="text-gray-900 text-2xl font-bold"
          />

          <AdminMetricCard
            title={t("admin_blockchain.page.system_icp")}
            value={
              data
                ? parseFloat(data.systemTotalIcp).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })
                : "---"
            }
            unit={CURRENCY_UNIT.ICP}
            icon={Coins}
            showSmallIcon={false}
            bgIconPosition="top-right"
            containerClassName="bg-white border-gray-200 rounded-2xl"
            titleClassName="text-gray-500"
            valueClassName="text-emerald-600 text-2xl font-bold"
            unitClassName="text-emerald-600/70"
          />

          <AdminMetricCard
            title={t("admin_blockchain.page.member_icp")}
            value={
              data
                ? parseFloat(data.membershipSystemIcpInventory).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 4 },
                  )
                : "---"
            }
            unit={CURRENCY_UNIT.ICP}
            icon={Network}
            colorTheme="emerald"
            showSmallIcon={false}
            bgIconPosition="top-right"
            containerClassName="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white rounded-2xl"
            titleClassName="text-emerald-600/80"
            valueClassName="text-emerald-700 text-2xl font-bold"
            unitClassName="text-emerald-600/70"
          />

          <AdminMetricCard
            title={t("admin_blockchain.page.block_height")}
            value={data ? data.blockHeight.toLocaleString() : "---"}
            unit=""
            icon={Blocks}
            showSmallIcon={false}
            bgIconPosition="top-right"
            containerClassName="bg-white border-gray-200 rounded-2xl"
            titleClassName="text-gray-500"
            valueClassName="text-gray-900 text-2xl font-bold"
          />
        </div>

        {/* Info: (20260416 - Luphia) Main Operations & Treasury Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BlockchainMintForm
              data={data}
              mintAmount={mintAmount}
              setMintAmount={setMintAmount}
              isMinting={isMinting}
              handleMintSubmit={handleMintSubmit}
            />

            <BlockchainMiningStatus
              data={data}
              isTogglingMining={isTogglingMining}
              handleToggleMining={handleToggleMining}
            />

            <BlockchainPeers
              data={data}
              mutate={mutate}
              setToastMessage={setToastMessage}
            />
          </div>

          <div className="lg:col-span-1">
            <BlockchainTreasury data={data} handleCopy={handleCopy} />
          </div>
        </div>

        {/* Info: (20260416 - Luphia) Confirmation Modal */}
        {data && (
          <FidoConfirmModal
            isOpen={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={executeMint}
            title={t("admin_blockchain.page.modal_title")}
            description={t("admin_blockchain.page.modal_desc")}
            isProcessing={isMinting}
            disabled={parseFloat(data.adminIscBalance) < estimatedIscCost}
            alertNode={
              parseFloat(data.adminIscBalance) < estimatedIscCost ? (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <Network className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {t("admin_blockchain.page.insufficient_prefix")}{" "}
                    {estimatedIscCost}
                    {t("admin_blockchain.page.insufficient_mid")}{" "}
                    {data.adminIscBalance} ISC.
                  </p>
                </div>
              ) : null
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                {t("admin_blockchain.page.mint_amount")}
              </span>
              <span className="font-bold text-emerald-600">
                +{mintAmount} ICP
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                {t("admin_blockchain.page.mint_est_days")}
              </span>
              <span className="font-bold text-gray-700">
                ~
                {data.totalMembers > 0 && parseFloat(mintAmount) > 0
                  ? Math.floor(parseFloat(mintAmount) / (data.totalMembers * 5))
                  : "0"}{" "}
                {t("admin_blockchain.page.days")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                {t("admin_blockchain.page.col_rate")}
              </span>
              <span className="text-gray-700">{data.collateralRate}</span>
            </div>
            <div className="my-2 h-px bg-gray-200" />
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                {t("admin_blockchain.page.total_deduction")}
              </span>
              <span className="font-bold text-red-500">
                -
                {estimatedIscCost.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}{" "}
                ISC
              </span>
            </div>
          </FidoConfirmModal>
        )}
      </div>
    </div>
  );
}
