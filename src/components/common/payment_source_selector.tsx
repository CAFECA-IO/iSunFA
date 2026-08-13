"use client";

import { Users, Wallet } from "lucide-react";
import type { ITeamOption } from "@/hooks/use_team_quota_payment";
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
  needsTeamSelection = false,
  disabled = false,
}: IPaymentSourceSelectorProps) {
  const { t } = useTranslation();

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
        </div>
      )}
    </div>
  );
}
