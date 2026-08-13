"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Users, X } from "lucide-react";
import { request } from "@/lib/utils/request";
import { MoneyUtil } from "@/lib/utils/money";
import { useTranslation } from "@/i18n/i18n_context";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { ChallengePurpose } from "@/constants/challenge_purpose";

/**
 * Info: (20260813 - Luphia) 後台發放點數給團隊。
 *
 * 與發放給個人的差別必須讓管理員看得見：團隊點數是**離鏈**帳本（ADR 015），
 * 入的是團隊錢包的未分配池，之後由該團隊的管理者再分配給成員；
 * 不像個人點數那樣是鏈上 mint。因此另做一個 modal 而非在原本的表單塞一個切換，
 * 讓「發給誰、進哪本帳」在畫面上是分開的兩件事。
 */

export interface ITeamTarget {
  id: string;
  name: string;
  memberCount: number;
  unallocatedBalance: string;
}

interface ITeamPointIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeamPointIssueModal({
  isOpen,
  onClose,
  onSuccess,
}: ITeamPointIssueModalProps) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<ITeamTarget[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const fetchTeams = async () => {
      try {
        const res = await request<{ payload: ITeamTarget[] | null }>(
          "/api/v1/admin/team",
        );
        if (active) setTeams(res.payload ?? []);
      } catch {
        if (active) setError(t("admin_member.modal_issue_team.err_load_teams"));
      }
    };
    fetchTeams();
    return () => {
      active = false;
    };
  }, [isOpen, t]);

  if (!isOpen) return null;

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

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
        setAmount("");
        setSelectedTeamId("");
        setSuccessMsg(null);
      }, 1500);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : t("admin_member.modal_issue.err_msg"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
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

        <div className="space-y-6 p-6">
          <p className="text-xs leading-5 text-gray-500">
            {t("admin_member.modal_issue_team.description")}
          </p>

          <div>
            <label
              htmlFor="team-issue-select"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t("admin_member.modal_issue_team.target_team")}
            </label>
            <select
              id="team-issue-select"
              value={selectedTeamId}
              disabled={isLoading || !!successMsg}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">
                {t("admin_member.modal_issue_team.select_team")}
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {/**
             * Info: (20260813 - Luphia) 發放前先看現況：只憑印象決定發多少，
             * 最後不是重複發放就是發得不夠。
             */}
            {selectedTeam && (
              <p className="mt-2 text-xs text-gray-500">
                {t("admin_member.modal_issue_team.team_summary", {
                  members: selectedTeam.memberCount,
                  balance: selectedTeam.unallocatedBalance,
                })}
              </p>
            )}
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
              disabled={isLoading || !!successMsg}
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

        <div className="flex justify-end gap-2 border-t border-gray-100 p-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            {t("admin_member.modal_issue.cancel_btn")}
          </button>
          <button
            onClick={handleIssue}
            disabled={isLoading || !!successMsg}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("admin_member.modal_issue.confirm_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}
