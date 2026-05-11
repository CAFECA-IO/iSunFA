"use client";

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { List, UserCircle } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { formatDate } from "@/lib/utils/date";
import { ORDER_STATUS } from "@/constants/status";

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

  useEffect(() => {
    let ignore = false;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit),
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
        }>(`/api/v1/admin/orders?${query.toString()}`);

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
  }, [page, limit]);

  const columns: IDataTableColumn<IOrderManagementData>[] = [
    {
      key: "createdAt",
      label: t("order_management.table.date"),
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            {record.user?.name ? (
              record.user.name.substring(0, 2).toUpperCase()
            ) : (
              <UserCircle className="h-4 w-4" />
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
      render: (record) => (
        <span className="text-sm font-medium text-gray-900">
          {record.tokens ? record.tokens.toLocaleString() : "-"}
        </span>
      ),
    },
    {
      key: "status",
      label: t("order_management.table.order_status"),
      render: (record) => (
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
          text = "CANCEL";
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
      label: t("order_management.table.execution_confidence") || "執行信心度",
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
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={List}
          title={t("order_management.title")}
          subtitle={t("order_management.subtitle")}
        />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <DataTable<IOrderManagementData>
            columns={columns}
            data={orders}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyStateText={t("order_management.table.no_data")}
            rowKey={(record) => record.id}
          />
        </div>
      </div>
    </div>
  );
}
