"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import SubtitleTypewriter from "@/components/landing_page/subtitle_typewriter";
import AuthModal from "@/components/auth/auth_modal";

export default function Hero() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Info: (20260807 - Luphia) `dark:bg-*` 上的 `!` 是為了退出 globals.css 的深色表面
  // Info: (20260807 - Luphia) 相容層，理由寫在該區塊；landing 各段一律照此收斂成 base / raised 兩級。
  return (
    <div className="dark:bg-surface-base! relative isolate overflow-hidden bg-white px-6 pt-14 lg:px-8">
      {/* Background Gradients */}
      {/* Info: (20260807 - Luphia) 光暈的 opacity-30 是照白底調的：橘色壓在白紙上是很淡的暖色。
          同一層疊在深色頁面上會反過來成為畫面裡最亮的東西，糊成一大塊佔滿首屏的濁褐色。
          色值是硬寫的 #ff8c00，色盤反轉碰不到它，只能在這裡降不透明度。 */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] dark:opacity-10"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div className="text-center">
          <h1 className="bg-gradient-to-br from-orange-700 via-orange-500 to-amber-400 bg-clip-text pb-4 text-5xl leading-tight font-extrabold tracking-tight text-transparent drop-shadow-sm sm:text-7xl">
            {t("hero.title")}
          </h1>
          <p className="mt-6 h-24 text-lg leading-8 text-gray-600 sm:h-auto">
            <SubtitleTypewriter
              lines={[
                t("hero.subtitle_line1"),
                t("hero.subtitle_line2"),
                t("hero.subtitle_line3"),
                t("hero.subtitle_line4"),
                t("hero.subtitle_line5"),
                t("hero.subtitle_line6"),
                t("hero.subtitle_line7"),
                t("hero.subtitle_line8"),
                t("hero.subtitle_line9"),
              ]}
            />
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {/* Info: (20260807 - Luphia) orange-600 配白字只有 3.58:1，未達 AA 的 4.5。
                orange-700（5.22:1）是仍能通過的最淺一階，因此 hover 只能往更深走。
                純圖示的橘底圓鈕不在此列：圖形只需 3:1，orange-600 本來就夠。 */}
            <button
              onClick={() => {
                if (user) {
                  router.push("/user/account_book/");
                } else {
                  setAuthModalOpen(true);
                }
              }}
              className="rounded-md bg-orange-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              {t("hero.free_trial")}
            </button>
            <Link
              href="/pricing"
              className="text-sm leading-6 font-semibold text-gray-900 transition-colors hover:text-orange-600"
            >
              {t("hero.pricing_link")}
            </Link>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <div
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem] dark:opacity-10"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </div>
  );
}
