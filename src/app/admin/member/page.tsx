"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Coins, RefreshCw, UserCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { request } from "@/lib/utils/request";
import { PointIssueModal, IUserTarget } from "@/app/admin/member/components/point_issue_modal";
import { useTranslation } from "@/i18n/i18n_context";
import { Role } from "@/generated/enums";

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
  const [refreshingBalance, setRefreshingBalance] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUserTarget | null>(null);

  // Info: (20260415 - Luphia) 使用 useCallback 記憶化函式，避免不必要的重新渲染
  const handleRefreshBalance = useCallback(async (userId: string) => {
    if (!userId) return;
    setRefreshingBalance(userId);
    try {
      const res = await request<{ success: boolean; payload: number }>(`/api/v1/admin/member/${userId}/balance`);
      if (res.success && res.payload !== undefined) {
        setBalances(prev => ({ ...prev, [userId]: res.payload }));
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
      const res = await request<{ success: boolean; payload: IUser[] }>("/api/v1/admin/member");
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
  }, [fetchUsers]);

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
        {/* Info: (20260415 - Luphia) Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 tracking-tight">
              <Users className="w-8 h-8 text-orange-500" />
              {t("admin_member.page.title")}
            </h1>
            <p className="text-gray-500 mt-2">
              {t("admin_member.page.subtitle")}
            </p>
          </div>

          <button
            type="button"
            aria-label={t("admin_member.page.refresh_list_aria")}
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t("admin_member.page.refresh")}
          </button>
        </div>

        {/* Info: (20260415 - Luphia) Data Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="font-semibold text-gray-500 py-4 px-6">{t("admin_member.page.th_user")}</th>
                  <th className="font-semibold text-gray-500 py-4 px-6">{t("admin_member.page.th_role")}</th>
                  <th className="font-semibold text-gray-500 py-4 px-6">{t("admin_member.page.th_joined_at")}</th>
                  <th className="font-semibold text-gray-500 py-4 px-6">{t("admin_member.page.th_balance")}</th>
                  <th className="font-semibold text-gray-500 py-4 px-6 text-right">{t("admin_member.page.th_action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-orange-500" />
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
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td aria-label={user.id} className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            {user.name ? user.name.substring(0, 2) : <UserCircle className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {user.name || t("admin_member.page.unnamed_user")}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[200px]">
                              {user.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {user.role === Role.SUPER_ADMIN ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            <ShieldAlert className="w-3 h-3" /> {t("admin_member.page.role_super_admin")}
                          </span>
                        ) : user.role === Role.ADMIN ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            <ShieldCheck className="w-3 h-3" /> {t("admin_member.page.role_admin")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            {t("admin_member.page.role_user")}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">
                            {balances[user.id] !== undefined
                              ? balances[user.id].toLocaleString()
                              : "---"}
                          </span>
                          <button
                            type="button"
                            aria-label={t("admin_member.page.refresh_balance_aria")}
                            title={t("admin_member.page.refresh_balance_aria")}
                            onClick={() => handleRefreshBalance(user.id)}
                            disabled={refreshingBalance === user.id}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition"
                          >
                            {/* Info: (20260415 - Luphia) 由上一行的 aria-label 負責提供無障礙文字 */}
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingBalance === user.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          aria-label={t("admin_member.page.issue_points_btn")}
                          onClick={() => openIssueModal(user)}
                          className="inline-flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium px-4 py-2 rounded-xl transition"
                        >
                          <Coins className="w-4 h-4" />
                          <span className="hidden lg:inline">{t("admin_member.page.issue_points_btn")}</span>
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
