"use client";

import { Users, Wallet } from "lucide-react";
import QuotaMeter from "@/components/common/quota_meter";
import { useAuth } from "@/contexts/auth_context";
import type { ITeamBalance, ITeamOption } from "@/hooks/use_team_quota_payment";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Luphia) 付款來源選擇（設計書 §5.6）。
 *
 * 兩種來源的差別對用戶是有感的：團隊額度免簽章、當場完成；個人點數是鏈上資產，
 * 需要簽章。因此不自動幫他決定，而是明擺著讓他選。
 *
 * 團隊選單**只在屬於多個團隊時出現**：只有一個團隊時顯示名稱即可，
 * 多問一步只為了消除歧義，不是每個人每次都要選一遍。
 * 沒有任何團隊時整個團隊選項不出現——那不是「不能用」，是根本不適用。
 */

export const PAYMENT_SOURCE = {
  TEAM: "TEAM",
  PERSONAL: "PERSONAL",
} as const;

export type PaymentSource =
  (typeof PAYMENT_SOURCE)[keyof typeof PAYMENT_SOURCE];

interface IPaymentSourceSelectorProps {
  source: PaymentSource;
  onSourceChange: (source: PaymentSource) => void;
  teams: ITeamOption[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  /**
   * Info: (20260813 - Luphia) 選定團隊的可用餘額；未選或取不到即不顯示。
   * 付款前看得到餘額，才不會按下去才發現不夠。
   */
  teamBalance?: ITeamBalance | null;
  // Info: (20260813 - Luphia) server 回報歸屬歧義（TW_TEAM_AMBIGUOUS）時提示要選團隊
  needsTeamSelection?: boolean;
  disabled?: boolean;
}

export default function PaymentSourceSelector({
  source,
  onSourceChange,
  teams,
  selectedTeamId,
  onSelectTeam,
  teamBalance = null,
  needsTeamSelection = false,
  disabled = false,
}: IPaymentSourceSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (teams.length === 0) return null;

  const optionClass = (active: boolean) =>
    `flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
      active
        ? "border-orange-500 bg-orange-50 text-orange-700"
        : "border-gray-200 text-gray-600 hover:bg-gray-50"
    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500">
        {t("payment_source.title")}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSourceChange(PAYMENT_SOURCE.TEAM)}
          className={optionClass(source === PAYMENT_SOURCE.TEAM)}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>{t("payment_source.team")}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSourceChange(PAYMENT_SOURCE.PERSONAL)}
          className={optionClass(source === PAYMENT_SOURCE.PERSONAL)}
        >
          <Wallet className="h-4 w-4 shrink-0" />
          <span>{t("payment_source.personal")}</span>
        </button>
      </div>

      {source === PAYMENT_SOURCE.TEAM && (
        <div className="space-y-1">
          {teams.length === 1 ? (
            // Info: (20260813 - Luphia) 唯一團隊只顯示、不讓選：沒有第二個選項時，選單是多餘的操作
            <p className="text-xs text-gray-500">
              {t("payment_source.single_team", { team: teams[0].name })}
            </p>
          ) : (
            <>
              <select
                value={selectedTeamId ?? ""}
                disabled={disabled}
                onChange={(event) => onSelectTeam(event.target.value)}
                aria-label={t("payment_source.select_team")}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  needsTeamSelection && !selectedTeamId
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <option value="" disabled>
                  {t("payment_source.select_team")}
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {/**
               * Info: (20260813 - Luphia) 多團隊時說明「為什麼要選」：
               * 不說的話，用戶會覺得系統在刁難；說了他才知道這關係到哪個團隊被扣額度。
               */}
              <p className="text-xs text-gray-400">
                {needsTeamSelection
                  ? t("payment_source.team_required")
                  : t("payment_source.multi_team_hint")}
              </p>
            </>
          )}

          {/**
           * Info: (20260813 - Luphia) 選定團隊後顯示該團隊的可用餘額：
           * 雙視窗額度（剩餘百分比，與團隊錢包面板同一元件、同一語意）
           * 加上「分配給我的點數」——扣抵是額度與分配點數依序（物流碳足跡相反），
           * 只看其中一邊會誤判付不付得起。
           */}
          {teamBalance && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <QuotaMeter
                label={t("payment_source.quota_5h")}
                limit={teamBalance.quota5h.limit}
                used={teamBalance.quota5h.used}
              />
              <QuotaMeter
                label={t("payment_source.quota_week")}
                limit={teamBalance.quotaWeek.limit}
                used={teamBalance.quotaWeek.used}
              />
              <p className="text-xs text-gray-500">
                {t("payment_source.allocation_balance", {
                  balance: teamBalance.allocationBalance,
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info: (20260813 - Luphia) 個人點數餘額：與團隊來源對稱，兩邊都看得到自己的餘額 */}
      {source === PAYMENT_SOURCE.PERSONAL && (
        <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
          {t("payment_source.personal_balance", {
            balance: user?.credits ?? "—",
          })}
        </p>
      )}
    </div>
  );
}
