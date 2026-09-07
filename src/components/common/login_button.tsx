"use client";

import { useState } from "react";
import AuthModal from "@/components/auth/auth_modal";
import { useTranslation } from "@/i18n/i18n_context";

export default function LoginButton({ label = undefined }: { label?: string }) {
  const { t } = useTranslation();
  const btnLabel = label || t("header.login");

  const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);

  return (
    <>
      <button
        onClick={() => setAuthModalOpen(true)}
        /**
         * Info: (20260831 - Luphia) `shrink-0` **不在這裡**，在 header 的使用端
         *（`header/user_actions.tsx`）——review #6726 高-1。
         *
         * 它原本加在這裡，而這顆按鈕有 **7 個使用端**。`flex-shrink: 0` 讓項目
         * 不會被壓到 flex-basis 以下，而 basis 是 `auto` → 內容尺寸取
         * **max-content**：文字不再換行，容器不夠寬時**溢出**。
         *
         * 實測（`user/analysis/analysis_view.tsx` 那一格，卡片內可用寬度 256px，
         * 英文介面標籤 "Please login to generate the analysis report"）：
         *
         * | | 按鈕寬 | 行數 | 溢出 |
         * |---|---|---|---|
         * | 沒有 `shrink-0` | 256 | 2 行 | 0 |
         * | 有 `shrink-0` | **329** | 1 行 | **73px** |
         *
         * 也就是把一個「醜」換成一個「整頁水平捲動」，而後者正是那個 PR 要消滅的
         * 東西。**下面那段拒絕 `whitespace-nowrap` 的理由，一字不改就適用於
         * `shrink-0`**——寫下那段話的時候沒有把它套用到隔壁那個 class 上。
         *
         * 手機版的水平內距小一格（`px-4 sm:px-5`）留著，但**它不是 header 擠得下
         * 的必要條件**——實測改回 `px-5` 之後 320px 仍然不溢出（品牌區多壓 2.4px
         * 吸收掉，見 `landing_page/header.tsx` 的矩陣）。留著的理由只有一個：
         * 對長標籤的使用端來說，內距小一格是純粹的好處。
         * 08-27 那版註解把它說成必要條件，那是錯的（review #6731 二輪高-1）。
         *
         * 刻意**不加** `whitespace-nowrap`：這顆按鈕的標籤由呼叫端傳入，
         * 其中幾個相當長（`analysis.login_to_generate`、"Please login to comment"）
         * ——那些地方在窄容器裡需要換行，禁止換行只會把裁切換成溢出。
         */
        className="rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-105 hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 active:scale-95 sm:px-5"
      >
        {btnLabel}
      </button>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
