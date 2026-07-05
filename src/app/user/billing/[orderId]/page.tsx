"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Package,
  CreditCard,
  ClipboardCheck,
  Settings,
  Loader2,
  Landmark,
  Copy,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ORDER_STATUS } from "@/constants/status";
import { formatDate } from "@/lib/utils/date";
import { request } from "@/lib/utils/request";
import { BANK_TRANSFER } from "@/constants/price";

interface IOrderDetails {
  id: string;
  createdAt: string;
  status: string;
  amount: number;
  items?: { name: string; amount: number; quantity: number; remark?: string }[];
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [order, setOrder] = useState<IOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await request<{ payload: IOrderDetails }>(
          `/api/v1/user/order/${orderId}`,
        );
        setOrder(res.payload);
      } catch (error) {
        console.error("Failed to fetch order details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{t("billing.details.not_found")}</p>
        <button
          onClick={() => router.push("/user/billing")}
          className="text-orange-600 hover:underline"
        >
          {t("billing.details.back_to_list")}
        </button>
      </div>
    );
  }

  const steps = [
    {
      id: "PENDING",
      title: t("billing.tracking.status.pending.title"),
      desc: t("billing.tracking.status.pending.desc"),
      icon: ClipboardCheck,
      status: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PAYING,
        ORDER_STATUS.PAID,
        ORDER_STATUS.EXECUTING,
        ORDER_STATUS.COMPLETED,
      ],
    },
    {
      id: "PAID",
      title: t("billing.tracking.status.paid.title"),
      desc: t("billing.tracking.status.paid.desc"),
      icon: CreditCard,
      status: [
        ORDER_STATUS.PAID,
        ORDER_STATUS.EXECUTING,
        ORDER_STATUS.COMPLETED,
      ],
    },
    {
      id: "EXECUTING",
      title: t("billing.tracking.status.executing.title"),
      desc: t("billing.tracking.status.executing.desc"),
      icon: Settings,
      status: [ORDER_STATUS.EXECUTING, ORDER_STATUS.COMPLETED],
    },
    {
      id: "COMPLETED",
      title: t("billing.tracking.status.completed.title"),
      desc: t("billing.tracking.status.completed.desc"),
      icon: Package,
      status: [ORDER_STATUS.COMPLETED],
    },
  ];

  const currentStatusIndex = steps.findIndex((step) =>
    (step.status as string[]).includes(order.status),
  );

  const isBankTransfer = order.items?.some(
    (item) => item.remark === BANK_TRANSFER,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Info: (20260705 - Luphia) Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.push("/user/billing")}
          className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm transition-all hover:bg-gray-50 active:scale-95"
        >
          <ChevronLeft className="size-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("billing.details.title")}
          </h1>
          <p className="text-sm text-gray-500">ID: {order.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Info: (20260705 - Luphia) Main Content: Tracking Progress */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-8 text-lg font-bold text-gray-900">
              {t("billing.tracking.title")}
            </h2>

            <div className="space-y-12">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="relative flex gap-6">
                    {/* Info: (20260705 - Luphia) Line connector */}
                    {index !== steps.length - 1 && (
                      <div
                        className={`absolute top-12 left-6 h-12 w-0.5 ${
                          index < currentStatusIndex
                            ? "bg-orange-500"
                            : "bg-gray-200"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                        isCompleted
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-gray-200 bg-white text-gray-300"
                      } ${isCurrent ? "scale-110 ring-4 ring-orange-100" : ""}`}
                    >
                      {isCompleted && !isCurrent ? (
                        <Check className="size-6" />
                      ) : (
                        <Icon className="size-6" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <h4
                        className={`text-base font-bold transition-colors duration-300 ${
                          isCompleted ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p
                        className={`mt-1 text-sm transition-colors duration-300 ${
                          isCompleted ? "text-gray-500" : "text-gray-300"
                        }`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info: (20260705 - Luphia) Sidebar: Order Summary */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {t("billing.details.summary")}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {t("billing.details.order_date")}
                </span>
                <span className="font-medium text-gray-900">
                  {formatDate(order.createdAt, "yyyy-MM-dd HH:mm")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {t("billing.details.order_status")}
                </span>
                <span
                  className={`font-medium ${
                    order.status === ORDER_STATUS.COMPLETED
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {(() => {
                    const isBankTransfer = order.items?.some(
                      (item) => item.remark === BANK_TRANSFER,
                    );
                    if (
                      isBankTransfer &&
                      order.status === ORDER_STATUS.PENDING
                    ) {
                      return t("billing.status.pending_bank_transfer");
                    }
                    const statusKey = `billing.status.${order.status.toLowerCase()}`;
                    const translated = t(statusKey);
                    return translated !== statusKey ? translated : order.status;
                  })()}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  {t("billing.details.items")}
                </p>
                {order.items?.map((item, idx) => (
                  <div key={idx} className="mb-2 flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} x {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900">
                      NT$ {Number(item.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-4">
                <span className="text-base font-bold text-gray-900">
                  {t("billing.details.total")}
                </span>
                <span className="text-xl font-bold text-orange-600">
                  NT$ {Number(order.amount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {isBankTransfer && order.status === ORDER_STATUS.PENDING && (
            <div className="rounded-2xl bg-orange-50 p-6 ring-1 ring-orange-100">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <Landmark className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-orange-800">
                  {t("pricing.bank_transfer.title")}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600/70">
                    {t("pricing.bank_transfer.bank_name")}
                  </span>
                  <span className="font-semibold text-orange-900">
                    {t("pricing.bank_transfer.isunfa_bank_name")} (
                    {t("pricing.bank_transfer.isunfa_bank_code")})
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600/70">
                    {t("pricing.bank_transfer.branch_name")}
                  </span>
                  <span className="font-semibold text-orange-900">
                    {t("pricing.bank_transfer.isunfa_branch_name")}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600/70">
                    {t("pricing.bank_transfer.account_name")}
                  </span>
                  <span className="font-semibold text-orange-900">
                    {t("pricing.bank_transfer.isunfa_account_name")}
                  </span>
                </div>
                <div className="border-t border-orange-200/50 pt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-orange-600/70">
                      {t("pricing.bank_transfer.account_number")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white p-2 ring-1 ring-orange-200">
                    <span className="font-mono text-sm font-bold text-orange-900">
                      {t("pricing.bank_transfer.isunfa_account_number")}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          t("pricing.bank_transfer.isunfa_account_number"),
                        );
                      }}
                      className="rounded p-1 text-orange-600 hover:bg-gray-100"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-orange-500 italic">
                {t("pricing.bank_transfer.success_message")}
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-orange-50 p-6 ring-1 ring-orange-100">
            <h3 className="mb-2 text-sm font-bold text-orange-800">
              {t("billing.details.need_help")}
            </h3>
            <p className="mb-4 text-xs text-orange-700">
              {t("billing.details.help_desc")}
            </p>

            <div className="mb-4 space-y-2 border-t border-orange-200 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-600">
                  {t("billing.details.contact_email")}
                </span>
                <a
                  href="mailto:contact@isunfa.com"
                  className="font-medium text-orange-800 hover:underline"
                >
                  contact@isunfa.com
                </a>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-600">
                  {t("billing.details.contact_phone")}
                </span>
                <a
                  href="tel:+886-2-2546-6225"
                  className="font-medium text-orange-800 hover:underline"
                >
                  +886-2-2546-6225
                </a>
              </div>
            </div>

            <button
              onClick={() => {
                const subject = encodeURIComponent(
                  t("billing.details.support_email_subject", {
                    orderId: String(order.id),
                  }),
                );
                const body = encodeURIComponent(
                  t("billing.details.support_email_body", {
                    orderId: String(order.id),
                    orderDate: formatDate(order.createdAt, "yyyy-MM-dd HH:mm"),
                    orderItems:
                      order.items?.map((i) => i.name).join(", ") || "-",
                  }),
                );
                window.location.href = `mailto:contact@isunfa.com?subject=${subject}&body=${body}`;
              }}
              className="block w-full rounded-xl bg-orange-600 px-4 py-2 text-center text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-700"
            >
              {t("billing.details.contact_support")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
