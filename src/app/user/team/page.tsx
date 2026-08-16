"use client";

import { useState, useEffect, useCallback, useMemo, FormEvent } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import {
  Users,
  UserCircle2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Book,
  Coins,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { getLoginOptions } from "@/lib/auth/fido2_client";
import { requestAssertion } from "@/lib/auth/assertion_client";
import ConfirmModal from "@/components/common/confirm_modal";
import InviteMemberModal from "@/components/team/invite_member_modal";
import TeamWalletPanel, {
  type ITeamWalletInfo,
  type TeamWalletFetchStatus,
} from "@/components/team/team_wallet_panel";
import AllocationModal from "@/components/team/allocation_modal";
import {
  ALLOCATION_DIRECTION,
  type AllocationDirection,
} from "@/constants/subscription_quota";
import { IAccountBook } from "@/interfaces/account_book";

interface ITeam {
  id: string;
  name: string;
  accountBooks?: IAccountBook[];
}
interface ITeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  user?: { address: string; name: string | null; imageUrl: string | null };
}
interface IPendingInvitation {
  id: string;
  team: { id: string; name: string };
  inviter: { name: string | null; address: string; imageUrl: string | null };
  role: string;
  inviteeAddress?: string;
  // Info: (20260815 - Luphia) email 邀請沒有位址，改以信箱識別（規範 §4 / P4）
  inviteeEmail?: string;
}

