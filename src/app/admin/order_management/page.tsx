"use client";

import { useState, useEffect } from 'react';
import { request } from '@/lib/utils/request';
import AdminPageHeader from '@/components/admin/common/admin_page_header';
import { List, UserCircle } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import DataTable, { IDataTableColumn } from '@/components/common/data_table';
import { formatDate } from '@/lib/utils/date';

interface IOrderManagementData {
  id: string;
  createdAt: string;
  type: string;
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
    page: 1, limit: 15, totalElements: 0, totalPages: 0
  });

  useEffect(() => {
    let ignore = false;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit)
        });

        const res = await request<{ payload: { data: IOrderManagementData[], pagination: { page: number; limit: number; totalElements: number; totalPages: number; } } }>(
          `/api/v1/admin/orders?${query.toString()}`
        );

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
      label: String(t("order_management.table.date")),
      render: (record) => (
        <span className="text-sm text-gray-500">
          {formatDate(record.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "user",
      label: String(t("order_management.table.user")),
      render: (record) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            {record.user?.name ? record.user.name.substring(0, 2).toUpperCase() : <UserCircle className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">{record.user?.name || String(t("order_management.table.unnamed_user"))}</div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">{record.user?.address ? `${record.user.address.substring(0, 8)}...` : "Unknown"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "orderId",
      label: String(t("order_management.table.order_id")),
      render: (record) => (
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{record.id}</span>
      ),
    },
    {
      key: "type",
      label: String(t("order_management.table.type")),
      render: (record) => (
        <span className="text-sm font-medium text-gray-700">{record.type}</span>
      ),
    },
    {
      key: "amount",
      label: String(t("order_management.table.amount")),
      align: "right",
      render: (record) => (
        <span className="text-sm font-medium text-gray-900">
          {record.unit} {record.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      label: String(t("order_management.table.order_status")),
      render: (record) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${record.status === 'PAID' || record.status === 'COMPLETED'
          ? "bg-emerald-50 text-emerald-700"
          : "bg-orange-50 text-orange-700"
          }`}>
          {record.status}
        </span>
      ),
    },
    {
      key: "paymentRecord",
      label: String(t("order_management.table.payment_record")),
      render: (record) => {
        return (
          <div className="flex flex-col items-center">
            {record.transactionHash ? (
              <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded truncate w-32 md:w-48 text-center" title={record.transactionHash}>
                {record.transactionHash.substring(0, 8)}...{record.transactionHash.substring(record.transactionHash.length - 8)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">N/A</span>
            )}
          </div>
        );
      }
    },
    {
      key: "executionStatus",
      label: String(t("order_management.table.execution_status")),
      render: (record) => {
        let text = String(t("order_management.table.pending"));
        let colorClass = "bg-gray-100 text-gray-600";
        
        if (record.executionStatus === "COMPLETED") {
          text = String(t("order_management.table.executed"));
          colorClass = "bg-purple-50 text-purple-700";
        } else if (record.executionStatus === "EXECUTING") {
          text = String(t("order_management.table.processing"));
          colorClass = "bg-blue-50 text-blue-700";
        } else if (record.executionStatus === "FAILED") {
          text = String(t("order_management.table.failed"));
          colorClass = "bg-red-50 text-red-700";
        }

        return (
          <div className="flex flex-col">
            <span className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold w-fit ${colorClass}`}>
              {text}
            </span>
          </div>
        )
      }
    },
    {
      key: "executionConfidence",
      label: String(t("order_management.table.execution_confidence") || "執行信心度"),
      render: (record) => {
        if (record.executionConfidence == null) {
          return <span className="text-xs text-gray-400">N/A</span>;
        }
        
        let colorClass = "bg-red-50 text-red-700";
        if (record.executionConfidence >= 80) colorClass = "bg-emerald-50 text-emerald-700";
        else if (record.executionConfidence >= 60) colorClass = "bg-amber-50 text-amber-700";
        
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colorClass}`}>
            {record.executionConfidence}%
          </span>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={List}
          title={String(t("order_management.title"))}
          subtitle={String(t("order_management.subtitle"))}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <DataTable<IOrderManagementData>
            columns={columns}
            data={orders}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyStateText={String(t("order_management.table.no_data"))}
            rowKey={(record) => record.id}
          />
        </div>
      </div>
    </div>
  );
}
