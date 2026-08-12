"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BatteryCharging, BatteryWarning, Coins, Rocket } from "lucide-react";
import { QUOTA_WINDOW } from "@/constants/subscription_quota";
import type { IQuotaExceededPayload } from "@/interfaces/team_wallet";
import {
  describeQuotaCountdown,
  resolveQuotaResetAt,
} from "@/lib/quota/quota_notice";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260812 - Luphia) 費思對話點數用盡的提示（設計書 §5「等待重置」出路 + 導購）。
 *
 * 三件事，一件都不能少：
 * 1. 說清楚「為什麼不能用」——是 5 小時視窗還是本週額度用罄；
 * 2. 說清楚「什麼時候可以再用」——倒數 + 當地時間，兩者並列（倒數回答「還要多久」，
 *    絕對時間回答「是幾點」，只給一種都會有人算錯）；
 * 3. 給出路——買點數或升級方案。
 *
 * 刻意不揭露 used / limit 具體數字：與團隊錢包面板的額度儀表（產品調整 20260809，
 * 見 team_wallet_panel.tsx）一致，僅百分比與重置時間對外可見。
 *
 * 倒數歸零時呼叫 onReset 解除輸入鎖，讓用戶不必重整頁面才知道額度回來了；
 * 此時卡片改為「已恢復」文案而非直接消失——時鐘偏移導致 resetAt 一開始就過期時，
 * 直接消失會變成閃一下就不見，用戶根本不知道剛才發生什麼事。
 */

interface IQuotaExceededNoticeProps {
  payload: IQuotaExceededPayload;
  onReset: () => void;
}

const pad2 = (value: number) => String(value).padStart(2, "0");

export default function QuotaExceededNotice({
  payload,
  onReset,
}: IQuotaExceededNoticeProps) {
  const { t, language } = useTranslation();
  const resetAt = resolveQuotaResetAt(payload);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const countdown = describeQuotaCountdown(resetAt, nowSec);

  // Info: (20260812 - Luphia) 倒數歸零後停掉計時器：卡片已無倒數可更新
  useEffect(() => {
    if (countdown.expired) return undefined;
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [countdown.expired]);

  useEffect(() => {
    if (countdown.expired) onReset();
  }, [countdown.expired, onReset]);

  /**
   * Info: (20260812 - Luphia) 絕對時間以瀏覽器時區呈現：resetAt 是 epoch 秒（UTC 基準），
   * 由 Intl 依用戶語言與所在時區格式化，不在前端手算 UTC+8 偏移。
   */
  const resetAtText = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return formatter.format(new Date(resetAt * 1000));
  }, [language, resetAt]);

  const countdownText = countdown.days
    ? t("chat.quota_exceeded.countdown_days", {
        days: countdown.days,
        hours: countdown.hours,
      })
    : t("chat.quota_exceeded.countdown", {
        hours: pad2(countdown.hours),
        minutes: pad2(countdown.minutes),
        seconds: pad2(countdown.seconds),
      });

  const windowLabel =
    payload.exceeded === QUOTA_WINDOW.PER_WEEK
      ? t("chat.quota_exceeded.window_week")
      : t("chat.quota_exceeded.window_5h");

  return (
    <div
      className="border-t border-amber-200 bg-amber-50 px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        {countdown.expired ? (
          <BatteryCharging className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <BatteryWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {countdown.expired
              ? t("chat.quota_exceeded.reset_ready_title")
              : t("chat.quota_exceeded.title", { window: windowLabel })}
          </p>
          {/**
           * Info: (20260812 - Luphia) 已恢復時只留標題與導購按鈕：
           * 倒數與「不想等？」的勸誘在額度回來之後都已失去意義。
           */}
          {!countdown.expired && (
            <>
              <p className="mt-1 text-xs text-amber-800">
                {t("chat.quota_exceeded.reset_hint", {
                  countdown: countdownText,
                  resetAt: resetAtText,
                })}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {t("chat.quota_exceeded.upsell_hint")}
              </p>
            </>
          )}

          {/**
           * Info: (20260812 - Luphia) 導購連結開新視窗：費思是浮動於 /user 各頁的常駐視窗，
           * 原地跳頁會連同尚未送出的訊息與整段對話一起清掉。
           */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/pricing/credits"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-500"
            >
              <Coins className="h-4 w-4" />
              {t("chat.quota_exceeded.buy_credits")}
            </Link>
            <Link
              href="/pricing/subscription"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-50"
            >
              <Rocket className="h-4 w-4" />
              {t("chat.quota_exceeded.upgrade_plan")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
