"use client";

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import AdminMetricCard from "@/components/admin/common/admin_metric_card";
import {
  Receipt,
  Calendar,
  Search,
  Wallet,
  Activity,
  Coins,
  UserCircle,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { formatDate } from "@/lib/utils/date";
import ReceiptPdfDownloader from "@/components/user/billing/receipt_pdf_downloader";
import { ORDER_STATUS, PAYMENT_TRANSACTION_STATUS } from "@/constants/status";
import {
  IMetrics,
  IPagination,
  IOrderData,
  IPointData,
  ICreditCardData,
} from "@/interfaces/admin_billing";
import { CreditCard } from "lucide-react";

export default function AdminBillingPage() {
  const { t } = useTranslation();
  // Info: (20260417 - Luphia) 核心查詢狀態
  const [activeTab, setActiveTab] = useState<
    "orders" | "points" | "credit_cards"
  >("orders");
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Info: (20260417 - Luphia) 表單輸入狀態（尚未點擊搜尋前）
  const [startDateInput, setStartDateInput] = useState<string>("");
  const [endDateInput, setEndDateInput] = useState<string>("");

  // Info: (20260417 - Luphia) 實際應用的過濾條件
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
  });

  // Info: (20260417 - Luphia) 資料狀態
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<IMetrics | null>(null);
  const [orders, setOrders] = useState<IOrderData[]>([]);
  const [points, setPoints] = useState<IPointData[]>([]);
  const [creditCards, setCreditCards] = useState<ICreditCardData[]>([]);
  const [pagination, setPagination] = useState<IPagination>({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  // Info: (20260417 - Luphia) 單一的資料獲取副作用：當查詢條件改變時自動觸發
  useEffect(() => {
    let ignore = false; // Info: (20260417 - Luphia) 用於防止快速切換造成的 Race Condition

    const fetchStats = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          tab: activeTab,
          page: String(page),
          limit: String(limit),
        });

        if (appliedFilters.startDate)
          query.append(
            "startDate",
            `${appliedFilters.startDate}T00:00:00.000Z`,
          );
        if (appliedFilters.endDate)
          query.append("endDate", `${appliedFilters.endDate}T23:59:59.999Z`);

        const res = await request<{
          payload: {
            metrics: IMetrics;
            data: unknown;
            pagination: IPagination;
          };
        }>(`/api/v1/admin/billing/stats?${query.toString()}`);

        // Info: (20260417 - Luphia) 如果元件已經 unmount 或條件已改變，則忽略此次結果
        if (ignore) return;

        if (res.payload) {
          setMetrics(res.payload.metrics);
          setPagination(res.payload.pagination);
          if (activeTab === "orders") {
            setOrders(res.payload.data as IOrderData[]);
          } else if (activeTab === "points") {
            setPoints(res.payload.data as IPointData[]);
          } else if (activeTab === "credit_cards") {
            setCreditCards(res.payload.data as ICreditCardData[]);
          }
        }
      } catch (e) {
        if (!ignore) console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      ignore = true; // Info: (20260417 - Luphia) 清理函式：標記為忽略舊的請求
    };
  }, [
    activeTab,
    page,
    limit,
    appliedFilters.startDate,
    appliedFilters.endDate,
  ]);

  // Info: (20260417 - Luphia) 事件處理器：僅更新狀態，不直接呼叫 API
  const handleTabChange = (tab: "orders" | "points" | "credit_cards") => {
    setActiveTab(tab);
    setPage(1); // Info: (20260417 - Luphia) 切換頁籤時重置頁碼
  };

  const handleFilter = () => {
    setAppliedFilters({ startDate: startDateInput, endDate: endDateInput });
    setPage(1); // Info: (20260417 - Luphia) 套用搜尋時重置頁碼
  };

  // Info: (20260416 - Luphia) 定義 Orders 表格的欄位
  const orderColumns: IDataTableColumn<IOrderData>[] = [
    {
      key: "createdAt",
      label: t("admin_billing.table.th_date"),
      render: (record) => (
        <span className="text-sm text-gray-500">
          {formatDate(record.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "user",
      label: t("admin_billing.table.th_user"),
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
              {record.user?.name ||
                t("admin_billing.table.unnamed_user", {
                  defaultValue: "Unnamed User",
                })}
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
      label: t("admin_billing.table.th_order"),
      render: (record) => (
        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
          {record.id}
        </span>
      ),
    },
    {
      key: "amount",
      label: t("admin_billing.table.th_amount"),
      align: "right",
      render: (record) => (
        <span className="text-sm font-medium text-gray-900">
          NT$ {record.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      label: t("admin_billing.table.th_status"),
      render: (record) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            record.status === ORDER_STATUS.PAID ||
            record.status === ORDER_STATUS.COMPLETED
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {record.status}
        </span>
      ),
    },
    {
      key: "action",
      label: t("admin_billing.table.th_action"),
      align: "right",
      render: (record) => (
        <ReceiptPdfDownloader
          receiptNumber={record.id}
          date={record.createdAt}
          amount={record.amount}
          buyerName={record.buyerName}
          buyerTaxId={record.buyerTaxId}
          buyerAddress={record.buyerAddress}
        />
      ),
    },
  ];

  // Info: (20260416 - Luphia) 定義 Points 表格的欄位
  const pointColumns: IDataTableColumn<IPointData>[] = [
    {
      key: "createdAt",
      label: t("admin_billing.table.th_date"),
      render: (pt) => (
        <span className="text-sm text-gray-500">
          {formatDate(pt.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "user",
      label: t("admin_billing.table.th_user"),
      render: (pt) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            {pt.user?.name ? (
              pt.user.name.substring(0, 2).toUpperCase()
            ) : (
              <UserCircle className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {pt.user?.name ||
                t("admin_billing.table.unnamed_user", {
                  defaultValue: "Unnamed User",
                })}
            </div>
            <div className="mt-0.5 font-mono text-xs text-gray-400">
              {pt.user?.address
                ? `${pt.user.address.substring(0, 8)}...`
                : "Unknown"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      label: t("admin_billing.table.th_source"),
      render: (pt) => (
        <span className="text-sm font-semibold text-gray-700">
          {pt.sourceKey ? t(pt.sourceKey) : pt.sourceType}
        </span>
      ),
    },
    {
      key: "amount",
      label: t("admin_billing.table.th_amount"),
      align: "right",
      render: (pt) => (
        <span
          className={`text-sm font-bold ${pt.isPositive ? "text-emerald-600" : "text-gray-900"}`}
        >
          {!pt.isPositive && pt.amount > 0 ? "-" : pt.isPositive ? "+" : ""}
          {pt.amount}
        </span>
      ),
    },
  ];

  // Info: (20260416 - Luphia) 定義 CreditCards 表格的欄位
  const creditCardColumns: IDataTableColumn<ICreditCardData>[] = [
    {
      key: "createdAt",
      label: t("admin_billing.table.th_date"),
      render: (cc) => (
        <span className="text-sm text-gray-500">
          {formatDate(cc.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "user",
      label: t("admin_billing.table.th_user"),
      render: (cc) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            {cc.user?.name ? (
              cc.user.name.substring(0, 2).toUpperCase()
            ) : (
              <UserCircle className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {cc.user?.name ||
                t("admin_billing.table.unnamed_user", {
                  defaultValue: "Unnamed User",
                })}
            </div>
            <div className="mt-0.5 font-mono text-xs text-gray-400">
              {cc.user?.address
                ? `${cc.user.address.substring(0, 8)}...`
                : "Unknown"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      label: t("admin_billing.table.th_purpose"),
      render: (cc) => (
        <span className="text-sm font-semibold text-gray-700">
          {cc.purpose}
        </span>
      ),
    },
    {
      key: "cardInfo",
      label: t("admin_billing.table.th_card_info"),
      render: (cc) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {cc.cardInfo?.type_name || "Unknown CC"}
          </span>
          <span className="font-mono text-xs text-gray-500">
            **** {cc.cardInfo?.last_four || "****"}
          </span>
        </div>
      ),
    },
    {
      key: "amount",
      label: t("admin_billing.table.th_amount"),
      align: "right",
      render: (cc) => (
        <span className="text-sm font-medium text-gray-900">
          NT$ {cc.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      label: t("admin_billing.table.th_status"),
      align: "right",
      render: (cc) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
            cc.status === PAYMENT_TRANSACTION_STATUS.SUCCESS
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
          title={cc.errorMessage}
        >
          {cc.status}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={Receipt}
          title={t("admin_billing.page.title")}
          subtitle={t("admin_billing.page.subtitle")}
          rightNode={
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col space-y-1">
                <label
                  htmlFor="startDate"
                  className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase"
                >
                  <Calendar className="h-3 w-3" />{" "}
                  {t("admin_billing.page.start_date")}
                </label>
                <input
                  id="startDate"
                  aria-label={t("admin_billing.page.start_date")}
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label
                  htmlFor="endDate"
                  className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase"
                >
                  <Calendar className="h-3 w-3" />{" "}
                  {t("admin_billing.page.end_date")}
                </label>
                <input
                  id="endDate"
                  aria-label={t("admin_billing.page.end_date")}
                  type="date"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                onClick={handleFilter}
                className="flex h-9 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              >
                <Search className="h-4 w-4" />
                <span className="sm:hidden lg:inline">
                  {t("admin_billing.page.apply_filter")}
                </span>
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            title={t("admin_billing.kpi.revenue")}
            value={metrics ? metrics.totalRevenue.toLocaleString() : "---"}
            prefix="NT$"
            icon={Wallet}
            colorTheme="emerald"
          />
          <AdminMetricCard
            title={t("admin_billing.kpi.consumption")}
            value={
              metrics ? metrics.totalPointsConsumed.toLocaleString() : "---"
            }
            unit="Pts"
            icon={Activity}
            colorTheme="orange"
            showSmallIcon={true}
            bgIconPosition="bottom-right"
          />
          <AdminMetricCard
            title={t("admin_billing.kpi.arpu")}
            value={metrics ? metrics.arpu.toLocaleString() : "---"}
            prefix="NT$"
            icon={Receipt}
            colorTheme="blue"
          />
          <AdminMetricCard
            title={t("admin_billing.kpi.burn_ratio")}
            value={metrics ? `${metrics.burnToBuyRatio}x` : "---"}
            icon={Coins}
            colorTheme="rose"
            badgeNode={
              metrics && metrics.burnToBuyRatio > 1 ? (
                <span className="mb-1 rounded-md bg-rose-50 px-2 pb-[1px] text-xs font-semibold text-rose-500">
                  High Velocity
                </span>
              ) : null
            }
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Info: (20260416 - Luphia) Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50/50 p-2">
            <button
              onClick={() => handleTabChange("orders")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 md:flex-none ${activeTab === "orders" ? "bg-white text-orange-600 shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"}`}
            >
              <Receipt className="h-4 w-4" />
              {t("admin_billing.tabs.orders")}
            </button>
            <button
              onClick={() => handleTabChange("points")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 md:flex-none ${activeTab === "points" ? "bg-white text-orange-600 shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"}`}
            >
              <Activity className="h-4 w-4" />
              {t("admin_billing.tabs.points")}
            </button>
            <button
              onClick={() => handleTabChange("credit_cards")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 md:flex-none ${activeTab === "credit_cards" ? "bg-white text-orange-600 shadow-sm ring-1 ring-gray-100" : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"}`}
            >
              <CreditCard className="h-4 w-4" />
              {t("admin_billing.tabs.credit_cards")}
            </button>
          </div>

          {/* Info: (20260416 - Luphia) Tab Content with DataTable */}
          <DataTable<IOrderData | IPointData | ICreditCardData>
            columns={
              activeTab === "orders"
                ? (orderColumns as IDataTableColumn<
                    IOrderData | IPointData | ICreditCardData
                  >[])
                : activeTab === "points"
                  ? (pointColumns as IDataTableColumn<
                      IOrderData | IPointData | ICreditCardData
                    >[])
                  : (creditCardColumns as IDataTableColumn<
                      IOrderData | IPointData | ICreditCardData
                    >[])
            }
            data={
              activeTab === "orders"
                ? orders
                : activeTab === "points"
                  ? points
                  : creditCards
            }
            loading={loading}
            pagination={{
              page: pagination?.page || 1,
              limit: pagination?.limit || 15,
              totalPages: pagination?.totalPages || 0,
              totalElements: pagination?.totalElements || 0,
            }}
            onPageChange={setPage}
            emptyStateText={t("common.no_data")}
            rowKey={(record: IOrderData | IPointData | ICreditCardData) =>
              record.id
            }
          />
        </div>
      </div>
    </div>
  );
}
