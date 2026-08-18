"use client";

import { FC } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Infinity as InfinityIcon,
} from "lucide-react";
import { LeaveQuotaMode } from "@/constants/leave_policy";
import { IEmployeeGrantSummary } from "@/interfaces/leave_balance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 餘額卡片。
 *
 * ## 為什麼同時顯示分鐘與天
 *
 * 帳本的單位是分鐘（ADR 022 §2），但沒有人用分鐘思考請假。
 * 換算在**這一層**做而不是在 API：日約當分鐘依假別、依班別而不同，
 * 在 API 折成天會把那個資訊丟掉，而丟掉之後就補不回來了。
 *
 * ## `UNLIMITED` 不顯示數字
 *
 * 公傷病假與產假沒有額度可扣。顯示「0 分鐘」會讓人以為請不了，
 * 顯示「剩餘 N」則是憑空捏造一個上限 —— 兩者都不對，所以顯示「不限額度」。
 */
const LeaveBalanceCards: FC<{
  balances: IEmployeeGrantSummary[];
  /**
   * Info: (20260818 - Julian) 換算依據的**後備值**，不是主要來源。
   *
   * 主要來源是每一張餘額自己帶的 `dayEquivalentMinutes`（該假別最新一批的
   * 固化值）—— 那個值一進畫面就有，不必等試算。這個 prop 只在餘額沒有任何
   * 批次時派上用場（例如剛建好、還沒授予過的自訂假別），
   * 而呼叫端手上剛好有一份試算結果時可以補上。
   */
  dayEquivalentMinutes: number;
  selectedPolicyId: string | null;
  onSelect?: (leavePolicyId: string) => void;
}> = ({
  balances,
  dayEquivalentMinutes,
  selectedPolicyId,
  // Info: (20260817 - Julian) 未給 onSelect 即為唯讀模式（卡片不可點）
  onSelect = undefined,
}) => {
  const { t } = useTranslation();

  if (balances.length === 0) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        {t("hr_management.leave.balance_empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {balances.map((balance) => {
        const unlimited = balance.quotaMode === LeaveQuotaMode.UNLIMITED;
        const perDayMinutes =
          balance.dayEquivalentMinutes ?? dayEquivalentMinutes;
        const days =
          perDayMinutes > 0 ? balance.remainingMinutes / perDayMinutes : null;
        const selected = balance.leavePolicyId === selectedPolicyId;

        return (
          <button
            key={balance.leavePolicyId}
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(balance.leavePolicyId)}
            className={`rounded-2xl bg-white p-4 text-left ring-1 transition ${
              selected
                ? "ring-2 ring-sky-500"
                : "ring-gray-200 hover:ring-gray-300"
            } ${onSelect ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {balance.leavePolicyName}
              </span>

              {/**
               * Info: (20260818 - Julian) 手機版點卡片會從下方彈出請假表單，
               * 而小尺寸沒有 hover 可以暗示「這張卡片可以點」—— 用箭頭說出來。
               * 桌機的卡片只是選取（表單一直在旁邊），沒有東西會彈出，故不顯示。
               */}
              {onSelect && (
                <ChevronRight className="size-4 shrink-0 text-gray-300 lg:hidden" />
              )}
            </div>

            {unlimited ? (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                <InfinityIcon className="size-4" />
                {t("hr_management.leave.balance_unlimited")}
              </div>
            ) : (
              <>
                <div className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">
                  {days === null ? "—" : days.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-gray-500">
                    {t("hr_management.leave.unit_day")}
                  </span>
                </div>
                {/**
                 * Info: (20260817 - Julian) 分鐘數也印出來：換算成天會產生小數，
                 * 而「3.5 天」與「1680 分鐘」在對帳時是兩個不同的問題。
                 */}
                <div className="mt-0.5 font-mono text-xs text-gray-400">
                  {balance.remainingMinutes}{" "}
                  {t("hr_management.leave.unit_minute")}
                </div>
              </>
            )}

            {balance.nextExpiresOn && !unlimited && (
              <div className="mt-2 text-xs text-gray-500">
                {t("hr_management.leave.balance_next_expiry", {
                  date: balance.nextExpiresOn,
                })}
              </div>
            )}

            {/**
             * Info: (20260817 - Julian) 從未勾稽過要說出來。
             *
             * 「不知道對不對」與「勾稽過且相符」是兩件事 ——
             * 把前者顯示成後者，等於用沉默宣稱一件沒有被驗證的事
             * （`LeaveBalanceHealth.STALE` 與 `OK` 分開的同一個理由）。
             */}
            {balance.reconciledAt === null && !unlimited && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="size-3.5" />
                {t("hr_management.leave.balance_never_reconciled")}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default LeaveBalanceCards;
