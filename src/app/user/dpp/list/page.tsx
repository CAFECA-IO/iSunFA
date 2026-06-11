"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Plus,
  PlayCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  DownloadCloud,
  Sparkles,
  Wand2,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";
import { useTranslation } from "@/i18n/i18n_context";

interface IDemoItem {
  id: string;
  stockId: string;
  year: string;
  name: string;
  progress: {
    hasFin: boolean;
    hasEsg: boolean;
    hasPersonaHtml: boolean;
    hasBom?: boolean;
    products?: {
      productId: string;
      productName: string;
      progress: {
        hasSpecs: boolean;
        hasImage: boolean;
        dppGroundTruthFile?: string;
        dppComplianceFile?: string;
      };
    }[];
  };
  isComplete: boolean;
}

export default function DppListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<IDemoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "" });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await request<IApiResponse<IDemoItem[]>>("/api/v1/dpp/list");
      if (res.payload) {
        setItems(res.payload);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (stockId: string, year: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: t("digitalProductPassport.list.delete_confirm_title"),
      message: t("digitalProductPassport.list.delete_confirm_message")
        .replace("{{name}}", name)
        .replace("{{year}}", year),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      onConfirm: async () => {
        try {
          setLoading(true);
          await fetch("/api/v1/dpp/list", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stockId, year }),
          });
          await fetchItems();
        } catch (e) {
          console.error("Delete failed:", e);
          setModalConfig({
            isOpen: true,
            title: t("common.error"),
            message: t("digitalProductPassport.list.delete_failed"),
            confirmText: t("common.confirm"),
            cancelText: undefined,
            onConfirm: undefined,
          });
          setLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 pb-4 font-sans">
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <h1 className="flex items-center text-xl font-bold text-gray-900">
            <Building className="mr-3 h-6 w-6 text-blue-600" />
            {t("digitalProductPassport.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("digitalProductPassport.description")}
          </p>
        </div>
        <button
          onClick={() => router.push("/user/dpp/start")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t("digitalProductPassport.create_sku")}
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
            <Building className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">
              {t("digitalProductPassport.no_recent_skus")}
            </p>
            <p className="mt-1 text-sm"></p>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto p-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-slate-50/30 p-5 transition-colors hover:border-blue-300"
              >
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  {/* Info: (20260609 - Tzuhan) 企業資訊 */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {item.name}{" "}
                      <span className="ml-1 text-sm font-medium text-gray-500">
                        ({item.stockId})
                      </span>
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{item.year}</p>
                  </div>

                  {/* Info: (20260609 - Tzuhan) 進度顯示 */}
                  <div className="flex w-full flex-1 flex-col gap-3 xl:flex-row">
                    <div className="flex-1">
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        {t("digitalProductPassport.list.phase1")}
                      </p>
                      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2 text-xs font-medium text-gray-600 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasFin ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          {t(
                            "digitalProductPassport.list.esg_download",
                          ).replace("ESG", "FIN")}
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasEsg ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              {t("digitalProductPassport.list.esg_download")}
                            </>
                          ) : item.year === "2025" ||
                            (!item.progress.hasEsg &&
                              item.progress.hasPersonaHtml) ? (
                            <>
                              {item.progress.hasPersonaHtml ? (
                                <Sparkles className="h-4 w-4 text-purple-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                              <span
                                className={
                                  item.progress.hasPersonaHtml
                                    ? "text-purple-600"
                                    : ""
                                }
                              >
                                {t(
                                  "digitalProductPassport.list.esg_extrapolate",
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                              {t("digitalProductPassport.list.esg_download")}
                            </>
                          )}
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasPersonaHtml ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          {t("digitalProductPassport.list.company_info")}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="mb-2 text-xs font-semibold text-gray-500">
                        {t("digitalProductPassport.list.phase23")}
                      </p>
                      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-2 text-xs font-medium text-gray-600 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          {item.progress.hasBom ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          {t("digitalProductPassport.sidebar.mode_catalog")
                            .replace("生成", "")
                            .replace(" (BOM)", "")}
                        </div>
                        <div className="h-px w-2 bg-gray-300 sm:w-4" />
                        <div
                          className="flex items-center gap-1.5"
                          title={
                            item.progress.products
                              ? `${t("digitalProductPassport.list.product_count")}${item.progress.products.length}`
                              : ""
                          }
                        >
                          {item.progress.products &&
                          item.progress.products.length > 0 &&
                          item.progress.products.every(
                            (p) =>
                              p.progress.dppGroundTruthFile &&
                              p.progress.dppComplianceFile,
                          ) ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          DPP
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260609 - Tzuhan) 操作按鈕 */}
                  <div className="mt-4 flex w-full items-center gap-2 sm:mt-0 sm:w-auto">
                    <div className="group relative">
                      <button
                        disabled={
                          !item.progress.hasFin &&
                          !item.progress.hasEsg &&
                          !item.progress.hasPersonaHtml
                        }
                        onClick={() =>
                          router.push(
                            `/user/dpp/start?stockId=${item.stockId}&year=${item.year}&action=view`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t("common.view")}
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          handleDelete(item.stockId, item.year, item.name)
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t("common.delete")}
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          router.push(
                            `/user/dpp/start?stockId=${item.stockId}&year=${item.year}&action=extrapolate`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-500"
                      >
                        <Wand2 className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t("digitalProductPassport.list.esg_extrapolate")}
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          router.push(
                            `/user/dpp/start?stockId=${item.stockId}&year=${item.year}&action=redownload`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500"
                      >
                        <DownloadCloud className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t("common.download")}
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() =>
                          router.push(
                            `/user/dpp/start?stockId=${item.stockId}&year=${item.year}&action=regenerate`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-purple-50 hover:text-purple-500"
                      >
                        <Sparkles className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t("common.regenerate")}
                      </div>
                    </div>

                    <button
                      disabled={!item.isComplete}
                      onClick={() => router.push("/user/dpp/workspace")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition sm:flex-none ${
                        item.isComplete
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:scale-105 hover:shadow-md"
                          : "cursor-not-allowed bg-gray-100 text-gray-400"
                      } `}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {t("digitalProductPassport.list.enter_workspace")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText || t("common.confirm")}
        cancelText={modalConfig.cancelText || t("common.cancel")}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
}
