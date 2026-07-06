"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  MoreVertical,
  Building,
  Rocket,
  Sparkles,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";
import CompanySearchInput, {
  ICompany,
} from "@/components/common/company_search_input";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import AuthPlaceholder from "@/components/common/auth_placeholder";

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
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<IDemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [activeYearMap, setActiveYearMap] = useState<Record<string, string>>(
    {},
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<ICompany | null>(null);
  const [selectedYear, setSelectedYear] = useState("2025");

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
      message: t("digital_product_passport.list.delete_confirm_message", {
        name,
        year,
      }),
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
        } finally {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchItems();
    }
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col space-y-6 px-4 py-8 font-sans text-gray-900 select-none md:space-y-8 md:px-6 md:py-12"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("digital_product_passport.list.simulator_title")}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("digital_product_passport.list.simulator_desc")}
          </p>
        </div>
      </div>

      {!user ? (
        <AuthPlaceholder
          title={t("digital_product_passport.list.login_to_use")}
          buttonLabel={t("header.login")}
        />
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-orange-50 text-orange-200 ring-8 ring-orange-50/50">
                <Building className="h-12 w-12" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">
                {t("digital_product_passport.list.no_simulations")}
              </h2>
              <p className="mb-8 max-w-xs text-sm text-gray-400">
                {t("digital_product_passport.start.initialize_simulation")}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition-all hover:scale-105 hover:bg-orange-700 active:scale-95 md:px-8 md:py-3 md:text-base"
              >
                <Plus className="h-5 w-5" />
                {t("digital_product_passport.list.create_simulation")}
              </button>
            </div>
          ) : (
            <div className="grid items-start gap-4 p-4 md:grid-cols-2 md:gap-6 md:p-6 xl:grid-cols-3">
              {/* Info: (20260706 - Luphia) Create New Simulation Card */}
              <button
                onClick={() => {
                  setSearchKeyword("");
                  setSelectedCompany(null);
                  setSelectedYear("2025");
                  setIsCreateModalOpen(true);
                }}
                className="group flex h-full min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4 transition-all hover:border-orange-200 hover:bg-orange-50/30 md:min-h-[160px] md:p-5"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100 md:mb-3 md:h-12 md:w-12">
                  <Plus className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-orange-700 md:text-sm">
                  {t("digital_product_passport.list.create_simulation")}
                </span>
              </button>

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
                  className="flex flex-col rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:border-orange-200 hover:shadow-md md:p-5"
                >
                  <div className="mb-3 flex items-center justify-between pb-2 md:mb-4">
                    <div className="flex items-center gap-3 md:gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-600 shadow-sm md:h-11 md:w-11">
                        <Building className="h-5 w-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="line-clamp-1 text-[16px] font-bold text-slate-800 md:text-[17px]">
                          {group.name}
                        </h3>
                        <span className="text-xs font-medium text-slate-500 md:text-sm">
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
                          <div className="custom-scrollbar mb-3 flex flex-nowrap gap-2 overflow-x-auto scroll-smooth border-b border-slate-100 pb-2 md:mb-4 md:pb-3">
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
                                      ? "border border-orange-100/50 bg-orange-50 text-orange-700 shadow-sm"
                                      : "border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                  }`}
                                >
                                  {item.year}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mb-3 space-y-2.5 md:mb-4">
                            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold md:text-xs">
                              <span className="shrink-0 text-slate-400">
                                {t(
                                  "digital_product_passport.list.simulation_progress",
                                )}
                              </span>
                              <div className="flex min-w-0 items-center justify-end gap-1.5 md:gap-2">
                                <span
                                  className={`truncate ${
                                    activeItem.progress.hasFin &&
                                    activeItem.progress.hasEsg &&
                                    activeItem.progress.hasPersonaHtml
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {activeItem.progress.hasFin &&
                                  activeItem.progress.hasEsg &&
                                  activeItem.progress.hasPersonaHtml
                                    ? t("common.status_completed")
                                    : t("common.processing")}
                                </span>

                                <div className="relative shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(
                                        openDropdownId === activeItem.id
                                          ? null
                                          : activeItem.id,
                                      );
                                    }}
                                    className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                  </button>
                                  {openDropdownId === activeItem.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setOpenDropdownId(null)}
                                        role="button"
                                        tabIndex={-1}
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            setOpenDropdownId(null);
                                          }
                                        }}
                                        aria-label="Close dropdown"
                                      />
                                      <div className="absolute top-full right-0 z-20 mt-1 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownId(null);
                                            handleDelete(
                                              activeItem.stockId,
                                              activeItem.year,
                                              activeItem.name,
                                            );
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          {t("common.delete")}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`h-1.5 flex-1 rounded-full ${activeItem.progress.hasFin ? "bg-emerald-500" : "bg-slate-100"}`}
                              />
                              <div
                                className={`h-1.5 flex-1 rounded-full ${activeItem.progress.hasEsg ? "bg-emerald-500" : "bg-slate-100"}`}
                              />
                              <div
                                className={`h-1.5 flex-1 rounded-full ${activeItem.progress.hasPersonaHtml ? "bg-emerald-500" : "bg-slate-100"}`}
                              />
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${activeItem.progress.hasFin ? "border border-emerald-100/50 bg-emerald-50 text-emerald-700" : "border border-amber-100/50 bg-amber-50 text-amber-700"}`}
                            >
                              {activeItem.progress.hasFin ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {activeItem.year}{" "}
                              {activeItem.progress.hasFin
                                ? t("digital_product_passport.list.has_data")
                                : t("digital_product_passport.list.no_data")}
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              router.push(
                                `/digital_product_passport_simulator/start?stockId=${activeItem.stockId}&year=${activeItem.year}`,
                              )
                            }
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-600 bg-orange-50/50 px-3 py-2.5 text-sm font-bold text-orange-700 shadow-sm transition-all hover:bg-orange-600 hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                            {t(
                              "digital_product_passport.list.enter_data_center",
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText || t("common.confirm")}
        cancelText={modalConfig.cancelText || t("common.cancel")}
        onConfirm={modalConfig.onConfirm}
      />

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setIsCreateModalOpen(false)}
            role="button"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setIsCreateModalOpen(false);
              }
            }}
            aria-label="Close modal"
          ></div>
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
              <Rocket className="h-5 w-5 text-orange-600" />
              {t("digital_product_passport.start.initialize_simulation")}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {t("digital_product_passport.start.target_enterprise_label")}
                </label>
                <CompanySearchInput
                  value={searchKeyword}
                  onChange={(v) => {
                    setSearchKeyword(v);
                    setSelectedCompany(null);
                  }}
                  onSelect={setSelectedCompany}
                  placeholder={t(
                    "digital_product_passport.start.search_company_placeholder",
                  )}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {t("digital_product_passport.start.simulation_year")}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="2025">
                    {t("digital_product_passport.list.demo_data_base")}
                  </option>
                  <option value="2024">
                    {t("digital_product_passport.list.last_year")}
                  </option>
                  <option value="2023">
                    {t("digital_product_passport.list.previous_year")}
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t("common.cancel")}
              </button>
              <button
                disabled={!searchKeyword}
                onClick={() => {
                  const targetId = selectedCompany?.taxId || searchKeyword;
                  router.push(
                    `/digital_product_passport_simulator/start?stockId=${targetId}&year=${selectedYear}&action=generate`,
                  );
                }}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {t("digital_product_passport.start.start_simulation")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
