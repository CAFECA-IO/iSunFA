"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import ConfirmModal from "@/components/common/confirm_modal";
import {
  Database,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";

interface ICoefficientData {
  id: string;
  name: string;
  description: string;
  unit: string;
  emissionFactor: string;
  source: string;
  category: string;
  versionYear: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CarbonEmissionDatabasePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [coefficients, setCoefficients] = useState<ICoefficientData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  // Info: (20260608 - Luphia) Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("ALL");

  // Info: (20260608 - Luphia) Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoefficient, setEditingCoefficient] =
    useState<ICoefficientData | null>(null);
  const [importing, setImporting] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm?: () => void,
    cancelText?: string,
  ) => {
    setConfirmState({ isOpen: true, title, message, onConfirm, cancelText });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "",
    emissionFactor: "",
    source: "",
    category: "STANDARD",
    versionYear: "",
    isVerified: true,
  });

  const fetchCoefficients = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (searchQuery) query.append("search", searchQuery);
      if (categoryFilter !== "ALL") query.append("category", categoryFilter);
      if (verifiedFilter !== "ALL") {
        query.append(
          "isVerified",
          verifiedFilter === "VERIFIED" ? "true" : "false",
        );
      }

      const res = await request<{
        payload: {
          data: ICoefficientData[];
          pagination: {
            page: number;
            limit: number;
            totalElements: number;
            totalPages: number;
          };
        };
      }>(`/api/v1/admin/carbon_emission_database?${query.toString()}`);

      if (res.payload) {
        setCoefficients(res.payload.data);
        setPagination(res.payload.pagination);
      }
    } catch (e) {
      console.error("Failed to load coefficients:", e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, categoryFilter, verifiedFilter]);

  useEffect(() => {
    fetchCoefficients();
  }, [fetchCoefficients]);

  // Info: (20260608 - Luphia) Handle Search and Filters reset page
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val);
    setPage(1);
  };

  const handleVerifiedFilterChange = (val: string) => {
    setVerifiedFilter(val);
    setPage(1);
  };

  const handleOpenModal = (coef?: ICoefficientData) => {
    if (coef) {
      setEditingCoefficient(coef);
      setFormData({
        name: coef.name,
        description: coef.description || "",
        unit: coef.unit,
        emissionFactor: String(coef.emissionFactor),
        source: coef.source || "",
        category: coef.category || "STANDARD",
        versionYear: coef.versionYear || "",
        isVerified: coef.isVerified,
      });
    } else {
      setEditingCoefficient(null);
      setFormData({
        name: "",
        description: "",
        unit: "",
        emissionFactor: "",
        source: "",
        category: "STANDARD",
        versionYear: new Date().getFullYear().toString(),
        isVerified: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (
      !formData.name ||
      !formData.unit ||
      !formData.emissionFactor ||
      !formData.source
    ) {
      alert(t("admin_carbon_emission_database.required_fields"));
      return;
    }

    try {
      const payload = {
        ...formData,
        emissionFactor: parseFloat(formData.emissionFactor),
        versionYear: formData.versionYear || null,
      };

      if (editingCoefficient) {
        await request(
          `/api/v1/admin/carbon_emission_database/${editingCoefficient.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
      } else {
        await request(`/api/v1/admin/carbon_emission_database`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchCoefficients();
    } catch (e) {
      console.error("Failed to save coefficient:", e);
      showConfirm(
        t("admin_carbon_emission_database.error"),
        t("admin_carbon_emission_database.save_error"),
      );
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      t("admin_carbon_emission_database.delete_confirm_title"),
      t("admin_carbon_emission_database.delete_confirm_message"),
      async () => {
        try {
          await request(`/api/v1/admin/carbon_emission_database/${id}`, {
            method: "DELETE",
          });
          fetchCoefficients();
        } catch (e) {
          console.error("Failed to delete coefficient:", e);
          showConfirm(
            t("admin_carbon_emission_database.error"),
            t("admin_carbon_emission_database.delete_error"),
          );
        }
      },
      t("common.cancel", { defaultValue: "取消" }),
    );
  };

  const toggleVerifyStatus = async (coef: ICoefficientData) => {
    try {
      await request(`/api/v1/admin/carbon_emission_database/${coef.id}`, {
        method: "PUT",
        body: JSON.stringify({ isVerified: !coef.isVerified }),
      });
      fetchCoefficients();
    } catch (e) {
      console.error("Failed to toggle verification status:", e);
    }
  };

  const handleImport = async () => {
    showConfirm(
      t("admin_carbon_emission_database.import_confirm_title"),
      t("admin_carbon_emission_database.import_confirm_message"),
      async () => {
        setImporting(true);
        try {
          const res = await request<{
            payload: { count: number };
          }>("/api/v1/admin/carbon_emission_database/import", {
            method: "POST",
          });

          showConfirm(
            t("admin_carbon_emission_database.import_success_title"),
            t("admin_carbon_emission_database.import_success_message", {
              count: res.payload?.count || 0,
            }),
          );
          fetchCoefficients();
        } catch (e) {
          console.error("Failed to import constants:", e);
          showConfirm(
            t("admin_carbon_emission_database.error"),
            t("admin_carbon_emission_database.import_error"),
          );
        } finally {
          setImporting(false);
        }
      },
      t("common.cancel", { defaultValue: "取消" }),
    );
  };

  const columns: IDataTableColumn<ICoefficientData>[] = [
    {
      key: "name",
      label: t("admin_carbon_emission_database.name"),
      render: (record) => (
        <div className="flex max-w-xs flex-col whitespace-normal sm:max-w-md">
          <span className="text-sm font-medium text-gray-900">
            {record.name}
          </span>
          {record.description && (
            <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">
              {record.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "emissionFactor",
      label: t("admin_carbon_emission_database.ef"),
      render: (record) => (
        <span className="rounded bg-orange-50 px-2 py-1 font-mono text-sm font-semibold text-orange-600">
          {record.emissionFactor}
        </span>
      ),
    },
    {
      key: "unit",
      label: t("admin_carbon_emission_database.unit"),
      render: (record) => (
        <span className="font-mono text-xs text-gray-500">{record.unit}</span>
      ),
    },
    {
      key: "category",
      label: t("admin_carbon_emission_database.category"),
      render: (record) => {
        const isStandard = record.category === "STANDARD";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isStandard
                ? "bg-blue-50 text-blue-700"
                : "bg-purple-50 text-purple-700"
            }`}
          >
            {isStandard ? "STANDARD" : record.category}
          </span>
        );
      },
    },
    {
      key: "versionYear",
      label: t("admin_carbon_emission_database.version_year"),
      render: (record) => (
        <span className="font-mono text-xs text-gray-500">
          {record.versionYear || "-"}
        </span>
      ),
    },
    {
      key: "source",
      label: t("admin_carbon_emission_database.source"),
      render: (record) => (
        <span
          className="block max-w-[150px] truncate text-xs text-gray-500"
          title={record.source}
        >
          {record.source}
        </span>
      ),
    },
    {
      key: "isVerified",
      label: t("admin_carbon_emission_database.status"),
      render: (record) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleVerifyStatus(record);
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors ${
            record.isVerified
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {record.isVerified ? (
            <>
              <CheckCircle className="h-3 w-3 shrink-0" />{" "}
              {t("admin_carbon_emission_database.verified")}
            </>
          ) : (
            t("admin_carbon_emission_database.pending")
          )}
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (record) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(record);
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminPageHeader
            icon={Database}
            iconColorClass="text-orange-500"
            title={t("admin_carbon_emission_database.title")}
            subtitle={t("admin_carbon_emission_database.subtitle")}
          />
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw
                className={`h-4.5 w-4.5 ${importing ? "animate-spin" : ""}`}
              />
              {importing
                ? t("admin_carbon_emission_database.importing")
                : t("admin_carbon_emission_database.import_constants")}
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 sm:w-auto"
            >
              <Plus size={18} />
              {t("admin_carbon_emission_database.add_coefficient")}
            </button>
          </div>
        </div>

        {/* Info: (20260608 - Luphia) Combined Unified Filter Panel & Data Table Card */}
        <div className="flex flex-col gap-4">
          {/* Info: (20260608 - Luphia) Filter Panel */}
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-4 sm:items-center">
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t(
                  "admin_carbon_emission_database.search_placeholder",
                )}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-9 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
              />
            </div>

            <div>
              <select
                aria-label={t("admin_carbon_emission_database.category")}
                value={categoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
              >
                <option value="ALL">
                  {t("admin_carbon_emission_database.all_categories")}
                </option>
                <option value="STANDARD">STANDARD</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>

            <div>
              <select
                aria-label={t("admin_carbon_emission_database.status")}
                value={verifiedFilter}
                onChange={(e) => handleVerifiedFilterChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
              >
                <option value="ALL">
                  {t("admin_carbon_emission_database.all_status")}
                </option>
                <option value="VERIFIED">
                  {t("admin_carbon_emission_database.verified")}
                </option>
                <option value="PENDING">
                  {t("admin_carbon_emission_database.pending")}
                </option>
              </select>
            </div>
          </div>

          {/* Info: (20260608 - Luphia) Data Table */}
          <DataTable<ICoefficientData>
            columns={columns}
            data={coefficients}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyStateText={t("admin_carbon_emission_database.empty_state")}
            rowKey={(record) => record.id}
          />
        </div>
      </div>

      {/* Info: (20260608 - Luphia) Creation/Edit Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsModalOpen(false)}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-lg leading-6 font-medium text-gray-900"
                  >
                    {editingCoefficient
                      ? t("admin_carbon_emission_database.edit_coefficient")
                      : t("admin_carbon_emission_database.add_coefficient")}
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                    >
                      <X size={20} />
                    </button>
                  </DialogTitle>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="coef-name"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        {t("admin_carbon_emission_database.name")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="coef-name"
                        type="text"
                        placeholder={t(
                          "admin_carbon_emission_database.name_placeholder",
                        )}
                        className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="coef-factor"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          {t("admin_carbon_emission_database.ef")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="coef-factor"
                          type="number"
                          step="any"
                          placeholder={t(
                            "admin_carbon_emission_database.ef_placeholder",
                          )}
                          className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                          value={formData.emissionFactor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              emissionFactor: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="coef-unit"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          {t("admin_carbon_emission_database.unit")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="coef-unit"
                          type="text"
                          placeholder={t(
                            "admin_carbon_emission_database.unit_placeholder",
                          )}
                          className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                          value={formData.unit}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              unit: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="coef-category"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          {t("admin_carbon_emission_database.category")}
                        </label>
                        <select
                          id="coef-category"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              category: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value="STANDARD">STANDARD</option>
                          <option value="CUSTOM">CUSTOM</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="coef-year"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          {t("admin_carbon_emission_database.version_year")}
                        </label>
                        <input
                          id="coef-year"
                          type="text"
                          placeholder={t(
                            "admin_carbon_emission_database.version_year_placeholder",
                          )}
                          className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                          value={formData.versionYear}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              versionYear: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="coef-source"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        {t("admin_carbon_emission_database.source")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="coef-source"
                        type="text"
                        placeholder={t(
                          "admin_carbon_emission_database.source_placeholder",
                        )}
                        className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        value={formData.source}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            source: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="coef-desc"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        {t("admin_carbon_emission_database.description")}
                      </label>
                      <textarea
                        id="coef-desc"
                        rows={3}
                        placeholder={t(
                          "admin_carbon_emission_database.description_placeholder",
                        )}
                        className="w-full resize-none rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isVerified"
                        checked={formData.isVerified}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isVerified: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <label
                        htmlFor="isVerified"
                        className="cursor-pointer text-sm text-gray-700 select-none"
                      >
                        {t("admin_carbon_emission_database.verified_checkbox")}
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-lg border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                      onClick={() => setIsModalOpen(false)}
                    >
                      {t("common.cancel", { defaultValue: "取消" })}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-lg border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 focus:outline-none"
                      onClick={handleSave}
                    >
                      {t("common.save")}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        cancelText={confirmState.cancelText}
      />
    </div>
  );
}
