"use client";

import { quotaRemainingPercent } from "@/lib/quota/quota_notice";

/**
 * Info: (20260809 - Luphia) 額度儀表僅顯示百分比進度條（產品調整 20260809）：
 * 不揭露 used / limit 具體數字與重置倒數；額度用罄的 resetAt 仍由 402 payload 揭露。
 *
 * 百分比語意為「剩餘」而非「已用」：標籤是「額度」，顯示已用會讓未消費的團隊
 * 看到 0% 而誤解為沒有額度可用。進度條隨消費由滿變空，與剩餘量同向。
 *
 * Info: (20260813 - Luphia) 自 team_wallet_panel 抽出為共用元件：費思的額度不足提示
 * 也要顯示同一組儀表（用戶在錢包頁看到 30%、在費思被擋下，兩處必須是同一套語意與配色，
 * 否則「還有 30% 為什麼不能用」會變成永久的客訴來源）。
 */
export interface IQuotaMeterProps {
  label: string;
  // Info: (20260813 - Luphia) 金額一律字串傳輸（BigInt 零誤差），百分比計算於 lib 層收斂
  limit: string;
  used: string;
}

export default function QuotaMeter({ label, limit, used }: IQuotaMeterProps) {
  const remainingPercent = quotaRemainingPercent(limit, used);
  const barColor =
    remainingPercent <= 0
      ? "bg-red-500"
      : remainingPercent <= 20
        ? "bg-amber-500"
        : "bg-orange-500";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">
          {remainingPercent}%
        </span>
      </div>
      {/**
       * Info: (20260809 - Luphia) 軌道用 bg-surface-hover 而非 bg-gray-100：
       * 深色模式下 --t-100 與 --t-card 同為 --neutral-dark-100（對比 1.00），
       * 軌道會與卡片同色而完全看不見；--t-hover 是為此自成一階的層級。
       */}
      <div className="bg-surface-hover mt-1.5 h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${remainingPercent}%` }}
        />
      </div>
    </div>
  );
}
