"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { MoneyUtil } from "@/lib/utils/money";
import { useTranslation } from "@/i18n/i18n_context";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { ChallengePurpose } from "@/constants/challenge_purpose";

/**
 * Info: (20260813 - Luphia) 後台發放點數給團隊。
 *
 * 與發放給個人的差別必須讓管理員看得見：團隊點數是**離鏈**帳本（ADR 015），
 * 入的是團隊錢包的未分配池，之後由該團隊的管理者再分配給成員。
 *
 * Info: (20260813 - Luphia) 選單改版（實測 2,118 個團隊、622 個撞名）。
 * 原本的 native <select> 抓字母序前 50 筆，第一筆是「aaxzhh331@gmail.com's Team」——
 * 要找的團隊通常根本不在清單裡，就算在也分不出是哪一個同名團隊。三個改動：
 *
 * 1. **從用戶出發**：由用戶列表帶入 `scopedUser` 時只列出該用戶所屬的團隊。
 *    管理員手裡的線索是用戶而非團隊名，這條動線把搜尋整個消掉。
 * 2. **輸入即搜**：改為伺服器端搜尋（同時比對團隊名與擁有者名稱／位址），不再受前 N 筆限制。
 * 3. **每列給足線索**：擁有者、成員數、未分配餘額。撞名時擁有者是唯一能分辨的線索；
 *    餘額則決定「要不要發、發多少」。
 */

export interface ITeamTarget {
  id: string;
  name: string;
  memberCount: number;
  unallocatedBalance: string;
  ownerName: string | null;
  ownerAddress: string | null;
  createdAt: number;
}

export interface IScopedUser {
  id: string;
  name: string | null;
  address: string;
}

interface ITeamPointIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /**
   * Info: (20260813 - Luphia) 自用戶列表開啟時帶入：只列出這位用戶所屬的團隊。
   * 不帶則為全域搜尋模式。
   */
  scopedUser?: IScopedUser | null;
}

const SEARCH_DEBOUNCE_MS = 300;

export function TeamPointIssueModal({
  isOpen,
  onClose,
  onSuccess,
  scopedUser = null,
}: ITeamPointIssueModalProps) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<ITeamTarget[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Info: (20260813 - Luphia) 輸入即搜的節流：每個字元都打一次 API 只會讓清單閃爍
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (scopedUser) params.set("userId", scopedUser.id);
      const res = await request<{ payload: ITeamTarget[] | null }>(
        `/api/v1/admin/team?${params.toString()}`,
      );
      setTeams(res.payload ?? []);
    } catch {
      setError(t("admin_member.modal_issue_team.err_load_teams"));
    } finally {
      setTeamsLoading(false);
    }
  }, [search, scopedUser, t]);

  useEffect(() => {
    if (!isOpen) return;
    fetchTeams();
  }, [isOpen, fetchTeams]);

  // Info: (20260813 - Luphia) 關閉即清空：下次開啟不該殘留上一位用戶的搜尋與選擇
  useEffect(() => {
    if (isOpen) return;
    setSearchInput("");
    setSearch("");
    setSelectedTeamId("");
    setAmount("");
    setError(null);
    setSuccessMsg(null);
  }, [isOpen]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  if (!isOpen) return null;

  const handleIssue = async () => {
    if (!selectedTeamId) {
      setError(t("admin_member.modal_issue_team.err_no_team"));
      return;
    }
    if (MoneyUtil.toDecimal(amount || "0").lte(0)) {
      setError(t("admin_member.modal_issue.err_amount"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Info: (20260813 - Luphia) 發放點數等同發錢：與個人發放一樣要求管理員 FIDO2 簽章
      const { challenge, token } = await getLoginOptions(
        undefined,
        ChallengePurpose.ADMIN_ACTION,
      );
      const authentication = await fido2ClientService.startLogin({ challenge });

      const res = await request<{ success: boolean; message: string }>(
        `/api/v1/admin/team/${selectedTeamId}/issue`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            fido2Signature: { authentication, challengeToken: token },
          }),
        },
      );

      if (!res.success) {
        setError(res.message);
        return;
      }
      setSuccessMsg(
        res.message || t("admin_member.modal_issue_team.success_msg"),
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : t("admin_member.modal_issue.err_msg"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || !!successMsg;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Users className="h-6 w-6 text-orange-500" />
            {t("admin_member.modal_issue_team.title")}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
            className="text-gray-400 transition hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          <p className="text-xs leading-5 text-gray-500">
            {t("admin_member.modal_issue_team.description")}
          </p>

          {/**
           * Info: (20260813 - Luphia) 自用戶列表開啟時明說「只列這位用戶所屬的團隊」，
           * 否則管理員會以為清單壞了（明明有兩千個團隊卻只出現一兩筆）。
           */}
          {scopedUser && (
            <div className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
              {t("admin_member.modal_issue_team.scoped_hint", {
                user:
                  scopedUser.name ||
                  t("admin_member.modal_issue.unnamed_user") ||
                  "",
              })}
            </div>
          )}

          <div>
            <label
              htmlFor="team-issue-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t("admin_member.modal_issue_team.target_team")}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="team-issue-search"
                type="text"
                value={searchInput}
                disabled={busy}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t(
                  "admin_member.modal_issue_team.search_placeholder",
                )}
                className="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-9 text-sm"
              />
            </div>

            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-1">
              {teamsLoading && teams.length === 0 && (
                <div className="flex items-center gap-2 p-3 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("admin_member.page.loading")}
                </div>
              )}
              {!teamsLoading && teams.length === 0 && (
                <p className="p-3 text-xs text-gray-400">
                  {t("admin_member.modal_issue_team.no_result")}
                </p>
              )}
              {teams.map((team) => {
                const active = team.id === selectedTeamId;
                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-orange-50 ring-1 ring-orange-300"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-full truncate text-sm font-medium text-gray-800">
                      {team.name}
                    </span>
                    {/**
                     * Info: (20260813 - Luphia) 擁有者放在第二行：撞名的兩千個
                     * 「<email>'s Team」只能靠這一行分辨。
                     */}
                    <span className="w-full truncate font-mono text-[11px] text-gray-400">
                      {team.ownerName || team.ownerAddress || "—"}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {t("admin_member.modal_issue_team.team_summary", {
                        members: team.memberCount,
                        balance: team.unallocatedBalance,
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="team-points-amount-input"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t("admin_member.modal_issue.amount_label")}
            </label>
            <input
              id="team-points-amount-input"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={busy}
              placeholder={t("admin_member.modal_issue.amount_placeholder")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-6">
          {/* Info: (20260813 - Luphia) 送出前重述「發給誰」：選單捲動後選擇容易被忘記 */}
          <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
            {selectedTeam
              ? t("admin_member.modal_issue_team.confirm_target", {
                  team: selectedTeam.name,
                })
              : t("admin_member.modal_issue_team.err_no_team")}
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              {t("admin_member.modal_issue.cancel_btn")}
            </button>
            <button
              onClick={handleIssue}
              disabled={busy || !selectedTeamId}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("admin_member.modal_issue.confirm_btn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
