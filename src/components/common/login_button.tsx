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
         * Info: (20260827 - Luphia) `shrink-0` 是這顆按鈕在手機版能維持形狀的
         * 全部依據。
         *
         * 它是 header 右側 flex 群組的直接子項。中文**每一個字之間都是合法斷點**，
         * 所以 flex 算出的 min-content 只有一個字的寬度——空間不足時按鈕被壓到
         * 一個字寬，`rounded-full` 於是變成一個圓，「登入」兩字上下疊著。
         * 英文不會有這個症狀（"Login" 是一個不可斷的詞），所以只看英文介面
         * 檢查不出來。
         *
         * 手機版的水平內距小一格（`px-4 sm:px-5`）：header 右側那一排在 320px
         * 下差 14px 才擠得進去，而差額必須有地方吸收——否則被壓縮的群組會讓
         * 這顆 `shrink-0` 的按鈕溢出去，變成整頁 2px 的水平捲動。
         *
         * 刻意**不加** `whitespace-nowrap`：實測 `shrink-0` 已經足夠保住形狀，
         * 而這顆按鈕有 7 個使用端，其中幾個傳的是長標籤
         *（如 `analysis.login_to_generate`、"Please login to comment"）——
         * 那些地方在窄容器裡需要換行，禁止換行只會把裁切換成溢出。
         */
        className="shrink-0 rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-105 hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 active:scale-95 sm:px-5"
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
