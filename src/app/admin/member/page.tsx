"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Coins,
  RefreshCw,
  UserCircle,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { request } from "@/lib/utils/request";
import {
  PointIssueModal,
  IUserTarget,
} from "@/components/admin/member/point_issue_modal";
import { useTranslation } from "@/i18n/i18n_context";
import { Role } from "@/generated/enums";
import { IBlockchainDashboardData } from "@/services/admin.blockchain.service";

interface IUser {
  id: string;
  name: string | null;
  address: string;
  role: string;
  createdAt: Date;
}

export default function MemberAdminPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<IUser[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState<string | null>(
    null,
  );
  const [blockchainData, setBlockchainData] =
    useState<IBlockchainDashboardData | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUserTarget | null>(null);

  // Info: (20260415 - Luphia) 獲取區塊鏈 Dashboard 資料 (庫存 ICP 數量)
  const fetchBlockchainData = useCallback(async () => {
    try {
      const res = await request<{
        success: boolean;
        payload: IBlockchainDashboardData;
      }>("/api/v1/admin/blockchain/dashboard");
      if (res.success && res.payload) {
        setBlockchainData(res.payload);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Info: (20260415 - Luphia) 使用 useCallback 記憶化函式，避免不必要的重新渲染
  const handleRefreshBalance = useCallback(async (userId: string) => {
    if (!userId) return;
    setRefreshingBalance(userId);
    try {
      const res = await request<{ success: boolean; payload: number }>(
        `/api/v1/admin/member/${userId}/balance`,
      );
      if (res.success && res.payload !== undefined) {
        setBalances((prev) => ({ ...prev, [userId]: res.payload }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingBalance(null);
    }
  }, []);

  // Info: (20260415 - Luphia) 同樣使用 useCallback，將其安全的放入 useEffect 的依賴中
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ success: boolean; payload: IUser[] }>(
        "/api/v1/admin/member",
      );
      if (res.success && res.payload) {
        setUsers(res.payload);
        res.payload.forEach((u) => {
          handleRefreshBalance(u.id);
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [handleRefreshBalance]);

  useEffect(() => {
    fetchUsers();
    fetchBlockchainData();
  }, [fetchUsers, fetchBlockchainData]);

  const openIssueModal = (user: IUser) => {
    setSelectedUser({
      id: user.id,
      name: user.name,
      address: user.address,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Info: (20260415 - Luphia) Header & Blockchain Stats */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-800">
              <Users className="h-8 w-8 text-orange-500" />
              {t("admin_member.page.title")}
            </h1>
            <p className="mt-2 text-gray-500">
              {t("admin_member.page.subtitle")}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            {/* Info: (20260416 - Luphia) 庫存 ICP 數量顯示 */}
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-2 pr-4 shadow-sm">
              <div className="flex items-center gap-2 pl-2">
                <Coins className="h-5 w-5 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] leading-none font-bold tracking-wider text-gray-400 uppercase">
                    {String(
                      t("admin_member.page.admin_icp_inventory") ||
                        "System ICP Reserve",
                    )}
                  </span>
                  <span className="mt-0.5 text-sm leading-tight font-bold text-gray-800">
                    {blockchainData
                      ? parseFloat(
                          blockchainData.membershipSystemIcpInventory,
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })
                      : "---"}
                  </span>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <Link
                href="/admin/blockchain"
                className="flex items-center gap-1.5 text-sm font-bold text-orange-600 transition hover:text-orange-700"
              >
                <PlusCircle className="h-4 w-4" />
                {String(t("admin_member.page.mint") || "Mint")}
              </Link>
            </div>

            <button
              type="button"
              aria-label={t("admin_member.page.refresh_list_aria")}
              onClick={() => {
                fetchUsers();
                fetchBlockchainData();
              }}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-600 shadow-sm transition hover:shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="sm:hidden">
                {t("admin_member.page.refresh")}
              </span>
            </button>
          </div>
        </div>

        {/* Info: (20260415 - Luphia) Data Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    {t("admin_member.page.th_user")}
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    {t("admin_member.page.th_role")}
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    {t("admin_member.page.th_joined_at")}
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    {t("admin_member.page.th_balance")}
                  </th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-500">
                    {t("admin_member.page.th_action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-orange-500" />
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      {t("admin_member.page.no_users")}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-50 transition hover:bg-gray-50/50"
                    >
                      <td aria-label={user.id} className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                            {user.name ? (
                              user.name.substring(0, 2)
                            ) : (
                              <UserCircle className="h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {user.name || t("admin_member.page.unnamed_user")}
                            </div>
                            <div className="mt-0.5 max-w-[200px] truncate font-mono text-xs text-gray-400">
                              {user.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === Role.SUPER_ADMIN ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                            <ShieldAlert className="h-3 w-3" />{" "}
                            {t("admin_member.page.role_super_admin")}
                          </span>
                        ) : user.role === Role.ADMIN ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            <ShieldCheck className="h-3 w-3" />{" "}
                            {t("admin_member.page.role_admin")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                            {t("admin_member.page.role_user")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">
                            {balances[user.id] !== undefined
                              ? balances[user.id].toLocaleString()
                              : "---"}
                          </span>
                          <button
                            type="button"
                            aria-label={t(
                              "admin_member.page.refresh_balance_aria",
                            )}
                            title={t("admin_member.page.refresh_balance_aria")}
                            onClick={() => handleRefreshBalance(user.id)}
                            disabled={refreshingBalance === user.id}
                            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100"
                          >
                            {/* Info: (20260415 - Luphia) 由上一行的 aria-label 負責提供無障礙文字 */}
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${refreshingBalance === user.id ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          aria-label={t("admin_member.page.issue_points_btn")}
                          onClick={() => openIssueModal(user)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-4 py-2 font-medium text-orange-600 transition hover:bg-orange-100"
                        >
                          <Coins className="h-4 w-4" />
                          <span className="hidden lg:inline">
                            {t("admin_member.page.issue_points_btn")}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PointIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetUser={selectedUser}
        onSuccess={() => {
          if (selectedUser?.id) {
            handleRefreshBalance(selectedUser.id);
          }
        }}
      />
    </div>
  );
}
