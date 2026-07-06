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
      className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-6 py-12 font-sans text-gray-900 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full space-y-4 lg:space-y-12">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("digital_product_passport.list.simulator_title")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("digital_product_passport.list.simulator_desc")}
            </p>
          </div>
          {user && (
            <div className="shrink-0">
              <button
                onClick={() => {
                  setSearchKeyword("");
                  setSelectedCompany(null);
                  setSelectedYear("2025");
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-orange-500 hover:to-orange-400 hover:shadow-lg active:scale-95"
              >
                <Plus className="h-4 w-4" />
                {t("digital_product_passport.list.create_simulation")}
              </button>
            </div>
          )}
        </div>

        {!user ? (
          <AuthPlaceholder
            title={t("digital_product_passport.list.login_to_use")}
            buttonLabel={t("header.login")}
          />
        ) : (
          <>
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-1 items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/50 px-6 py-20 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-orange-100 blur-2xl" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl ring-1 ring-gray-100">
                      <Building className="h-12 w-12 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {t("digital_product_passport.list.no_simulations")}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-gray-500">
                    {t(
                      "digital_product_passport.list.simulator_no_simulations_desc",
                    )}
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-8 flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-orange-500 hover:shadow-orange-200 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    {t("digital_product_passport.list.create_simulation")}
                  </button>
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
                                      {item.year}{" "}
                                      {t(
                                        "digital_product_passport.list.year_unit",
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex flex-col gap-4 rounded-xl border border-slate-100/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50/80">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-700">
                                    {t(
                                      "digital_product_passport.list.simulation_status",
                                    )}
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
                                          onClick={() =>
                                            setOpenDropdownId(null)
                                          }
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
                                          aria-label={t("common.close")}
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
                                          )}
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
                                      "digital_product_passport.sidebar.product_catalog",
                                    )}
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
                                  )}
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
          </>
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsCreateModalOpen(false)}
            aria-hidden="true"
          ></div>
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
              <Rocket className="h-5 w-5 text-orange-600" />
              {t("digital_product_passport.start.initialize_simulation")}
            </h2>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {t("digital_product_passport.start.search_company")}
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
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-orange-500 hover:to-orange-400 disabled:opacity-50"
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