export default function TeamManagementPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    IPendingInvitation[]
  >([]);
  const [sentInvitations, setSentInvitations] = useState<IPendingInvitation[]>(
    [],
  );
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  // Info: (20260815 - Luphia) 正在撤回的邀請（產品拍板 20260815：撤回不退費，但席次可再用）
  const [revokingId, setRevokingId] = useState<string | null>(null);
  // Info: (20260816 - Luphia) 正在拒絕的邀請（條款 §3.6：拒絕即釋出席次）
  const [decliningId, setDecliningId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Info: (20260809 - Luphia) 團隊錢包與分配操作（成員卡片上的分配 / 收回）
  const [teamWallet, setTeamWallet] = useState<ITeamWalletInfo | null>(null);
  // Info: (20260809 - Luphia) 載入狀態外顯，讓「載入中」與「載入失敗」在畫面上可分辨
  const [walletStatus, setWalletStatus] =
    useState<TeamWalletFetchStatus>("loading");
  const [allocationModal, setAllocationModal] = useState<{
    member: ITeamMember;
    direction: AllocationDirection;
  } | null>(null);
  const [allocating, setAllocating] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showAlert = (message: string, title = t("common.notification")) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isConfirm: false,
    });
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title = t("common.confirm"),
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm,
    });
  };

  const fetchTeams = useCallback(async () => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setTeams(json.payload || []);
        if (json.payload?.length > 0 && !selectedTeamId)
          setSelectedTeamId(json.payload[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  const fetchPendingInvitations = useCallback(async () => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team/invitations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setPendingInvitations(json.payload || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchSentInvitations = useCallback(async (teamId: string) => {
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${teamId}/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setSentInvitations(json.payload || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchPendingInvitations();
  }, [fetchTeams, fetchPendingInvitations]);

  const fetchMembers = useCallback(
    async (teamId: string) => {
      setMembersLoading(true);
      try {
        const token = localStorage.getItem("dewt");
        const res = await fetch(`/api/v1/user/team/${teamId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setMembers(json.payload || []);
        await fetchSentInvitations(teamId);
      } catch {
        console.error("Error fetching members");
      } finally {
        setMembersLoading(false);
      }
    },
    [fetchSentInvitations],
  );

  useEffect(() => {
    if (selectedTeamId) fetchMembers(selectedTeamId);
  }, [selectedTeamId, fetchMembers]);

  /**
   * Info: (20260809 - Luphia) 錢包資料由頁面單一 fetch（產品調整 20260809）：
   * 成員清單的分配點數 badge 與錢包面板共用，分配 / 收回後重拉。
   * 一般成員的回應僅含自己的 myAllocationBalance（後端零信任收斂）。
   */
  const fetchTeamWallet = useCallback(async (teamId: string) => {
    setWalletStatus("loading");
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${teamId}/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "wallet fetch failed");
      setTeamWallet(json.payload);
      setWalletStatus("ready");
    } catch (err) {
      console.error("Error fetching team wallet:", err);
      setTeamWallet(null);
      setWalletStatus("error");
    }
  }, []);

  const retryTeamWallet = useCallback(() => {
    if (selectedTeamId) fetchTeamWallet(selectedTeamId);
  }, [selectedTeamId, fetchTeamWallet]);

  useEffect(() => {
    setTeamWallet(null);
    if (selectedTeamId) fetchTeamWallet(selectedTeamId);
  }, [selectedTeamId, fetchTeamWallet]);

  const currentTeam = teams.find((t) => t.id === selectedTeamId);
  const currentUserMember = members.find(
    (m) => m.user?.address === user?.address,
  );
  const isOwnerOrAdmin =
    currentUserMember?.role === "OWNER" || currentUserMember?.role === "ADMIN";
  const isOwner = currentUserMember?.role === "OWNER";

  /**
   * Info: (20260809 - Luphia) 成員分配點數對照表：管理者見全員（allocations），
   * 一般成員僅見自己（myAllocationBalance）——與後端回傳範圍一致。
   * 尚未分配過的成員在 allocations 中沒有列，視為 0（而非不顯示）。
   */
  const allocationByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    if (teamWallet?.allocations) {
      teamWallet.allocations.forEach((a) => {
        map[a.userId] = a.balance;
      });
    }
    if (teamWallet && currentUserMember) {
      map[currentUserMember.userId] = teamWallet.myAllocationBalance;
    }
    return map;
  }, [teamWallet, currentUserMember]);

  // Info: (20260809 - Luphia) 可見範圍：管理者見全員、一般成員僅見自己
  const canSeeAllocation = (userId: string) =>
    Boolean(teamWallet) &&
    (isOwnerOrAdmin || userId === currentUserMember?.userId);
  const allocationOf = (userId: string) => allocationByUserId[userId] ?? "0";

  const handleAllocationConfirm = async (amount: string) => {
    if (!allocationModal || !selectedTeamId) return;
    if (!/^\d+$/.test(amount) || amount === "0") {
      showAlert(t("team_management.wallet.invalid_amount"));
      return;
    }
    setAllocating(true);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(
        `/api/v1/user/team/${selectedTeamId}/wallet/allocations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: allocationModal.member.userId,
            amount,
            direction: allocationModal.direction,
            idempotencyKey: `ui:${selectedTeamId}:${allocationModal.member.userId}:${allocationModal.direction}:${amount}:${Date.now()}`,
          }),
        },
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(
          json.message || t("team_management.wallet.allocation_failed"),
        );
      }
      setAllocationModal(null);
      showAlert(t("team_management.wallet.allocation_success"));
      await fetchTeamWallet(selectedTeamId);
    } catch (err) {
      showAlert(
        (err as Error).message || t("team_management.wallet.allocation_failed"),
      );
    } finally {
      setAllocating(false);
    }
  };

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/user/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTeamName }),
      });
      const json = await res.json();
      if (json.success) {
        setNewTeamName("");
        setIsCreateModalOpen(false);
        fetchTeams();
        setSelectedTeamId(json.payload.id);
        showAlert(t("team_management.alerts.create_success"));
      } else showAlert(json.message);
    } catch {
      showAlert(t("team_management.alerts.error_create"));
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateName = async () => {
    if (!selectedTeamId || !tempName.trim() || tempName === currentTeam?.name)
      return setEditingName(false);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/team/${selectedTeamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: tempName }),
      });
      const json = await res.json();
      if (json.success) {
        setTeams(
          teams.map((t) =>
            t.id === selectedTeamId ? { ...t, name: tempName } : t,
          ),
        );
        setEditingName(false);
        showAlert(t("team_management.alerts.update_success"));
      } else showAlert(json.message);
    } catch {
      showAlert(t("team_management.alerts.error_update"));
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user?.address) return;
    setAcceptingId(inviteId);
    try {
      const { challenge } = await getLoginOptions(user.address);
      // Info: (20260811 - Luphia) 走 requestAssertion，託管帳號才不會卡在永遠不會成功的系統對話框
      const authentication = await requestAssertion({
        challenge,
        custody: user.custody,
      });
      const token = localStorage.getItem("dewt");
      const res = await fetch(
        `/api/v1/user/team/invitations/${inviteId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ authentication }),
        },
      );
      const json = await res.json();
      if (json.success) {
        fetchPendingInvitations();
        fetchTeams();
        showAlert(t("team_management.alerts.accept_success"));
      } else showAlert(json.message);
    } catch {
      showAlert(t("team_management.alerts.error_accept"));
    } finally {
      setAcceptingId(null);
    }
  };

  /**
   * Info: (20260816 - Luphia) 拒絕收到的邀請（條款 §3.6）。
   *
   * 與接受不同，**不要求 FIDO2 簽章**：接受會讓你成為一個握有他人帳務資料的
   * 團隊成員，拒絕則什麼都不會發生，只是把一個位置還回去。
   * 為零後果的動作要求簽章，換來的是沒有人會按它。
   */
  const handleDeclineInvite = async (inviteId: string) => {
    setDecliningId(inviteId);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(
        `/api/v1/user/team/invitations/${inviteId}/decline`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = await res.json();
      if (json.success) {
        fetchPendingInvitations();
        showAlert(t("team_management.alerts.decline_success"));
      } else showAlert(json.message);
    } catch {
      showAlert(t("team_management.alerts.error_decline"));
    } finally {
      setDecliningId(null);
    }
  };

  /**
   * Info: (20260815 - Luphia) 撤回尚未接受的邀請（產品拍板 20260815）。
   * 費用不退，但那一席會立刻空出來給下一次邀請使用——所以提示要講清楚，
   * 否則管理員會以為自己按下的是「把錢丟掉」。
   */
  const handleRevokeInvite = async (inviteId: string) => {
    if (!selectedTeamId) return;
    setRevokingId(inviteId);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(
        `/api/v1/user/team/${selectedTeamId}/invitations/${inviteId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = await res.json();
      if (json.success) {
        fetchSentInvitations(selectedTeamId);
        showAlert(t("team_management.alerts.revoke_success"));
      } else showAlert(json.message);
    } catch {
      showAlert(t("team_management.alerts.error_revoke"));
    } finally {
      setRevokingId(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!selectedTeamId) return;
    try {
      if (!user?.address) return;
      const { challenge } = await getLoginOptions(user.address);
      // Info: (20260811 - Luphia) 走 requestAssertion，託管帳號才不會卡在永遠不會成功的系統對話框
      const authentication = await requestAssertion({
        challenge,
        custody: user.custody,
      });
      const token = localStorage.getItem("dewt");
      const res = await fetch(
        `/api/v1/user/team/${selectedTeamId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole, authentication }),
        },
      );
      const json = await res.json();
      if (json.success) {
        fetchMembers(selectedTeamId);
        showAlert(t("team_management.alerts.role_success"));
      } else showAlert(json.message);
    } catch {
      showAlert(t("team_management.alerts.error_role"));
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!selectedTeamId) return;
    showConfirm(t("team_management.confirm_remove_label"), async () => {
      try {
        if (!user?.address) return;
        const { challenge } = await getLoginOptions(user.address);
        // Info: (20260811 - Luphia) 走 requestAssertion，託管帳號才不會卡在永遠不會成功的系統對話框
        const authentication = await requestAssertion({
          challenge,
          custody: user.custody,
        });
        const token = localStorage.getItem("dewt");
        const res = await fetch(
          `/api/v1/user/team/${selectedTeamId}/members/${memberId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ authentication }),
          },
        );
        const json = await res.json();
        if (json.success) {
          showAlert(t("team_management.alerts.remove_success"));
          if (memberId === currentUserMember?.id) {
            setSelectedTeamId(null);
            fetchTeams();
          } else fetchMembers(selectedTeamId);
        } else showAlert(json.message);
      } catch {
        showAlert(t("team_management.alerts.error_remove"));
      }
    });
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="size-8 shrink-0 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("team_management.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("team_management.description")}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="mr-2 size-4 shrink-0" />
            {t("team_management.create_team")}
          </button>
        </div>

        {pendingInvitations.length > 0 && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-orange-900">
              {t("team_management.pending_invitations")}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col justify-between rounded-xl border border-orange-100 bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <Users className="size-5 shrink-0 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {inv.team.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        From {inv.inviter.name || "Unknown"} as{" "}
                        {t("team_management.roles." + inv.role)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcceptInvite(inv.id)}
                    disabled={acceptingId === inv.id}
                    className="w-full rounded-lg bg-orange-600 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
                  >
                    {acceptingId === inv.id
                      ? t("team_management.accepting")
                      : t("team_management.accept_via_fido2")}
                  </button>
                  {/**
                   * Info: (20260816 - Luphia) 拒絕邀請（條款 §3.6）。
                   * 沒有這顆按鈕，不想加入的人只能放著不理，
                   * 而那一席會一直算在邀請方的帳上直到下次續訂才重算。
                   */}
                  <button
                    onClick={() => handleDeclineInvite(inv.id)}
                    disabled={decliningId === inv.id || acceptingId === inv.id}
                    className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
                  >
                    {decliningId === inv.id
                      ? t("team_management.declining")
                      : t("team_management.decline_invite")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="w-full shrink-0 space-y-2 md:w-64">
            {teams.map((teamData) => (
              <button
                key={teamData.id}
                onClick={() => setSelectedTeamId(teamData.id)}
                className={`group flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-left transition-colors ${selectedTeamId === teamData.id ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200" : "border border-transparent bg-white text-gray-700 shadow-sm hover:bg-gray-50"}`}
              >
                <Users
                  className={`size-5 shrink-0 ${selectedTeamId === teamData.id ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}`}
                />
                <span className="truncate font-medium">{teamData.name}</span>
              </button>
            ))}
            {teams.length === 0 && (
              <div className="rounded-xl border bg-white p-4 text-center text-sm text-gray-500 shadow-sm">
                {t("team_management.no_teams")}
              </div>
            )}
          </div>

          {selectedTeamId && currentTeam && (
            <div className="flex-1 space-y-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                {/* Info: (20260809 - Luphia) border 需明確帶色：Tailwind v4 預設 currentColor，
                    深色模式會繼承近白文字色變成亮白分隔線 */}
                <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
                  {editingName ? (
                    <div className="flex w-full max-w-sm items-center space-x-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        aria-label={t("team_management.team_name")}
                        className="w-full flex-1 rounded-t border-b-2 border-orange-500 bg-gray-50 px-3 py-1.5 text-lg font-semibold text-gray-900 focus:outline-none"
                      />
                      <button
                        onClick={handleUpdateName}
                        className="rounded p-1.5 text-green-600 hover:bg-green-50"
                      >
                        <Check className="size-5 shrink-0" />
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="size-5 shrink-0" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {currentTeam.name}
                      </h2>
                      {isOwnerOrAdmin && (
                        <button
                          onClick={() => {
                            setTempName(currentTeam.name);
                            setEditingName(true);
                          }}
                          className="p-1 text-gray-400 transition-colors hover:text-orange-600"
                        >
                          <Pencil className="size-4 shrink-0" />
                        </button>
                      )}
                    </div>
                  )}
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 sm:w-auto"
                    >
                      <Plus className="mr-2 size-4 shrink-0" />{" "}
                      {t("team_management.invite_member")}
                    </button>
                  )}
                </div>

                {membersLoading ? (
                  <div className="text-sm text-gray-500">
                    Loading members...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="group relative block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="rounded-lg bg-orange-50 p-2 transition-colors group-hover:bg-orange-50">
                              <UserCircle2 className="size-6 shrink-0 text-orange-500" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900 transition-colors group-hover:text-orange-600">
                                {member.user?.name || "Anonymous"}
                                {member.user?.address === user?.address && (
                                  <span className="ml-2 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-500">
                                    {t("team_management.you")}
                                  </span>
                                )}
                              </h3>
                              <p className="mt-1 w-32 truncate font-mono text-xs break-all text-gray-500">
                                {member.user?.address}
                              </p>
                              {/* Info: (20260809 - Luphia) 分配點數 badge：管理者見全員、成員僅見自己（與後端回傳一致） */}
                              {canSeeAllocation(member.userId) && (
                                <p
                                  className="mt-1 flex items-center gap-1 text-xs font-medium text-orange-600 tabular-nums"
                                  title={t(
                                    "team_management.wallet.allocated_points",
                                  )}
                                >
                                  <Coins className="size-3.5 shrink-0" />
                                  {allocationOf(member.userId)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            {isOwner &&
                            member.user?.address !== user?.address &&
                            member.role !== "OWNER" ? (
                              <select
                                aria-label="Role"
                                value={member.role}
                                onChange={(e) =>
                                  handleChangeRole(member.id, e.target.value)
                                }
                                className="rounded-md border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                              >
                                <option value="ADMIN">
                                  {t("team_management.roles.ADMIN")}
                                </option>
                                <option value="EDITOR">
                                  {t("team_management.roles.EDITOR")}
                                </option>
                                <option value="VIEWER">
                                  {t("team_management.roles.VIEWER")}
                                </option>
                              </select>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                {t("team_management.roles." + member.role)}
                              </span>
                            )}
                            <div className="flex items-center space-x-1">
                              {/* Info: (20260809 - Luphia) 分配 / 收回入口移至成員卡片（產品調整 20260809），開啟輸入點數的確認視窗 */}
                              {isOwnerOrAdmin && (
                                <>
                                  <button
                                    onClick={() =>
                                      setAllocationModal({
                                        member,
                                        direction:
                                          ALLOCATION_DIRECTION.ALLOCATE,
                                      })
                                    }
                                    className="p-1 text-gray-400 transition-colors hover:text-orange-600"
                                    title={t("team_management.wallet.allocate")}
                                  >
                                    <PlusCircle className="size-3.5 shrink-0" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setAllocationModal({
                                        member,
                                        direction: ALLOCATION_DIRECTION.REVOKE,
                                      })
                                    }
                                    className="p-1 text-gray-400 transition-colors hover:text-orange-600"
                                    title={t("team_management.wallet.revoke")}
                                  >
                                    <MinusCircle className="size-3.5 shrink-0" />
                                  </button>
                                </>
                              )}
                              {(isOwner ||
                                member.user?.address === user?.address) && (
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-1 text-gray-400 transition-colors hover:text-red-500"
                                  title="Remove Member"
                                >
                                  <Trash2 className="size-3.5 shrink-0" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sentInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-4 opacity-75"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="rounded-lg bg-white p-2">
                              <UserCircle2 className="size-6 shrink-0 text-gray-300" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-500">
                                {t("team_management.pending_invite")}
                              </h3>
                              <p className="mt-1 w-32 truncate font-mono text-xs break-all text-gray-400">
                                {/* Info: (20260815 - Luphia) email 邀請沒有位址，顯示信箱 */}
                                {inv.inviteeEmail || inv.inviteeAddress}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                              {t("team_management.pending")}
                            </span>
                            {isOwnerOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(inv.id)}
                                disabled={revokingId === inv.id}
                                title={t("team_management.revoke_invite_hint")}
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-50"
                              >
                                {t("team_management.revoke_invite")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentTeam.accountBooks &&
                  currentTeam.accountBooks.length > 0 && (
                    <div className="mt-8 border-t border-gray-100 pt-6">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">
                        {t("team_management.account_books")}
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
                        {currentTeam.accountBooks.map((ab: IAccountBook) => (
                          <div
                            key={ab.id}
                            className="group flex items-start space-x-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500"
                          >
                            <div className="rounded-lg bg-orange-50 p-2 transition-colors group-hover:bg-orange-100">
                              <Book className="size-5 shrink-0 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 transition-colors group-hover:text-orange-600">
                                {ab.name}
                              </h4>
                              <p className="mt-1 text-xs text-gray-500">
                                {ab.country} • {ab.currency} • {ab.rule}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Info: (20260809 - Luphia) 團隊錢包與訂閱額度面板：錢包資料由本頁 fetch 傳入，
                    分配操作已移至上方成員卡片 */}
                <TeamWalletPanel
                  key={currentTeam.id}
                  teamId={currentTeam.id}
                  wallet={teamWallet}
                  walletStatus={walletStatus}
                  isManager={isOwnerOrAdmin}
                  onRetryWallet={retryTeamWallet}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {allocationModal && (
        <AllocationModal
          isOpen
          direction={allocationModal.direction}
          memberName={
            allocationModal.member.user?.name ||
            allocationModal.member.user?.address ||
            allocationModal.member.userId
          }
          max={
            allocationModal.direction === ALLOCATION_DIRECTION.ALLOCATE
              ? (teamWallet?.unallocatedBalance ?? "0")
              : allocationOf(allocationModal.member.userId)
          }
          submitting={allocating}
          onClose={() => setAllocationModal(null)}
          onConfirm={handleAllocationConfirm}
        />
      )}

      <Dialog
        open={isCreateModalOpen}
        onClose={() => !creating && setIsCreateModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {t("team_management.create_new_team")}
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="size-5 shrink-0" />
                </button>
              </div>
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label
                    htmlFor="team-name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("team_management.team_name")}
                  </label>
                  <input
                    id="team-name"
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    disabled={creating}
                    aria-label={t("team_management.team_name")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    placeholder={t("team_management.enter_team_name")}
                  />
                </div>
                <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={creating}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
                  >
                    {t("team_management.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newTeamName.trim()}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 sm:w-auto"
                  >
                    {creating
                      ? t("team_management.creating")
                      : t("team_management.create_team")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Dialog>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        selectedTeamId={selectedTeamId || ""}
        onSuccess={() => selectedTeamId && fetchSentInvitations(selectedTeamId)}
        showAlert={showAlert}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={
          confirmModal.isConfirm ? t("common.confirm") : t("common.ok")
        }
        cancelText={confirmModal.isConfirm ? t("common.cancel") : undefined}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
