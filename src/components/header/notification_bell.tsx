"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Mail, Wallet } from "lucide-react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import {
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_SUMMARY_TOAST_MS,
  NOTIFICATION_TYPE,
} from "@/constants/notification";

/**
 * Info: (20260821 - Luphia) 小鈴鐺（ADR 021 補充）。
 *
 * 三個行為，各有一個刻意的邊界：
 *
 * 1. **登入摘要**：登入後抓一次摘要，數字非零就在鈴鐺旁彈一句
 *    「N 則待辦事項、M 個工作完成通知」，幾秒後自動收合。
 *    以 sessionStorage 記「這次登入說過了」——摘要是登入問候，不是騷擾。
 * 2. **輪詢**：每 60 秒抓一次摘要，**計數增加**才搖動＋音效。
 *    比較的是總數而不是「有沒有未讀」：使用者沒收掉的舊通知不該每分鐘
 *    搖一次鈴。
 * 3. **音效**：瀏覽器在使用者第一次互動前禁止出聲（autoplay policy）。
 *    首次互動前發現的新通知只搖不響——這是平台限制，繞過它的手段
 *    （隱藏 iframe 之類）都比「少響一聲」糟。
 */

interface ISummary {
  todoCount: number;
  completedCount: number;
}

interface IItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

interface IList {
  todos: IItem[];
  completed: IItem[];
}

const SUMMARY_SHOWN_KEY = "notification-summary-shown";

/**
 * Info: (20260821 - Luphia) 通知音：WebAudio 兩聲短音。
 * 用 oscillator 而不是音檔——不新增 binary 資產，也不會有載入失敗的路徑。
 * AudioContext 在沒有使用者手勢時會是 suspended，resume 失敗就靜默放棄。
 */
