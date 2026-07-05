import React, { useState } from "react";
import {
  X,
  User,
  Calendar,
  CreditCard,
  Hash,
  FileText,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ORDER_STATUS } from "@/constants/status";
import { formatDate } from "@/lib/utils/date";

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
}

interface IOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: IOrderManagementData | null;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
}

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onUpdateStatus,
}: IOrderDetailModalProps) {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  React.useEffect(() => {
    if (order) {
      setNewStatus(order.status);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleUpdate = async () => {
    if (newStatus === order.status) return;
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const statusOptions = Object.values(ORDER_STATUS);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">
            {t("order_management.detail.title") || "Order Details"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Info: (20260705 - Luphia) Order Info */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Hash size={14} /> {t("order_management.table.order_id")}
                </label>
                <div className="rounded border border-gray-100 bg-gray-50 p-2 font-mono text-sm text-gray-700">
                  {order.id}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Calendar size={14} /> {t("order_management.table.date")}
                </label>
                <div className="text-sm text-gray-700">
                  {formatDate(order.createdAt, "yyyy-MM-dd HH:mm:ss")}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <User size={14} /> {t("order_management.table.user")}
                </label>
                <div className="text-sm text-gray-700">
                  <div className="font-bold">
                    {order.user?.name || "Unnamed User"}
                  </div>
                  <div className="truncate font-mono text-xs text-gray-400">
                    {order.user?.address}
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260705 - Luphia) Payment & Status */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <CreditCard size={14} /> {t("order_management.table.amount")}
                </label>
                <div className="text-lg font-bold text-orange-600">
                  {order.unit} {Number(order.amount).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Clock size={14} /> {t("order_management.table.order_status")}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdate}
                    disabled={updating || newStatus === order.status}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-orange-700 disabled:opacity-50"
                  >
                    {updating ? "..." : t("common.update") || "Update"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <FileText size={14} />{" "}
                  {t("order_management.table.payment_record")}
                </label>
                <div className="rounded border border-gray-100 bg-gray-50 p-2 font-mono text-xs break-all text-gray-500">
                  {order.transactionHash || "N/A"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              <FileText size={14} />{" "}
              {t("order_management.detail.data") || "Raw Data"}
            </label>
            <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400 shadow-inner">
              <pre>{JSON.stringify(order.data, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
