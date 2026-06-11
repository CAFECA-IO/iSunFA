"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TestTube2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  DownloadCloud,
  Wand2,
  MoreVertical,
  Building,
  Sparkles,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";
import { useTranslation } from "@/i18n/i18n_context";
import AdminPageHeader from "@/components/admin/common/admin_page_header";

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
  };
  isComplete: boolean;
}

export default function DppListPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<IDemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

      const csvContent = rows.join("\\n");
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
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-6 font-sans">
      <AdminPageHeader
        icon={TestTube2}
        iconColorClass="text-blue-600"
        title={
          t("digital_product_passport.list.simulator_title") ||
          "DPP 模擬資料產生器"
        }
        subtitle={
          t("digital_product_passport.list.simulator_desc") ||
          "透過公開上市櫃公司財報與永續報告書，自動產生具真實感的數位產品護照 (DPP) 模擬數據源，供展示與測試用途。"
        }
        rightNode={
          <button
            onClick={() =>
              router.push("/digital_product_passport_simulator/start")
            }
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t("digital_product_passport.list.create_simulation") ||
              "新增模擬企業"}
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-500">
            <Building className="mb-4 h-16 w-16 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">
              {t("digital_product_passport.list.no_simulations") ||
                "找不到模擬企業。請點擊「新增模擬企業」建立您的第一筆數據。"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="line-clamp-1 text-lg font-bold text-gray-900">
                      {item.name}
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {item.stockId} | {item.year}
                    </span>
                  </div>

                  {/* Progress Badges */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${item.progress.hasFin ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {item.progress.hasFin ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {t("digital_product_passport.sidebar.mode_accounting")}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${item.progress.hasEsg ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {item.progress.hasEsg ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {t("digital_product_passport.sidebar.mode_carbon")}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${item.progress.hasPersonaHtml ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {item.progress.hasPersonaHtml ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {t("digital_product_passport.sidebar.mode_business")}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${item.progress.hasBom ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {item.progress.hasBom ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {t("digital_product_passport.sidebar.mode_catalog")
                        .replace("生成", "")
                        .replace(" (BOM)", "")}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => handleDownloadCsv(item)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    {t("common.download")} CSV
                  </button>
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
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    {t("common.view")}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdownId(
                          openDropdownId === item.id ? null : item.id,
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openDropdownId === item.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenDropdownId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape" || e.key === "Enter") {
                              setOpenDropdownId(null);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={t("common.close") || "Close"}
                        />
                        <div className="absolute right-0 bottom-full z-20 mb-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              router.push(
                                `/digital_product_passport_simulator/start?stockId=${item.stockId}&year=${item.year}&action=extrapolate`,
                              );
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Wand2 className="h-4 w-4 text-indigo-500" />
                            {t("digital_product_passport.list.esg_extrapolate")}
                          </button>
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              router.push(
                                `/digital_product_passport_simulator/start?stockId=${item.stockId}&year=${item.year}&action=regenerate`,
                              );
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            {t("common.regenerate")}
                          </button>
                          <div className="my-1 border-t border-gray-100" />
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleDelete(item.stockId, item.year, item.name);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("common.delete")}
                          </button>
                        </div>
                      </>
                    )}
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
