"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Plus,
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
      const res = await request<IApiResponse<IDemoItem[]>>(
        "/api/v1/digital_product_passport_simulator/list",
      );
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
      title: t("digital_product_passport.list.delete_confirm_title"),
      message: t("digital_product_passport.list.delete_confirm_message")
        .replace("{{name}}", name)
        .replace("{{year}}", year),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      onConfirm: async () => {
        try {
          setLoading(true);
          await fetch("/api/v1/digital_product_passport_simulator/list", {
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
            message: t("digital_product_passport.list.delete_failed"),
            confirmText: t("common.confirm"),
            cancelText: undefined,
            onConfirm: undefined,
          });
          setLoading(false);
        }
      },
    });
  };

  const handleDownloadCsv = async (item: IDemoItem) => {
    try {
      setLoading(true);
      const filePath = `data/${item.stockId}/${item.year}/outputs/mock_sources/boms_and_precursors.json`;
      const res = await fetch(
        `/api/dpp/files?action=serve&path=${encodeURIComponent(filePath)}`,
      );
      if (!res.ok) {
        throw new Error("BOM file not found");
      }
      const bomData = await res.json();

      const rows = [
        "Product ID,Product Name,Material/Component,Supplier,Country of Origin",
      ];
      if (bomData.products && Array.isArray(bomData.products)) {
        bomData.products.forEach(
          (product: {
            productId: string;
            productName: string;
            bom?: {
              precursorName: string;
              supplierName: string;
              countryOfOrigin: string;
            }[];
          }) => {
            if (product.bom && Array.isArray(product.bom)) {
              product.bom.forEach(
                (component: {
                  precursorName: string;
                  supplierName: string;
                  countryOfOrigin: string;
                }) => {
                  rows.push(
                    `${product.productId},${product.productName},${component.precursorName},${component.supplierName},${component.countryOfOrigin}`,
                  );
                },
              );
            }
          },
        );
      }

      const csvContent = rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Bill_Of_Materials_${item.stockId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: t("common.error"),
        message:
          t("digital_product_passport.start.unknown_error") ||
          "Failed to download CSV",
      });
    } finally {
      setLoading(false);
    }
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
            {t("digital_product_passport.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("digital_product_passport.description")}
          </p>
        </div>
        <button
          onClick={() =>
            router.push("/digital_product_passport_simulator/start")
          }
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t("digital_product_passport.create_sku")}
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
              {t("digital_product_passport.no_recent_skus")}
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
                  <div className="flex w-full flex-1 flex-col justify-center overflow-x-auto rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-start">
                    <div className="flex w-max items-center gap-2 text-xs font-semibold text-gray-500 sm:gap-4">
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasFin ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        {t("digital_product_passport.sidebar.mode_accounting")}
                      </div>
                      <div className="h-px w-2 bg-gray-300 sm:w-4" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasEsg ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        {t("digital_product_passport.sidebar.mode_carbon")}
                      </div>
                      <div className="h-px w-2 bg-gray-300 sm:w-4" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasPersonaHtml ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        {t("digital_product_passport.sidebar.mode_business")}
                      </div>
                      <div className="h-px w-2 bg-gray-300 sm:w-4" />
                      <div className="flex items-center gap-1.5">
                        {item.progress.hasBom ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        {t("digital_product_passport.sidebar.mode_catalog")
                          .replace("生成", "")
                          .replace(" (BOM)", "")}
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
                            `/digital_product_passport_simulator/start?stockId=${item.stockId}&year=${item.year}&action=view`,
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
                            `/digital_product_passport_simulator/start?stockId=${item.stockId}&year=${item.year}&action=extrapolate`,
                          )
                        }
                        className="flex items-center justify-center rounded-lg p-2 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-500"
                      >
                        <Wand2 className="h-5 w-5" />
                      </button>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {t("digital_product_passport.list.esg_extrapolate")}
                      </div>
                    </div>

                    <div className="group relative">
                      <button
                        onClick={() => handleDownloadCsv(item)}
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
                            `/digital_product_passport_simulator/start?stockId=${item.stockId}&year=${item.year}&action=regenerate`,
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
