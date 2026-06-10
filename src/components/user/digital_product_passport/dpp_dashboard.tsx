"use client";

import { useTranslation } from "@/i18n/i18n_context";
import { useRouter } from "next/navigation";
import {
  FileText,
  PlusCircle,
  Factory,
  PackageOpen,
  Search,
  Loader2,
  PlayCircle,
} from "lucide-react";
import ConfirmModal from "@/components/common/confirm_modal";
import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import {
  IDigitalProductPassportSku,
  IDigitalProductPassportBatch,
} from "@/interfaces/dpp";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { useAuth } from "@/contexts/auth_context";
import AuthPlaceholder from "@/components/common/auth_placeholder";

export default function DppDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [skus, setSkus] = useState<IDigitalProductPassportSku[]>([]);
  const [batches, setBatches] = useState<IDigitalProductPassportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sku" | "batch">("sku");

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchData = async () => {
      try {
        const [skusRes, batchesRes] = await Promise.all([
          request<IApiResponse<IDigitalProductPassportSku[]>>(
            "/api/v1/user/dpp/sku",
          ),
          request<IApiResponse<IDigitalProductPassportBatch[]>>(
            "/api/v1/user/dpp/batch",
          ),
        ]);
        if (skusRes.success && skusRes.payload) {
          setSkus(skusRes.payload);
        }
        if (batchesRes.success && batchesRes.payload) {
          setBatches(batchesRes.payload);
        }
      } catch (e) {
        console.error("Failed to fetch DPP data", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;

  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const filteredSkus = skus.filter(
    (sku) =>
      sku.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.gtin.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredBatches = batches.filter(
    (batch) =>
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.skuName &&
        batch.skuName.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const totalPages = Math.ceil(
    (activeTab === "sku" ? filteredSkus.length : filteredBatches.length) /
      itemsPerPage,
  );

  const paginatedData =
    activeTab === "sku"
      ? filteredSkus.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage,
        )
      : filteredBatches.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage,
        );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const skuColumns: IDataTableColumn<IDigitalProductPassportSku>[] = [
    {
      key: "name",
      label: t("digital_product_passport.sku_name"),
      render: (row) => (
        <span className="line-clamp-1 font-semibold text-gray-900">
          {row.name}
        </span>
      ),
    },
    {
      key: "accountBookName",
      label: t("digital_product_passport.company_name"),
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.accountBookName || "-"}
        </span>
      ),
    },
    {
      key: "gtin",
      label: t("digital_product_passport.gtin"),
      render: (row) => (
        <span className="font-mono text-xs text-gray-900">{row.gtin}</span>
      ),
    },
    {
      key: "status",
      label: t("common.status"),
      render: (row) => (
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap ${row.status === "READY" ? "bg-emerald-100 text-emerald-700" : row.status === "INCOMPLETE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
        >
          {t(`digital_product_passport.sku_diagnostics.status.${row.status}`)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: () => (
        <div className="text-xs font-semibold text-blue-600 transition hover:text-blue-800">
          {t("digital_product_passport.sku_diagnostics.title")} &rarr;
        </div>
      ),
    },
  ];

  const batchColumns: IDataTableColumn<IDigitalProductPassportBatch>[] = [
    {
      key: "batchNumber",
      label: t("digital_product_passport.batch_creation.batch_number"),
      render: (row) => (
        <span className="font-mono font-semibold text-gray-900">
          {row.batchNumber}
        </span>
      ),
    },
    {
      key: "skuName",
      label: t("digital_product_passport.sku_name"),
      render: (row) => (
        <span className="line-clamp-1 text-gray-600">{row.skuName || "-"}</span>
      ),
    },
    {
      key: "facilitySite",
      label: t("digital_product_passport.batch_creation.facility_site"),
      render: (row) => (
        <span className="text-gray-600">{row.facilitySite}</span>
      ),
    },
    {
      key: "manufactureDate",
      label: t("digital_product_passport.batch_creation.manufacture_date"),
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.manufactureDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <a
          href={row.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-blue-600 transition hover:text-blue-800"
          onClick={(e) => e.stopPropagation()}
        >
          {t("digital_product_passport.view_passport")} &rarr;
        </a>
      ),
    },
  ];

  return (
    <div className="w-full space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("digital_product_passport.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("digital_product_passport.description")}
          </p>
        </div>
        {user && (
          <button
            onClick={() => router.push("/user/dpp-demo/list")}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-105 hover:shadow-md focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
          >
            <PlayCircle className="h-5 w-5" />
            體驗 AI 數位護照 Demo
          </button>
        )}
      </div>

      {user ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Info: (20260513 - Luphia) SKU Definition Card */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/digital_product_passport/sku/create`);
                }
              }}
              onClick={() =>
                router.push(`/digital_product_passport/sku/create`)
              }
              className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {t("digital_product_passport.define_sku")}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("digital_product_passport.define_sku_desc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-sm font-semibold text-blue-600">
                <PlusCircle className="mr-2 h-4 w-4" />{" "}
                {t("digital_product_passport.create_sku")}
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(`/digital_product_passport/batch/create`);
                }
              }}
              onClick={() => {
                router.push(`/digital_product_passport/batch/create`);
              }}
              className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
                  <Factory className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {t("digital_product_passport.batch_production")}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("digital_product_passport.batch_production_desc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-sm font-semibold text-emerald-600">
                <PackageOpen className="mr-2 h-4 w-4" />{" "}
                {t("digital_product_passport.issue_batch")}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-6">
                <button
                  className={`pb-2 text-lg font-bold transition-colors ${activeTab === "sku" ? "border-b-2 border-blue-600 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => {
                    setActiveTab("sku");
                    setCurrentPage(1);
                    setSearchTerm("");
                  }}
                >
                  SKU
                </button>
                <button
                  className={`pb-2 text-lg font-bold transition-colors ${activeTab === "batch" ? "border-b-2 border-blue-600 text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                  onClick={() => {
                    setActiveTab("batch");
                    setCurrentPage(1);
                    setSearchTerm("");
                  }}
                >
                  {t("digital_product_passport.title")}
                </button>
              </div>
              <div className="relative w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  aria-label={t("common.search")}
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  placeholder={t("common.search")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            {activeTab === "sku" ? (
              <DataTable<IDigitalProductPassportSku>
                columns={skuColumns}
                data={paginatedData as IDigitalProductPassportSku[]}
                loading={isLoading}
                rowKey={(row) => row.id}
                onRowClick={(row) =>
                  router.push(`/digital_product_passport/sku/${row.id}`)
                }
                emptyStateText={
                  searchTerm
                    ? t("common.no_data")
                    : t("digital_product_passport.no_recent_skus")
                }
                pagination={{
                  page: currentPage,
                  limit: itemsPerPage,
                  totalPages: totalPages,
                  totalElements: filteredSkus.length,
                }}
                onPageChange={handlePageChange}
              />
            ) : (
              <DataTable<IDigitalProductPassportBatch>
                columns={batchColumns}
                data={paginatedData as IDigitalProductPassportBatch[]}
                loading={isLoading}
                rowKey={(row) => row.id}
                emptyStateText={
                  searchTerm ? t("common.no_data") : t("common.no_data")
                }
                pagination={{
                  page: currentPage,
                  limit: itemsPerPage,
                  totalPages: totalPages,
                  totalElements: filteredBatches.length,
                }}
                onPageChange={handlePageChange}
              />
            )}
          </div>

          <ConfirmModal
            isOpen={isAlertOpen}
            onClose={() => setIsAlertOpen(false)}
            title={t("common.notification")}
            message={t("digital_product_passport.select_sku_for_batch")}
          />
        </>
      ) : (
        <AuthPlaceholder
          title={t("digital_product_passport.login_to_use")}
          buttonLabel={t("header.login")}
        />
      )}
    </div>
  );
}
