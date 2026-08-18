"use client";

import { useEffect, useState, useCallback, useMemo, FormEvent } from "react";

import {
  Users,
  Coins,
  RefreshCw,
  UserCircle,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  Search,
  Gem,
} from "lucide-react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { request } from "@/lib/utils/request";
import {
  PointIssueModal,
  IUserTarget,
} from "@/components/admin/user/point_issue_modal";
import { TeamPointIssueModal } from "@/components/admin/user/team_point_issue_modal";
import { useTranslation } from "@/i18n/i18n_context";
import { Role } from "@/constants/role";
import { IBlockchainDashboardData } from "@/services/admin.blockchain.service";
import { IPagination } from "@/interfaces/admin_billing";
import { MoneyUtil } from "@/lib/utils/money";

interface IMembershipInfo {
  exp: number;
  mode: string;
  modeZh: string;
}

interface IUser {
  id: string;
  name: string | null;
  address: string;
  role: string;
  createdAt: string;
}

export default function MemberAdminPage() {
  const { t } = useTranslation();

  // Info: (20260416 - Luphia) Table & Fetch State
  const [users, setUsers] = useState<IUser[]>([]);
  const [pagination, setPagination] = useState<IPagination>({
    page: 1,
    limit: 15,
    totalPages: 0,
    totalElements: 0,
  });
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Info: (20260416 - Luphia) Balances and Sub-state
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [memberships, setMemberships] = useState<
    Record<string, IMembershipInfo>
  >({});
  const [refreshingBalance, setRefreshingBalance] = useState<string | null>(
    null,
  );
  const [blockchainData, setBlockchainData] =
    useState<IBlockchainDashboardData | null>(null);

  // Info: (20260416 - Luphia) Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUserTarget | null>(null);

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

  const handleRefreshBalance = useCallback(async (userId: string) => {
    if (!userId) return;
    setRefreshingBalance(userId);
    try {
      // Info: (20260416 - Luphia) 1. Fetch token balance
      const resBalance = request<{ success: boolean; payload: number }>(
        `/api/v1/admin/user/${userId}/balance`,
      );

      // Info: (20260416 - Luphia) 2. Fetch membership mode and EXP from on-chain logic
      const resMembership = request<{
        success: boolean;
        payload: IMembershipInfo;
      }>(`/api/v1/admin/user/${userId}/membership`);

      const [balanceData, membershipData] = await Promise.all([
        resBalance,
        resMembership,
      ]);

      if (balanceData.success && balanceData.payload !== undefined) {
        setBalances((prev) => ({ ...prev, [userId]: balanceData.payload }));
      }
      if (membershipData.success && membershipData.payload !== undefined) {
        setMemberships((prev) => ({
          ...prev,
          [userId]: membershipData.payload,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingBalance(null);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "15",
        search: search,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      const res = await request<{
        success: boolean;
        payload: { data: IUser[]; pagination: IPagination };
      }>(`/api/v1/admin/user?${queryParams.toString()}`);
      if (res.success && res.payload) {
        setUsers(res.payload.data);
        setPagination(res.payload.pagination);
        res.payload.data.forEach((u) => {
          handleRefreshBalance(u.id);
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder, handleRefreshBalance]);

  useEffect(() => {
    fetchUsers();
    fetchBlockchainData();
  }, [fetchUsers, fetchBlockchainData]);

  /**
   * Info: (20260813 - Luphia) 發放點數給團隊：與發放給個人是兩件事
   * （團隊點數入離鏈錢包、個人點數是鏈上 mint），因此各自一個入口與 modal。
   */
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  /**
   * Info: (20260813 - Luphia) 自用戶列開啟時把該用戶帶進 modal：清單只列他所屬的團隊。
   * 全域入口（頁首按鈕）維持 null，走搜尋模式。
   */
  const [teamScopedUser, setTeamScopedUser] = useState<IUser | null>(null);

  const openIssueModal = (user: IUser) => {
    setSelectedUser({
      id: user.id,
      name: user.name,
      address: user.address,
    });
    setIsModalOpen(true);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1); // Info: (20260416 - Luphia) Reset page on sort
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const columns = useMemo<IDataTableColumn<IUser>[]>(
    () => [
      {
        key: "name",
        label: t("admin_member.page.th_user"),
        sortable: true,
        render: (user) => (
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
        ),
      },
      {
        key: "role",
        label: t("admin_member.page.th_role"),
        sortable: true,
        render: (user) => (
          <>
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
          </>
        ),
      },
      {
        key: "createdAt",
        label: t("admin_member.page.th_joined_at"),
        sortable: true,
        render: (user) => (
          <span className="text-sm text-gray-600">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "balance",
        label: t("admin_member.page.th_balance"),
        sortable: false,
        render: (user) => (
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
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshingBalance === user.id ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
        ),
      },
      {
        key: "membership",
        label: t("admin_member.page.th_membership", {
          defaultValue: "會員狀態",
        }),
        sortable: false,
        render: (user) => {
          const memInfo = memberships[user.id];
          if (!memInfo)
            return (
              <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                {t("admin_member.page.loading")}
              </span>
            );

          const isGold = memInfo.mode === "Gold";
          const isSilver = memInfo.mode === "Silver";

          return (
            <div className="flex flex-col gap-1">
              <span
                className={`inline-flex w-max items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${isGold ? "bg-amber-100 text-amber-700" : isSilver ? "bg-slate-100 text-slate-700" : "bg-orange-50 text-orange-700"}`}
              >
                <Gem className="h-3 w-3" />
                {t(`admin_member.page.tier_${memInfo.mode.toLowerCase()}`)}
              </span>
              <span className="font-mono text-xs font-semibold tracking-tight text-gray-500">
                {memInfo.exp.toLocaleString()} EXP
              </span>
            </div>
          );
        },
      },
      {
        key: "action",
        label: t("admin_member.page.th_action"),
        align: "right",
        sortable: false,
        render: (user) => (
          <div className="flex items-center justify-end gap-2">
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
            {/**
             * Info: (20260813 - Luphia) 從用戶出發的團隊發放入口：
             * 兩千多個團隊、名稱多為「<email>'s Team」且大量撞名，
             * 靠團隊名搜尋幾乎找不到人；從用戶點進去只會列出他所屬的團隊。
             */}
            <button
              type="button"
              aria-label={t("admin_member.page.issue_team_points_btn")}
              onClick={() => {
                setTeamScopedUser(user);
                setIsTeamModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2 font-medium text-gray-600 transition hover:bg-gray-100"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [balances, refreshingBalance, handleRefreshBalance, memberships, t],
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Info: (20260415 - Luphia) Header & Blockchain Stats */}
        <AdminPageHeader
          icon={Users}
          title={t("admin_member.page.title")!}
          subtitle={t("admin_member.page.subtitle")!}
          rightNode={
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              {/* Info: (20260416 - Luphia) Search Box */}
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex-1 sm:w-64 sm:flex-none"
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  aria-label={t("common.search")}
                  placeholder={t("common.search")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-500 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                />
              </form>

              <button
                type="button"
                onClick={() => {
                  setTeamScopedUser(null);
                  setIsTeamModalOpen(true);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                <Users className="h-4 w-4 shrink-0" />
                {t("admin_member.page.issue_team_points_btn")}
              </button>

              {/* Info: (20260416 - Luphia) 庫存 ICP 數量顯示 */}
              <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white py-1.5 pr-2 pl-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="truncate text-[9px] leading-none font-bold tracking-wider text-gray-400 uppercase">
                      {t("admin_member.page.admin_icp_inventory")}
                    </span>
                    <span className="mt-0.5 text-sm leading-tight font-bold text-gray-800">
                      {blockchainData
                        ? MoneyUtil.formatDynamic(
                            blockchainData.membershipSystemIcpInventory,
                            4,
                          )
                        : "---"}
                    </span>
                  </div>
                </div>
                <div className="h-5 w-px shrink-0 bg-gray-200"></div>
                <Link
                  href="/admin/blockchain"
                  className="flex shrink-0 items-center gap-1 rounded bg-orange-50 px-2 py-1.5 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  {t("admin_member.page.mint")}
                </Link>
              </div>
            </div>
          }
        />

        {/* Info: (20260416 - Luphia) New Admin Data Table */}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          rowKey={(user) => user.id}
          emptyStateText={t("admin_member.page.no_users")}
        />
      </div>

      <TeamPointIssueModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSuccess={fetchBlockchainData}
        scopedUser={teamScopedUser}
      />

      <PointIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetUser={selectedUser}
        onSuccess={() => {
          if (selectedUser?.id) {
            handleRefreshBalance(selectedUser.id);
            fetchBlockchainData();
          }
        }}
      />
    </div>
  );
}
