"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Coins, Rocket } from "lucide-react";
import type { ICreditPauseDetail } from "@/constants/carbon_chatbot";
import { QUOTA_EXCEEDED_OPTION } from "@/constants/subscription_quota";
import { describeQuotaCountdown } from "@/lib/quota/quota_notice";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260827 - Luphia) 暫停時「接下來能做什麼」（issue #6714）。
 *
 * 在此之前畫面只說「點數已用完，以下章節還沒開始解析」——**沒有一個字**說得出
 * 接下來能做什麼。而伺服器的 402 回應早就把出路與雙視窗的重置時間算好了，
 * 前端一個欄位都沒有讀。
 *
 * 三件事，一件都不能少（與費思的 `chat/quota_exceeded_notice.tsx` 同一套規則）：
 *
 * 1. 說清楚**什麼時候可以再用**——倒數與絕對時間並列。倒數回答「還要多久」，
 *    絕對時間回答「是幾點」，只給一種都會有人算錯。
 * 2. 說清楚**有哪些出路**——而且是伺服器算好的那幾條，前端不重算：自己推導
 *    的話它與扣款端遲早分岔，而分岔的症狀是畫面很有說服力地指錯方向。
 * 3. **超過視窗上限時不顯示倒數**。那種情況等重置永遠不會好，而一個倒數本身
 *    就是「等一下就能用」的承諾。
 *
 * 刻意不顯示額度儀表（`limit` / `used`）：那兩個數字在重新整理之後就過時了，
 * 而使用者會據此判斷還能不能跑——顯示一個過時的儀表比不顯示更糟。
 */

interface ICreditPauseWaysProps {
  detail: ICreditPauseDetail;
  /**
   * Info: (20260901 - Luphia) 倒數歸零的那一刻（review #6726 中-3）。
   *
   * 「等重置」這條出路**沒有付款事件**：掃描行程把任務翻成 RESUMABLE 之後，
   * 一個開著的分頁不會收到任何廣播——`refreshImportJob` 只在掛載與
   * PAYMENT_SUCCEEDED 時跑，於是畫面要重新載入才會改口。倒數歸零正是
   * 「該去再問一次伺服器」的時點，由持有那支函式的外層決定問什麼。
   */
  onCountdownExpired?: () => void;
}

const pad2 = (value: number) => String(value).padStart(2, "0");

/**
 * Info: (20260827 - Luphia) 出路的文案鍵。用查表而不是 `switch`：
 * 認不出的值直接被濾掉，不會變成畫面上的 `undefined`——`options` 來自網路，
 * 而伺服器可能比這一版的前端更新。
 */
const OPTION_LABEL_KEYS: Record<string, string> = {
  [QUOTA_EXCEEDED_OPTION.WAIT_RESET]:
    "carbon_chatbot.import_paused_option_wait_reset",
  [QUOTA_EXCEEDED_OPTION.USE_ALLOCATION]:
    "carbon_chatbot.import_paused_option_use_allocation",
  [QUOTA_EXCEEDED_OPTION.USE_PERSONAL_WALLET]:
    "carbon_chatbot.import_paused_option_use_personal",
  [QUOTA_EXCEEDED_OPTION.UPGRADE_PLAN]:
    "carbon_chatbot.import_paused_option_upgrade",
};

export function CreditPauseWays({
  detail,
  onCountdownExpired = undefined,
}: ICreditPauseWaysProps) {
  const { t, language } = useTranslation();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const countdown = detail.resetAt
    ? describeQuotaCountdown(detail.resetAt, nowSec)
    : null;

  // Info: (20260827 - Luphia) 倒數歸零後停掉計時器：已經沒有倒數可更新
  useEffect(() => {
    if (!countdown || countdown.expired) return undefined;
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [countdown]);

  /**
   * Info: (20260901 - Luphia) 只在**轉為歸零**的那一刻通知一次（review #6726
   * 中-3）：掛載時就已經歸零的（重新整理回來的頁面）也算——那正是狀態
   * 最可能已經變了的情形。ref 擋重複：countdown 物件每秒都是新的，
   * 依賴 `expired` 布林本身。
   */
  const expiredNotifiedRef = useRef(false);
  const expired = countdown?.expired ?? false;
  useEffect(() => {
    if (!expired || expiredNotifiedRef.current) return;
    expiredNotifiedRef.current = true;
    onCountdownExpired?.();
  }, [expired, onCountdownExpired]);

  /**
   * Info: (20260827 - Luphia) 絕對時間以瀏覽器時區呈現：`resetAt` 是 epoch 秒
   *（UTC 基準），由 Intl 依使用者語言與所在時區格式化，不在前端手算 UTC+8。
   */
  const resetAtText = useMemo(() => {
    if (!detail.resetAt) return "";
    return new Intl.DateTimeFormat(language, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(detail.resetAt * 1000));
  }, [detail.resetAt, language]);

  /**
   * Info: (20260827 - Luphia) 倒數的格式沿用費思那張卡的鍵
   *（`chat.quota_exceeded.countdown`）：它們是純粹的時間格式，沒有任何領域字眼，
   * 抄一份到這個命名空間只會多兩份要同步維護的翻譯。
   *
   * 天數分離而非讓小時累加：週視窗可達 167 小時，「167:59:59」這種讀數
   * 無法一眼判斷還要等多久。
   */
  const countdownText = countdown?.days
    ? t("chat.quota_exceeded.countdown_days", {
        days: countdown.days,
        hours: countdown.hours,
      })
    : t("chat.quota_exceeded.countdown", {
        hours: pad2(countdown?.hours ?? 0),
        minutes: pad2(countdown?.minutes ?? 0),
        seconds: pad2(countdown?.seconds ?? 0),
      });

  const optionKeys = detail.options
    .map((option) => OPTION_LABEL_KEYS[option])
    .filter((key): key is string => Boolean(key));

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-white/70 p-2.5 text-[11px] font-medium text-blue-800">
      {detail.exceedsWindowLimit ? (
        <p>{t("carbon_chatbot.import_paused_over_window_limit")}</p>
      ) : (
        countdown && (
          <p>
            {countdown.expired
              ? t("carbon_chatbot.import_paused_reset_ready")
              : t("carbon_chatbot.import_paused_reset_hint", {
                  countdown: countdownText,
                  resetAt: resetAtText,
                })}
          </p>
        )
      )}

      {optionKeys.length > 0 && (
        <div>
          <p className="font-bold">
            {t("carbon_chatbot.import_paused_ways_title")}
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {optionKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      )}

      {/**
       * Info: (20260827 - Luphia) 導購連結開新視窗，理由與費思那張卡相同：
       * 匯入的預覽卡下面掛著幾分鐘的解析結果，原地跳頁會連同它一起清掉。
       *
       * 標籤沿用 `chat.quota_exceeded.*`：同一個動作在兩個地方叫不同名字，
       * 使用者會以為那是兩件事。
       */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <Link
          href="/pricing/credits"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 font-bold text-white transition-colors hover:bg-orange-500"
        >
          <Coins size={11} />
          {t("chat.quota_exceeded.buy_credits")}
        </Link>
        <Link
          href="/pricing/subscription"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-white px-2.5 py-1 font-bold text-orange-700 transition-colors hover:bg-orange-50"
        >
          <Rocket size={11} />
          {t("chat.quota_exceeded.upgrade_plan")}
        </Link>
      </div>
    </div>
  );
}

export default CreditPauseWays;
