"use client";

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { List, UserCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import ConfirmModal from "@/components/common/confirm_modal";
import SuccessNotification from "@/components/common/success_notification";
import { formatDate } from "@/lib/utils/date";
import {
  ORDER_STATUS,
  MANAGEMENT_TYPE,
  ManagementType,
} from "@/constants/status";
import OrderFilter from "@/components/admin/order/order_filter";
import OrderDetailModal from "@/components/admin/order/order_detail_modal";

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

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    order: IOrderManagementData | null;
  }>({ isOpen: false, order: null });

  const [managementType, setManagementType] = useState<ManagementType>(
    MANAGEMENT_TYPE.ORDER,
  );
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
          managementType,
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
    sortBy,
    sortOrder,
    managementType,
    executionStatus,
    orderStatus,
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

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string,
  ) => {
    try {
      await request(`/api/v1/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccessNotif({
        isOpen: true,
        message: t("order_management.table.update_success") || "Status updated",
      });
      // Info: (20260705 - Luphia) Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      if (detailModal.order?.id === orderId) {
        setDetailModal((prev) => ({
          ...prev,
          order: prev.order ? { ...prev.order, status: newStatus } : null,
        }));
      }
    } catch (e) {
      console.error(e);
      setAlertModal({
        isOpen: true,
        message:
          t("order_management.table.update_failed") || "Failed to update",
      });
    }
  };

  // Info: (20260625 - Julian) 取得訂單類型的顯示文字
  const getOrderTypeLabel = (type: string) => {
    const key = `analysis.categories.${type.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : type;
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
        const orderData = record.data as Record<string, unknown>;
        const dataField = orderData?.data as
          | Record<string, unknown>
          | undefined;
        const rawCat = dataField?.category || orderData?.category;
        const category = rawCat ? String(rawCat) : "";
        return (
          <span className="text-sm font-medium text-gray-700">
            {getOrderTypeLabel(category)}
          </span>
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
          {record.unit} {Number(record.amount).toLocaleString()}
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
          {record.tokens ? Number(record.tokens).toLocaleString() : "-"}
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
    ...(managementType === MANAGEMENT_TYPE.TASK
      ? [
          {
            key: "executionStatus",
            label: t("order_management.table.execution_status"),
            render: (record: IOrderManagementData) => {
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
            render: (record: IOrderManagementData) => {
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
        ]
      : []),
    {
      key: "actions",
      label: t("order_management.table.actions"),
      align: "center",
      render: (record) => (
        <button
          onClick={() => setDetailModal({ isOpen: true, order: record })}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900"
        >
          {t("common.detail") || "Details"}
        </button>
      ),
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

        <div className="flex space-x-1 rounded-xl bg-gray-200/50 p-1">
          <button
            onClick={() => {
              setManagementType(MANAGEMENT_TYPE.ORDER);
              setPage(1);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
              managementType === MANAGEMENT_TYPE.ORDER
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
            }`}
          >
            {t("order_management.tabs.order_management")}
          </button>
          <button
            onClick={() => {
              setManagementType(MANAGEMENT_TYPE.TASK);
              setPage(1);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
              managementType === MANAGEMENT_TYPE.TASK
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:bg-white/50 hover:text-gray-700"
            }`}
          >
            {t("order_management.tabs.task_management")}
          </button>
        </div>

        <OrderFilter
          managementType={managementType}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          type={type}
          handleTypeChange={handleTypeChange}
          orderStatus={orderStatus}
          handleOrderStatusChange={handleOrderStatusChange}
          executionStatus={executionStatus}
          handleExecutionStatusChange={handleExecutionStatusChange}
          hasActiveFilters={
            !!(
              searchInput ||
              type !== "ALL" ||
              executionStatus !== "ALL" ||
              orderStatus !== "ALL" ||
              sortBy !== "createdAt" ||
              sortOrder !== "desc"
            )
          }
          handleResetFilters={handleResetFilters}
          isBatchMode={isBatchMode}
          handleToggleBatchMode={handleToggleBatchMode}
          hasReactivatableOrders={hasReactivatableOrders}
          getOrderTypeLabel={getOrderTypeLabel}
        />

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

      <OrderDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, order: null })}
        order={detailModal.order}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Info: (20260626 - Julian) 漂浮的批量操作欄 */}
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