async function playChime(): Promise<void> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    const play = (frequency: number, startAt: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startAt + 0.25,
      );
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(ctx.currentTime + startAt);
      oscillator.stop(ctx.currentTime + startAt + 0.3);
    };
    play(880, 0);
    play(1174.66, 0.12);
    window.setTimeout(() => {
      ctx.close().catch(() => undefined);
    }, 600);
  } catch {
    // Info: (20260821 - Luphia) 音效是加分項：任何失敗都不值得打擾主流程
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [summary, setSummary] = useState<ISummary | null>(null);
  const [list, setList] = useState<IList | null>(null);
  const [shaking, setShaking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  /**
   * Info: (20260821 - Luphia) 上次看到的總數，用 ref 不用 state：
   * 它只給輪詢比較用，變動不需要重繪。null＝還沒有基準（首抓不觸發搖鈴）。
   */
  const lastTotalRef = useRef<number | null>(null);

  const fetchSummary = useCallback(async (): Promise<ISummary | null> => {
    try {
      const response = await request<{ payload: ISummary | null }>(
        "/api/v1/user/notifications/summary",
      );
      return response.payload ?? null;
    } catch {
      // Info: (20260821 - Luphia) 輪詢失敗就等下一輪：鈴鐺不值得任何錯誤畫面
      return null;
    }
  }, []);

  // Info: (20260821 - Luphia) 登入摘要：抓一次，非零且本次登入沒說過 → 彈摘要氣泡
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    fetchSummary().then((first) => {
      if (!active || !first) return;
      setSummary(first);
      lastTotalRef.current = first.todoCount + first.completedCount;
      const alreadyShown = sessionStorage.getItem(SUMMARY_SHOWN_KEY);
      if (!alreadyShown && first.todoCount + first.completedCount > 0) {
        sessionStorage.setItem(SUMMARY_SHOWN_KEY, "1");
        setShowToast(true);
        window.setTimeout(
          () => setShowToast(false),
          NOTIFICATION_SUMMARY_TOAST_MS,
        );
      }
    });
    return () => {
      active = false;
    };
  }, [user, fetchSummary]);

  // Info: (20260821 - Luphia) 輪詢：計數增加才搖動＋音效
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(async () => {
      const next = await fetchSummary();
      if (!next) return;
      setSummary(next);
      const total = next.todoCount + next.completedCount;
      const last = lastTotalRef.current;
      lastTotalRef.current = total;
      if (last !== null && total > last) {
        setShaking(true);
        window.setTimeout(() => setShaking(false), 1000);
        playChime();
      }
    }, NOTIFICATION_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [user, fetchSummary]);

  /**
   * Info: (20260821 - Luphia) 打開鈴鐺：抓清單並把事件型標為已讀。
   * 已讀之後完成通知的徽章歸零（待辦仍在，直到來源狀態改變）。
   */
  const openList = useCallback(async () => {
    try {
      const response = await request<{ payload: IList | null }>(
        "/api/v1/user/notifications",
      );
      setList(response.payload ?? { todos: [], completed: [] });
      await request("/api/v1/user/notifications/read", {
        method: HTTP_METHOD.POST,
        body: JSON.stringify({}),
      });
      setSummary((previous) =>
        previous ? { ...previous, completedCount: 0 } : previous,
      );
      /**
       * Info: (20260821 - Luphia) 已讀後把比較基準降回「只剩待辦」：
       * 不降的話，下一則新通知到達時 total 可能仍小於舊基準，搖鈴會漏一次。
       */
      lastTotalRef.current = summary?.todoCount ?? 0;
    } catch {
      setList({ todos: [], completed: [] });
    }
  }, [summary?.todoCount]);

  if (!user) return null;

  const unreadTotal =
    (summary?.todoCount ?? 0) + (summary?.completedCount ?? 0);

  const renderItem = (item: IItem) => {
    if (item.type === NOTIFICATION_TYPE.TEAM_INVITATION) {
      return (
        <Link
          key={item.id}
          href="/user/team"
          className="hover:bg-surface-hover flex items-start gap-2 rounded-md px-3 py-2 text-sm"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <span>
            {t("notification.team_invitation", {
              inviterName: String(item.payload.inviterName ?? ""),
              teamName: String(item.payload.teamName ?? ""),
            })}
          </span>
        </Link>
      );
    }
    if (item.type === NOTIFICATION_TYPE.WALLET_UPGRADE) {
      return (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-md px-3 py-2 text-sm"
        >
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>{t("notification.wallet_upgrade")}</span>
        </div>
      );
    }
    return (
      <Link
        key={item.id}
        href="/analysis"
        className="hover:bg-surface-hover flex items-start gap-2 rounded-md px-3 py-2 text-sm"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <span>{t("notification.analysis_completed")}</span>
      </Link>
    );
  };

  return (
    <Popover className="relative">
      <PopoverButton
        aria-label={t("notification.aria")}
        onClick={openList}
        className="text-text-muted hover:bg-surface-hover hover:text-text-primary relative rounded-full p-2 focus:outline-none"
      >
        <Bell className={`h-5 w-5 ${shaking ? "animate-bell-shake" : ""}`} />
        {unreadTotal > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </PopoverButton>

      {/**
       * Info: (20260821 - Luphia) 登入摘要氣泡：只出現一次，數秒後自動收合。
       * 不是 Popover 的一部分——它在使用者尚未點擊時就要出現。
       */}
      {showToast && summary && (
        <div className="border-brand/30 bg-surface text-text-primary absolute top-full right-0 z-50 mt-2 w-64 rounded-lg border p-3 text-sm shadow-lg">
          {t("notification.summary", {
            todos: summary.todoCount,
            completed: summary.completedCount,
          })}
        </div>
      )}

      <PopoverPanel className="border-border bg-surface absolute right-0 z-50 mt-2 w-80 rounded-lg border p-2 shadow-lg">
        {!list || (list.todos.length === 0 && list.completed.length === 0) ? (
          <p className="text-text-muted px-3 py-4 text-center text-sm">
            {t("notification.empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {list.todos.length > 0 && (
              <>
                <p className="text-text-muted px-3 pt-1 text-xs font-semibold">
                  {t("notification.todos_title")}
                </p>
                {list.todos.map(renderItem)}
              </>
            )}
            {list.completed.length > 0 && (
              <>
                <p className="text-text-muted px-3 pt-2 text-xs font-semibold">
                  {t("notification.completed_title")}
                </p>
                {list.completed.map(renderItem)}
              </>
            )}
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
