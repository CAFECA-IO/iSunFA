"use client";

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { List, UserCircle, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import ConfirmModal from "@/components/common/confirm_modal";
import SuccessNotification from "@/components/common/success_notification";
import { formatDate } from "@/lib/utils/date";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";

// Info: (20260625 - Julian) 訂單操作
const ORDER_ACTIONS = {
  RETRY: "retry",
  REACTIVATE: "reactivate",
  BATCH_REACTIVATE: "batch_reactivate",
} as const;

// Info: (20260625 - Julian) 訂單操作類型
type OrderActionType = (typeof ORDER_ACTIONS)[keyof typeof ORDER_ACTIONS];

// Info: (20260625 - Julian) 訂單 API 路由
const ORDER_API_ROUTES = {
  LIST: (query: string) => `/api/v1/admin/orders?${query}`,
  RETRY: (id: string) => `/api/v1/admin/orders/${id}/retry`,
  BATCH_REACTIVATE: "/api/v1/admin/orders/batch_reactivate",
} as const;

interface IOrderManagementData {
  id: string;
  createdAt: string;
  type: string;
  data: Record<string, unknown> | null;
  amount: number;
  unit: string;
  status: string;
  executionStatus: string;
  executionConfidence: number | null;
  transactionHash: string | null;
  user: {
    name: string | null;
    address: string;
  } | null;
  tokens: number | null;
  paymentTransactions: {
    status: string;
  }[];
}

export default function OrderManagementPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<IOrderManagementData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
    orderIds: string[] | null;
    actionType: OrderActionType | null;
  }>({ isOpen: false, orderId: null, orderIds: null, actionType: null });

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [orders]);

  // Info: (20260625 - Julian) 開啟/關閉批量模式
  const handleToggleBatchMode = () => {
    setIsBatchMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedOrderIds([]);
      }
      return next;
    });
  };

  // Info: (20260625 - Julian) 判斷是否有可重啟的訂單
  const hasReactivatableOrders = orders.some(
    (o) => o.status === ORDER_STATUS.CANCEL || o.status === ORDER_STATUS.FAILED,
  );

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });

  const [successNotif, setSuccessNotif] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });

  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [type, setType] = useState<string>("ALL");
  const [executionStatus, setExecutionStatus] = useState<string>("ALL");
  const [orderStatus, setOrderStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value);
    setPage(1);
  };

  const handleExecutionStatusChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setExecutionStatus(e.target.value);
    setPage(1);
  };

  const handleOrderStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderStatus(e.target.value);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setType("ALL");
    setExecutionStatus("ALL");
    setOrderStatus("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  useEffect(() => {
    let ignore = false;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          search,
          type,
          executionStatus,
          orderStatus,
          sortBy,
          sortOrder,
        });

        const res = await request<{
          payload: {
            data: IOrderManagementData[];
            pagination: {
              page: number;
              limit: number;
              totalElements: number;
              totalPages: number;
            };
          };
        }>(ORDER_API_ROUTES.LIST(query.toString()));

        if (ignore) return;

        if (res.payload) {
          setOrders(res.payload.data);
          setPagination(res.payload.pagination);
        }
      } catch (e) {
        if (!ignore) console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      ignore = true;
    };
  }, [
    page,
    limit,
    search,
    type,
    executionStatus,
    orderStatus,
    sortBy,
    sortOrder,
  ]);

  const handleRetryOrderClick = (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      orderId,
      orderIds: null,
      actionType: ORDER_ACTIONS.RETRY,
    });
  };

  const handleReactivateOrderClick = (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      orderId,
      orderIds: null,
      actionType: ORDER_ACTIONS.REACTIVATE,
    });
  };

  const handleBatchReactivateClick = () => {
    setConfirmModal({
      isOpen: true,
      orderId: null,
      orderIds: selectedOrderIds,
      actionType: ORDER_ACTIONS.BATCH_REACTIVATE,
    });
  };

  // Info: (20260625 - Julian) 處理重試、重新啟用、批量重啟訂單
  const handleExecuteAction = async () => {
    const { orderId, orderIds, actionType } = confirmModal;
    if (!actionType) return;
    setConfirmModal({
      isOpen: false,
      orderId: null,
      orderIds: null,
      actionType: null,
    });

    if (actionType === ORDER_ACTIONS.BATCH_REACTIVATE) {
      if (!orderIds || orderIds.length === 0) return;
      try {
        const res = await request<{
          payload: { successCount: number; failCount: number };
        }>(ORDER_API_ROUTES.BATCH_REACTIVATE, {
          method: "POST",
          body: JSON.stringify({ orderIds }),
        });
        if (res.payload) {
          setSuccessNotif({
            isOpen: true,
            message: t("order_management.table.batch_reactivate_success", {
              success: res.payload.successCount,
              fail: res.payload.failCount,
            }),
          });
          setSelectedOrderIds([]);
          setPage(page);
          window.location.reload();
        }
      } catch (e) {
        console.error(e);
        setAlertModal({
          isOpen: true,
          message: t("order_management.table.batch_reactivate_failed"),
        });
      }
      return;
    }

    if (!orderId) return;

    try {
      const res = await request<{ payload: { success: boolean } }>(
        ORDER_API_ROUTES.RETRY(orderId),
        { method: "POST" },
      );
      if (res.payload?.success) {
        setSuccessNotif({
          isOpen: true,
          message:
            actionType === ORDER_ACTIONS.RETRY
              ? t("order_management.table.retry_success")
              : t("order_management.table.reactivate_success"),
        });
        setPage(page);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      setAlertModal({
        isOpen: true,
        message:
          actionType === ORDER_ACTIONS.RETRY
            ? t("order_management.table.retry_failed")
            : t("order_management.table.reactivate_failed"),
      });
    }
  };

  const columns: IDataTableColumn<IOrderManagementData>[] = [
    // Info: (20260625 - Julian) 開啟批量模式時，才顯示勾選框
    ...(isBatchMode
      ? [
          {
            key: "select",
            label: (
              <input
                type="checkbox"
                checked={
                  orders.length > 0 &&
                  orders
                    .filter(
                      (o) =>
                        o.status === ORDER_STATUS.CANCEL ||
                        o.status === ORDER_STATUS.FAILED,
                    )
                    .every((o) => selectedOrderIds.includes(o.id))
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    const retryableCancelOrders = orders.filter(
                      (o) =>
                        o.status === ORDER_STATUS.CANCEL ||
                        o.status === ORDER_STATUS.FAILED,
                    );
                    setSelectedOrderIds(retryableCancelOrders.map((o) => o.id));
                  } else {
                    setSelectedOrderIds([]);
                  }
                }}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
            ),
            render: (record: IOrderManagementData) => {
              const canReactivate =
                record.status === ORDER_STATUS.CANCEL ||
                record.status === ORDER_STATUS.FAILED;
              if (!canReactivate) return null;
              return (
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(record.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrderIds((prev) => [...prev, record.id]);
                    } else {
                      setSelectedOrderIds((prev) =>
                        prev.filter((id) => id !== record.id),
                      );
                    }
                  }}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              );
            },
          },
        ]
      : []),
    {
      key: "createdAt",
      label: t("order_management.table.date"),
      sortable: true,
      render: (record) => (
        <span className="text-sm text-gray-500">
          {formatDate(record.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "user",
      label: t("order_management.table.user"),
      render: (record) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            {record.user?.name ? (
              record.user.name.substring(0, 2).toUpperCase()
            ) : (
              <UserCircle size={16} />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {record.user?.name || t("order_management.table.unnamed_user")}
            </div>
            <div className="mt-0.5 font-mono text-xs text-gray-400">
              {record.user?.address
                ? `${record.user.address.substring(0, 8)}...`
                : "Unknown"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "orderId",
      label: t("order_management.table.order_id"),
      render: (record) => (
        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
          {record.id}
        </span>
      ),
    },
    {
      key: "type",
      label: t("order_management.table.type"),
      render: (record) => {
        let display = record.type;
        const orderData = record.data as Record<string, unknown>;
        const dataField = orderData?.data as
          | Record<string, unknown>
          | undefined;
        const rawCat = dataField?.category || orderData?.category;

        if (rawCat) {
          const cat = String(rawCat);
          const key = `analysis.categories.${cat.toLowerCase()}`;
          const translated = t(key);
          display = translated !== key ? translated : cat;
        }
        return (
          <span className="text-sm font-medium text-gray-700">{display}</span>
        );
      },
    },
    {
      key: "amount",
      label: t("order_management.table.amount"),
      align: "right",
      sortable: true,
      render: (record) => (
        <span className="text-sm font-medium text-gray-900">
          {record.unit} {record.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "tokens",
      label: t("order_management.table.tokens"),
      align: "right",
      sortable: true,
      render: (record) => (
        <span className="text-sm font-medium text-gray-900">
          {record.tokens ? record.tokens.toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "status",
      label: t("order_management.table.order_status"),
      sortable: true,
      render: (record) => (
        <div className="flex items-center gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              record.status === ORDER_STATUS.PAID ||
              record.status === ORDER_STATUS.COMPLETED
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
            }`}
          >
            {record.status}
          </span>
          {(record.status === ORDER_STATUS.FAILED ||
            record.executionStatus === ORDER_STATUS.FAILED) && (
            <button
              onClick={() => handleRetryOrderClick(record.id)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-500 shadow transition-colors hover:bg-blue-200 focus:outline-none active:translate-y-0.5 active:shadow-none"
              title="Retry Order"
            >
              <RefreshCw size={12} />
              <span>{t("order_management.table.retry")}</span>
            </button>
          )}
          {(record.status === ORDER_STATUS.CANCEL ||
            record.executionStatus === ORDER_STATUS.CANCEL) && (
            <button
              onClick={() => handleReactivateOrderClick(record.id)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-500 shadow transition-colors hover:bg-blue-200 focus:outline-none active:translate-y-0.5 active:shadow-none"
              title="Reactivate Order"
            >
              <RefreshCw size={12} strokeWidth={2.5} />
              <span>{t("order_management.table.reactivate")}</span>
            </button>
          )}
        </div>
      ),
    },
    {
      key: "paymentRecord",
      label: t("order_management.table.payment_record"),
      render: (record) => {
        return (
          <div className="flex flex-col items-center">
            {record.transactionHash ? (
              <span
                className="w-32 truncate rounded bg-gray-100 px-2 py-1 text-center font-mono text-[10px] text-gray-500 md:w-48"
                title={record.transactionHash}
              >
                {record.transactionHash.substring(0, 8)}...
                {record.transactionHash.substring(
                  record.transactionHash.length - 8,
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-400">N/A</span>
            )}
          </div>
        );
      },
    },
    {
      key: "executionStatus",
      label: t("order_management.table.execution_status"),
      render: (record) => {
        let text = t("order_management.table.pending");
        let colorClass = "bg-gray-100 text-gray-600";

        if (record.executionStatus === ORDER_STATUS.COMPLETED) {
          text = t("order_management.table.executed");
          colorClass = "bg-purple-50 text-purple-700";
        } else if (record.executionStatus === ORDER_STATUS.EXECUTING) {
          text = t("order_management.table.processing");
          colorClass = "bg-blue-50 text-blue-700";
        } else if (record.executionStatus === ORDER_STATUS.FAILED) {
          text = t("order_management.table.failed");
          colorClass = "bg-red-50 text-red-700";
        } else if (record.executionStatus === ORDER_STATUS.CANCEL) {
          text = t("common.cancel");
          colorClass = "bg-orange-50 text-orange-700";
        }

        return (
          <div className="flex flex-col">
            <span
              className={`inline-flex w-fit items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colorClass}`}
            >
              {text}
            </span>
          </div>
        );
      },
    },
    {
      key: "executionConfidence",
      label: t("order_management.table.execution_confidence"),
      sortable: true,
      render: (record) => {
        if (record.executionConfidence == null) {
          return <span className="text-xs text-gray-400">N/A</span>;
        }

        let colorClass = "bg-red-50 text-red-700";
        if (record.executionConfidence >= 80)
          colorClass = "bg-emerald-50 text-emerald-700";
        else if (record.executionConfidence >= 60)
          colorClass = "bg-amber-50 text-amber-700";

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colorClass}`}
          >
            {record.executionConfidence}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 md:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={List}
          title={t("order_management.title")}
          subtitle={t("order_management.subtitle")}
        />

        {/* Info: (20260624 - Julian) Filters and Search Panel */}
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-5">
            {/* Info: (20260624 - Julian) Search Input */}
            <div className="col-span-1 flex flex-col gap-1 md:col-span-2">
              <p className="text-xs font-medium text-slate-500">
                {t("order_management.table.user")} &{" "}
                {t("order_management.table.order_id")}
              </p>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex shrink-0 items-center pl-3 text-gray-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder={t(
                    "order_management.table.search_bar_placeholder",
                  )}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-10 text-sm placeholder-gray-400 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute inset-y-0 right-0 flex shrink-0 items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Info: (20260624 - Julian) Type Dropdowns */}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-500">
                {t("order_management.table.type")}
              </p>
              <select
                value={type}
                onChange={handleTypeChange}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value="ALL">{t("common.all")}</option>
                <option value={ORDER_TYPE.ANALYSIS}>
                  {t("analysis.categories.certificate_analysis")}
                </option>
                <option value={ORDER_TYPE.REGISTRATION_REWARD}>
                  {t("order_management.filters.type_reg_reward")}
                </option>
                <option value={ORDER_TYPE.CHECK_IN_REWARD}>
                  {t("order_management.filters.type_check_in_reward")}
                </option>
                <option value={ORDER_TYPE.ADMIN_ISSUED}>
                  {t("order_management.filters.type_admin_issued")}
                </option>
                <option value={ORDER_TYPE.OEN_BINDING}>
                  {t("order_management.filters.type_oen_binding")}
                </option>
                <option value={ORDER_TYPE.OEN_PAYMENT}>
                  {t("order_management.filters.type_oen_payment")}
                </option>
              </select>
            </div>

            {/* Info: (20260624 - Julian) Order Status Dropdowns */}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-500">
                {t("order_management.table.order_status")}
              </p>
              <select
                value={orderStatus}
                onChange={handleOrderStatusChange}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value="ALL">{t("common.all")}</option>
                <option value={ORDER_STATUS.PENDING}>PENDING</option>
                <option value={ORDER_STATUS.PAYING}>PAYING</option>
                <option value={ORDER_STATUS.PAID}>PAID</option>
                <option value={ORDER_STATUS.PAYMENT_FAILED}>
                  PAYMENT_FAILED
                </option>
                <option value={ORDER_STATUS.EXECUTING}>
                  {t("order_management.table.processing")}
                </option>
                <option value={ORDER_STATUS.COMPLETED}>
                  {t("order_management.table.executed")}
                </option>
                <option value={ORDER_STATUS.FAILED}>
                  {t("order_management.table.failed")}
                </option>
                <option value={ORDER_STATUS.MINT_FAILED}>MINT_FAILED</option>
                <option value={ORDER_STATUS.CANCEL}>
                  {t("common.cancel")}
                </option>
              </select>
            </div>

            {/* Info: (20260624 - Julian) Execution Status Dropdowns */}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-slate-500">
                {t("order_management.table.execution_status")}
              </p>
              <select
                value={executionStatus}
                onChange={handleExecutionStatusChange}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value="ALL">{t("common.all")}</option>
                <option value="PENDING">
                  {t("order_management.table.pending")}
                </option>
                <option value="EXECUTING">
                  {t("order_management.table.processing")}
                </option>
                <option value="COMPLETED">
                  {t("order_management.table.executed")}
                </option>
                <option value="FAILED">
                  {t("order_management.table.failed")}
                </option>
                <option value="CANCEL">{t("common.cancel")}</option>
              </select>
            </div>
          </div>

          {/* Info: (20260624 - Julian) Reset & Batch Reactivate Button */}
          <div className="flex items-center justify-end gap-2">
            {(searchInput ||
              type !== "ALL" ||
              executionStatus !== "ALL" ||
              orderStatus !== "ALL" ||
              sortBy !== "createdAt" ||
              sortOrder !== "desc") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none md:w-auto"
              >
                <X size={16} />
                <p>{t("common.clear_filters")}</p>
              </button>
            )}

            <button
              type="button"
              disabled={!hasReactivatableOrders && !isBatchMode}
              onClick={handleToggleBatchMode}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none ${
                isBatchMode
                  ? "border border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-200"
                  : !hasReactivatableOrders
                    ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                    : "border border-transparent bg-orange-600 text-white hover:bg-orange-700"
              }`}
            >
              {isBatchMode
                ? t("order_management.table.cancel_batch")
                : t("order_management.table.batch_reactivate")}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <DataTable<IOrderManagementData>
            columns={columns}
            data={orders}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            emptyStateText={t("order_management.table.no_data")}
            rowKey={(record) => record.id}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            orderId: null,
            orderIds: null,
            actionType: null,
          })
        }
        title={
          confirmModal.actionType === ORDER_ACTIONS.BATCH_REACTIVATE
            ? t("order_management.table.batch_reactivate")
            : confirmModal.actionType === ORDER_ACTIONS.RETRY
              ? t("order_management.table.retry")
              : t("order_management.table.reactivate")
        }
        message={
          confirmModal.actionType === ORDER_ACTIONS.BATCH_REACTIVATE
            ? t("order_management.table.batch_reactivate_confirm", {
                count: confirmModal.orderIds?.length || 0,
              })
            : confirmModal.actionType === ORDER_ACTIONS.RETRY
              ? t("order_management.table.retry_confirm")
              : t("order_management.table.reactivate_confirm")
        }
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleExecuteAction}
      />

      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        title="Error"
        message={alertModal.message}
        confirmText={t("common.close")}
      />

      <SuccessNotification
        show={successNotif.isOpen}
        title="Success"
        message={successNotif.message}
        onClose={() => setSuccessNotif({ isOpen: false, message: "" })}
      />

      {/* Sleek Floating Batch Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-5 fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-5">
            <span className="flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {selectedOrderIds.length}
            </span>
            <span className="text-sm font-medium text-slate-300">
              {t("order_management.table.selected_count", {
                count: selectedOrderIds.length,
              })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchReactivateClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:bg-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none active:translate-y-0.5 active:shadow-none"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>{t("order_management.table.batch_reactivate")}</span>
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="rounded-xl border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
