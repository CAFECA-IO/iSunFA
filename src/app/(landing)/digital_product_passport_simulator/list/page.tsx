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
  MoreVertical,
  Building,
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
    hasEsgExtrapolation?: boolean;
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
  const [activeYearMap, setActiveYearMap] = useState<Record<string, string>>(
    {},
  );

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
          <div className="grid items-start gap-6 overflow-y-auto p-6 md:grid-cols-2 xl:grid-cols-3">
            {Object.values(
              items.reduce(
                (acc, item) => {
                  if (!acc[item.stockId]) {
                    acc[item.stockId] = {
                      name: item.name,
                      stockId: item.stockId,
                      years: [],
                    };
                  }
                  acc[item.stockId].years.push(item);
                  return acc;
                },
                {} as Record<
                  string,
                  { name: string; stockId: string; years: IDemoItem[] }
                >,
              ),
            ).map((group) => (
              <div
                key={group.stockId}
                className="flex flex-col rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between pb-2">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 shadow-sm">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="line-clamp-1 text-[17px] font-bold text-slate-800">
                        {group.name}
                      </h3>
                      <span className="text-sm font-medium text-slate-500">
                        {group.stockId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  {(() => {
                    const sortedYears = [...group.years].sort(
                      (a, b) => Number(b.year) - Number(a.year),
                    );
                    const defaultYearItem =
                      sortedYears.find(
                        (y) =>
                          y.progress.hasFin ||
                          y.progress.hasEsg ||
                          y.progress.hasPersonaHtml ||
                          y.progress.hasBom,
                      ) || sortedYears[0];
                    const activeYearId =
                      activeYearMap[group.stockId] || defaultYearItem.id;
                    const activeItem =
                      sortedYears.find((y) => y.id === activeYearId) ||
                      sortedYears[0];

                    return (
                      <>
                        <div className="custom-scrollbar mb-4 flex flex-nowrap gap-2 overflow-x-auto scroll-smooth border-b border-slate-100 pb-3">
                          {sortedYears.map((item) => {
                            const isActive = item.id === activeItem.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() =>
                                  setActiveYearMap((prev) => ({
                                    ...prev,
                                    [group.stockId]: item.id,
                                  }))
                                }
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors ${
                                  isActive
                                    ? "border border-indigo-100/50 bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                }`}
                              >
                                {item.year} 年
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex flex-col gap-4 rounded-xl border border-slate-100/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50/80">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">
                              {t(
                                "digital_product_passport.list.simulation_status",
                              ) || "模擬狀態"}
                            </span>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenDropdownId(
                                    openDropdownId === activeItem.id
                                      ? null
                                      : activeItem.id,
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-600 hover:shadow-sm"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openDropdownId === activeItem.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenDropdownId(null)}
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Escape" ||
                                        e.key === "Enter"
                                      ) {
                                        setOpenDropdownId(null);
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t("common.close") || "Close"}
                                  />
                                  <div className="absolute right-0 bottom-full z-20 mb-2 w-48 rounded-xl border border-slate-200/80 bg-white py-1.5 shadow-lg backdrop-blur-sm">
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleDelete(
                                          activeItem.stockId,
                                          activeItem.year,
                                          activeItem.name,
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      {t("common.delete")}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${activeItem.progress.hasFin ? "border border-emerald-100/50 bg-emerald-50 text-emerald-700" : "border border-amber-100/50 bg-amber-50 text-amber-700"}`}
                            >
                              {activeItem.progress.hasFin ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {t(
                                "digital_product_passport.sidebar.mode_accounting",
                              )}
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${activeItem.progress.hasEsg || activeItem.progress.hasEsgExtrapolation ? "border border-emerald-100/50 bg-emerald-50 text-emerald-700" : "border border-amber-100/50 bg-amber-50 text-amber-700"}`}
                            >
                              {activeItem.progress.hasEsg ||
                              activeItem.progress.hasEsgExtrapolation ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {t(
                                "digital_product_passport.sidebar.mode_carbon",
                              )}
                              {activeItem.progress.hasEsgExtrapolation &&
                                !activeItem.progress.hasEsg && (
                                  <span className="ml-1 rounded-sm border border-purple-200 bg-purple-100 px-1 py-0.5 text-[9px] font-bold text-purple-700">
                                    {t(
                                      "digital_product_passport.simulator.ai_extrapolation",
                                    ) || "✨ AI 推估"}
                                  </span>
                                )}
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${activeItem.progress.hasPersonaHtml ? "border border-emerald-100/50 bg-emerald-50 text-emerald-700" : "border border-amber-100/50 bg-amber-50 text-amber-700"}`}
                            >
                              {activeItem.progress.hasPersonaHtml ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {t(
                                "digital_product_passport.sidebar.mode_business",
                              )}
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${activeItem.progress.hasBom ? "border border-emerald-100/50 bg-emerald-50 text-emerald-700" : "border border-amber-100/50 bg-amber-50 text-amber-700"}`}
                            >
                              {activeItem.progress.hasBom ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {t(
                                "digital_product_passport.sidebar.mode_catalog",
                              )
                                .replace("生成", "")
                                .replace(" (BOM)", "")}
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              router.push(
                                `/digital_product_passport_simulator/start?stockId=${activeItem.stockId}&year=${activeItem.year}`,
                              )
                            }
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-600 bg-indigo-50/50 px-3 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-600 hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                            {t(
                              "digital_product_passport.list.enter_data_center",
                            ) || "進入資料中心"}
                          </button>
                        </div>
                      </>
                    );
                  })()}
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
