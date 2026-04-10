"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  CreditCard,
  Receipt,
  Coins,
  Loader2,
  Plus,
  CheckCircle2,
  Edit2,
  Trash2,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { formatDate } from "@/lib/utils/date";
import EditCardModal from "@/components/user/billing/edit_card_modal";

type Tab = "orders" | "points" | "cards";

interface IOrder {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  type?: string;
  cardInfo?: {
    type_name?: string;
    bin_code?: string;
    last_four?: string;
  } | null;
}

interface IPointHistory {
  id: string;
  createdAt: string;
  sourceKey: string;
  fallbackSource: string;
  amount: number;
}

interface IPaymentMethod {
  id: string;
  provider: string;
  token: string;
  isDefault: boolean;
  createdAt: string;
  data?: {
    name?: string;
    email?: string;
    taxId?: string;
    buyerName?: string;
    billingAddress?: string;
    [key: string]: unknown;
  };
}

interface IPaymentTransaction {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
}

export default function BillingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("orders");

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orders, setOrders] = useState<IOrder[]>([]);

  const [loadingPoints, setLoadingPoints] = useState(true);
  const [pointHistory, setPointHistory] = useState<IPointHistory[]>([]);

  const [loadingCards, setLoadingCards] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);

  const [isBinding, setIsBinding] = useState(false);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardData, setEditingCardData] = useState({
    name: "",
    email: "",
    taxId: "",
    buyerName: "",
    billingAddress: "",
  });

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [loadingTransactions, setLoadingTransactions] =
    useState<boolean>(false);
  const [cardTransactions, setCardTransactions] = useState<
    IPaymentTransaction[]
  >([]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: Tab) => {
    if (tab === "orders") {
      setLoadingOrders(true);
      try {
        const res = await request<{ payload: { orders: IOrder[] } }>(
          "/api/v1/user/order?type=PAYMENT",
        );
        if (res?.payload) {
          setOrders(res.payload.orders);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingOrders(false);
      }
    } else if (tab === "points") {
      setLoadingPoints(true);
      try {
        const res = await request<{
          payload: { pointHistory: IPointHistory[] };
        }>("/api/v1/user/point_history");
        if (res?.payload) {
          setPointHistory(res.payload.pointHistory);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPoints(false);
      }
    } else if (tab === "cards") {
      setLoadingCards(true);
      try {
        const res = await request<{
          payload: { paymentMethods: IPaymentMethod[] };
        }>("/api/v1/user/payment_method");
        if (res?.payload) {
          setPaymentMethods(res.payload.paymentMethods);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCards(false);
      }
    }
  };

  const handleBindCard = async () => {
    setIsBinding(true);
    try {
      const res = await request<{
        payload: { requireBinding: boolean; redirectUrl: string };
      }>("/api/v1/user/payment_method", {
        method: "POST",
      });
      if (res?.payload?.redirectUrl) {
        window.location.href = res.payload.redirectUrl;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBinding(false);
    }
  };

  const handleSaveCardDetails = async (
    id: string,
    newDetails: typeof editingCardData,
  ) => {
    try {
      const res = await request<{ payload: { success: boolean } }>(
        `/api/v1/user/payment_method/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(newDetails),
        },
      );
      if (res?.payload?.success) {
        setPaymentMethods((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, data: { ...p.data, ...newDetails } } : p,
          ),
        );
        setEditingCardId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm(t("billing.cards.delete_confirm_desc"))) return;
    try {
      const res = await request<{ payload: { success: boolean } }>(
        `/api/v1/user/payment_method/${id}`,
        {
          method: "DELETE",
        },
      );
      if (res?.payload?.success) {
        setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
        if (expandedCardId === id) setExpandedCardId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpandCard = async (id: string) => {
    if (expandedCardId === id) {
      setExpandedCardId(null);
      return;
    }
    setExpandedCardId(id);
    setLoadingTransactions(true);
    setCardTransactions([]);
    try {
      const res = await request<{
        payload: { transactions: IPaymentTransaction[] };
      }>(`/api/v1/user/payment_method/${id}/transactions`);
      if (res?.payload?.transactions) {
        setCardTransactions(res.payload.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTransactions(false);
    }
  };
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("sidebar.billing")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("billing.subtitle")}</p>
      </div>

      {/* Info: (20260409 - Luphia) Tabs */}
      <div className="mx-auto mb-8 flex w-full max-w-xl space-x-1 rounded-xl bg-gray-100/50 p-1">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
            activeTab === "orders"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
          }`}
        >
          <Receipt className="size-4 shrink-0" />
          {t("billing.tabs.orders")}
        </button>
        <button
          onClick={() => setActiveTab("points")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
            activeTab === "points"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
          }`}
        >
          <Coins className="size-4 shrink-0" />
          {t("billing.tabs.points")}
        </button>
        <button
          onClick={() => setActiveTab("cards")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
            activeTab === "cards"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
          }`}
        >
          <CreditCard className="size-4 shrink-0" />
          {t("billing.tabs.cards")}
        </button>
      </div>

      {/* Info: (20260409 - Luphia) Content */}
      <div className="min-h-[400px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {activeTab === "orders" && (
          <div className="p-0">
            {loadingOrders ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-orange-500" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <Receipt className="mb-3 size-12 text-gray-200" />
                <p>{t("billing.orders.empty")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">
                        {t("billing.table.date")}
                      </th>
                      <th className="px-6 py-4 font-medium">
                        {t("billing.table.order_id")}
                      </th>
                      <th className="px-6 py-4 font-medium">
                        {t("billing.table.amount")}
                      </th>
                      <th className="px-6 py-4 font-medium">
                        {t("billing.table.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(order.createdAt, "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="mb-1 font-mono text-xs text-gray-900">
                            {order.id}
                          </div>
                          {order.type === "OEN_PAYMENT" ||
                          order.type === "PAYMENT" ? (
                            <div className="text-xs text-gray-500">
                              {t("billing.point_history.source_purchase")}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              {t("billing.point_history.source_analysis", {
                                defaultValue: "服務消費",
                              })}
                            </div>
                          )}
                          {order.cardInfo && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <CreditCard className="size-3 shrink-0" />
                              {order.cardInfo.type_name} ••••
                              {order.cardInfo.last_four}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          NT$ {order.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              order.status === "SUCCESS"
                                ? "bg-green-50 text-green-700"
                                : order.status === "PENDING"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "points" && (
          <div className="p-0">
            {loadingPoints ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 shrink-0 animate-spin text-orange-500" />
              </div>
            ) : pointHistory.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <Coins className="mb-3 size-12 shrink-0 text-gray-200" />
                <p>{t("billing.points.empty")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="border-b border-gray-100 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">
                        {t("billing.table.date")}
                      </th>
                      <th className="px-6 py-4 font-medium">
                        {t("billing.table.source")}
                      </th>
                      <th className="px-6 py-4 text-right font-medium">
                        {t("billing.table.amount_change")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pointHistory.map((pt) => {
                      const isPositive = pt.amount > 0;
                      return (
                        <tr
                          key={pt.id}
                          className="transition-colors hover:bg-gray-50/50"
                        >
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(pt.createdAt, "yyyy-MM-dd HH:mm")}
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {t(pt.sourceKey)}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-bold ${isPositive ? "text-green-600" : "text-gray-900"}`}
                          >
                            {isPositive ? "+" : ""}
                            {pt.amount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "cards" && (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t("billing.cards.title")}
              </h2>
              <button
                onClick={handleBindCard}
                disabled={isBinding}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                {isBinding ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="size-4 shrink-0" />
                )}
                {t("billing.cards.add_button")}
              </button>
            </div>

            {loadingCards ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-6 shrink-0 animate-spin text-orange-500" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
                <CreditCard className="mx-auto mb-3 size-10 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-500">
                  {t("billing.cards.empty")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paymentMethods.map((pm, index) => (
                  <div
                    key={pm.id}
                    className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/50 transition-all duration-300 hover:shadow-md"
                  >
                    {/* Info: (20260409 - Luphia) Main Card Header */}
                    <div
                      className="flex cursor-pointer items-center justify-between p-5 transition-colors hover:bg-gray-50"
                      onClick={() => toggleExpandCard(pm.id)}
                      role="button"
                      aria-label="Toggle card details"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpandCard(pm.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-orange-600 shadow-sm">
                          <span className="text-sm font-bold tracking-wider text-white italic">
                            {pm.provider}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-900">
                              {pm.data?.name ||
                                String(index + 1).padStart(3, "0")}
                            </span>
                            {pm.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                                <CheckCircle2 className="size-3 shrink-0" />
                                {t("billing.cards.default_card")}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 font-mono text-sm text-gray-500">
                            •••• •••• ••••{" "}
                            {pm.token && pm.token.length >= 4
                              ? pm.token.substring(pm.token.length - 4)
                              : "****"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden text-xs text-gray-400 sm:inline-block">
                          {t("billing.cards.added_at")}{" "}
                          {formatDate(pm.createdAt, "yyyy/MM/dd")}
                        </span>

                        <div className="ml-4 flex items-center gap-1">
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCardId(pm.id);
                                setEditingCardData({
                                  name:
                                    pm.data?.name ||
                                    String(index + 1).padStart(3, "0"),
                                  email: pm.data?.email || "",
                                  taxId: pm.data?.taxId || "",
                                  buyerName: pm.data?.buyerName || "",
                                  billingAddress: pm.data?.billingAddress || "",
                                });
                              }}
                              className="rounded-md p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                              title={t("billing.cards.edit_details", {
                                defaultValue: "Edit Details",
                              })}
                            >
                              <Edit2 className="size-5 shrink-0" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(pm.id);
                              }}
                              className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title={t("billing.cards.delete", {
                                defaultValue: "Delete",
                              })}
                            >
                              <Trash2 className="size-5 shrink-0" />
                            </button>
                          </>
                        </div>
                      </div>
                    </div>

                    {/* Info: (20260409 - Luphia) Accordion Content */}
                    {expandedCardId === pm.id && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-2">
                        {loadingTransactions ? (
                          <div className="flex h-24 items-center justify-center">
                            <Loader2 className="size-5 shrink-0 animate-spin text-orange-600" />
                          </div>
                        ) : cardTransactions.length === 0 ? (
                          <div className="flex h-24 flex-col items-center justify-center text-sm text-gray-500">
                            {t("billing.orders.empty")}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-transparent text-gray-500">
                                <tr>
                                  <th className="px-6 py-4 font-medium">
                                    {t("billing.table.date")}
                                  </th>
                                  <th className="px-6 py-4 font-medium">
                                    {t("billing.table.amount")}
                                  </th>
                                  <th className="px-6 py-4 font-medium">
                                    {t("billing.table.status")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {cardTransactions.map((tx) => (
                                  <tr
                                    key={tx.id}
                                    className="transition-colors hover:bg-white"
                                  >
                                    <td className="px-6 py-4 text-gray-600">
                                      {formatDate(
                                        tx.createdAt,
                                        "yyyy-MM-dd HH:mm",
                                      )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                      NT$ {tx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                          tx.status === "SUCCESS"
                                            ? "bg-green-50 text-green-700"
                                            : tx.status === "PENDING"
                                              ? "bg-yellow-50 text-yellow-700"
                                              : "bg-red-50 text-red-700"
                                        }`}
                                      >
                                        {tx.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info: (20260409 - Luphia) Edit Card Modal */}
      {editingCardId && (
        <EditCardModal
          isOpen={!!editingCardId}
          onClose={() => setEditingCardId(null)}
          onSave={async (data) => {
            await handleSaveCardDetails(editingCardId, data);
          }}
          initialData={{
            name: editingCardData.name,
            email: editingCardData.email,
            taxId: editingCardData.taxId,
            buyerName: editingCardData.buyerName,
            billingAddress: editingCardData.billingAddress,
          }}
        />
      )}
    </div>
  );
}
