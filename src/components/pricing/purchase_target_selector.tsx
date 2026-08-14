"use client";

import { AlertCircle, Users, Wallet } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260814 - Luphia) 訂閱 / 購點的歸屬對象選擇（設計書 §6.1、§7）。
 *
 * 這與付款來源選擇（`payment_source_selector`）看似相像，語意卻相反：
 * 那邊問的是「這筆錢從哪裡出」，這邊問的是「買到的東西灌進誰的帳」。
 * 訂閱只能屬於團隊——額度是掛在 `TeamSubscription` 上的，沒有「個人訂閱」這種東西；
 * 點數則兩者皆可：個人點數是鏈上資產，團隊點數入池後可再分配給成員。
 */

export const PURCHASE_TARGET = {
  TEAM: "TEAM",
  PERSONAL: "PERSONAL",
} as const;

export type PurchaseTarget =
  (typeof PURCHASE_TARGET)[keyof typeof PURCHASE_TARGET];

export interface IPurchaseTeamOption {
  id: string;
  name: string;
}

interface IPurchaseTargetSelectorProps {
  target: PurchaseTarget;
  onTargetChange: (target: PurchaseTarget) => void;
  // Info: (20260814 - Luphia) 已依權限過濾過的團隊：訂閱限 OWNER、購點限 OWNER / ADMIN
  teams: IPurchaseTeamOption[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  /**
   * Info: (20260814 - Luphia) 訂閱沒有個人選項，只出團隊清單；
   * 購點兩者皆可，才需要那排切換鈕。
   */
  allowPersonal: boolean;
  // Info: (20260814 - Luphia) 權限不足或沒有團隊時的說明，取代選單顯示
  unavailableHint?: string | null;
  disabled?: boolean;
}

export default function PurchaseTargetSelector({
  target,
  onTargetChange,
  teams,
  selectedTeamId,
  onSelectTeam,
  allowPersonal,
  unavailableHint = null,
  disabled = false,
}: IPurchaseTargetSelectorProps) {
  const { t } = useTranslation();

  const optionClass = (active: boolean) =>
    `flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
      active
        ? "border-orange-500 bg-orange-50 text-orange-700"
        : "border-gray-200 text-gray-600 hover:bg-gray-50"
    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900">
        {allowPersonal
          ? t("purchase_target.credits_title")
          : t("purchase_target.subscription_title")}
      </h4>

      {allowPersonal && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTargetChange(PURCHASE_TARGET.PERSONAL)}
            className={optionClass(target === PURCHASE_TARGET.PERSONAL)}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span>{t("purchase_target.personal")}</span>
          </button>
          <button
            type="button"
            disabled={disabled || teams.length === 0}
            onClick={() => onTargetChange(PURCHASE_TARGET.TEAM)}
            className={optionClass(target === PURCHASE_TARGET.TEAM)}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>{t("purchase_target.team")}</span>
          </button>
        </div>
      )}

      {/**
       * Info: (20260814 - Luphia) 沒有可用團隊時直說原因（不是團隊擁有者／還沒有團隊），
       * 而不是給一個永遠選不到東西的空下拉——後者只會讓人以為系統壞了。
       */}
      {unavailableHint && target === PURCHASE_TARGET.TEAM && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{unavailableHint}</span>
        </div>
      )}

      {target === PURCHASE_TARGET.TEAM && teams.length > 0 && (
        <div className="space-y-1">
          {teams.length === 1 ? (
            // Info: (20260814 - Luphia) 只有一個團隊就顯示名稱，不必多按一次
            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              {t("purchase_target.single_team", { team: teams[0].name })}
            </p>
          ) : (
            <>
              <select
                value={selectedTeamId ?? ""}
                disabled={disabled}
                onChange={(event) => onSelectTeam(event.target.value)}
                aria-label={t("purchase_target.select_team")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  {t("purchase_target.select_team")}
                </option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                {t("purchase_target.multi_team_hint")}
              </p>
            </>
          )}
        </div>
      )}

      {target === PURCHASE_TARGET.PERSONAL && (
        <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
          {t("purchase_target.personal_hint")}
        </p>
      )}
    </div>
  );
}
