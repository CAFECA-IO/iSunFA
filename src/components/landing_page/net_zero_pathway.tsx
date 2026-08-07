"use client";

import { useTranslation } from "@/i18n/i18n_context";
import {
  Factory,
  Leaf,
  Sparkles,
  Network,
  Building2,
  Globe2,
} from "lucide-react";

export default function NetZeroPathway() {
  const { t } = useTranslation();

  return (
    // Info: (20260807 - Luphia) dark:bg-* 的 `!` 見 globals.css「刻意深色的表面」區塊
    <section className="dark:bg-surface-raised! dark:border-border-default relative overflow-hidden border-y border-slate-800/60 bg-slate-950 py-24 sm:py-32">
      {/* Info: (20260611 - Luphia) Background Gradients */}
      <div className="absolute inset-y-0 left-1/2 -z-10 w-[200%] -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.15),transparent_50%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-x-16 gap-y-16 lg:grid-cols-2">
          {/* Info: (20260611 - Luphia) Left Content */}
          <div className="max-w-2xl lg:max-w-none">
            <div className="mb-6 inline-flex items-center gap-x-2 rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-semibold text-green-400 ring-1 ring-green-500/20">
              <Sparkles className="h-4 w-4" />
              {t("net_zero_pathway.title")}
            </div>
            <h2 className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
              {t("net_zero_pathway.subtitle")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              {t("net_zero_pathway.description_p1")}
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              {t("net_zero_pathway.description_p2")}
            </p>
          </div>

          {/* Info: (20260611 - Luphia) Right Visual: Topology Network Map */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* Info: (20260611 - Luphia) Ambient glow behind the panel */}
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-green-500/5 to-teal-500/5 blur-xl" />

            {/* Info: (20260807 - Luphia) 深色下 hover 由外圈承擔：底色在近黑頁面上動不了 ——
                `bg-slate-800/40 → /60` 疊出來只差 1.04:1，就算拉到 100% 也只有 1.12:1。
                綠環改為滿版並加粗到 2px，對卡片 7.45:1 —— 遠高於 WCAG 1.4.11 的 3:1，
                滑過去要一眼看得出來，不是勉強達標。 */}
            <div className="dark:ring-border-default relative flex h-[400px] w-full flex-col items-center justify-center rounded-3xl bg-slate-800/40 p-6 ring-1 ring-slate-700/50 backdrop-blur-md transition-all hover:bg-slate-800/60 hover:ring-green-500/30 dark:hover:ring-2 dark:hover:ring-green-500">
              {/* Info: (20260611 - Luphia) SVG Topology Lines */}
              <svg
                className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                {/* Info: (20260611 - Luphia) Paths from left global factories (15%) to center AI core (50%) */}
                <path
                  d="M 15 20 C 35 20, 35 50, 50 50"
                  fill="none"
                  stroke="rgba(100,116,139,0.3)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 15 50 L 50 50"
                  fill="none"
                  stroke="rgba(100,116,139,0.3)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 15 80 C 35 80, 35 50, 50 50"
                  fill="none"
                  stroke="rgba(100,116,139,0.3)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Info: (20260611 - Luphia) Flowing dots indicating extraction of optimal processes */}
                <circle r="0.3" fill="rgba(56,189,248,0.8)">
                  <animateMotion
                    dur="2.5s"
                    repeatCount="indefinite"
                    path="M 15 20 C 35 20, 35 50, 50 50"
                  />
                </circle>
                <circle r="0.3" fill="rgba(56,189,248,0.8)">
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path="M 15 50 L 50 50"
                  />
                </circle>
                <circle r="0.3" fill="rgba(56,189,248,0.8)">
                  <animateMotion
                    dur="3s"
                    repeatCount="indefinite"
                    path="M 15 80 C 35 80, 35 50, 50 50"
                  />
                </circle>

                {/* Info: (20260611 - Luphia) Path from center (50%) to right enterprise node (85%) */}
                <path
                  d="M 50 50 L 85 50"
                  fill="none"
                  stroke="rgba(52,211,153,0.6)"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="6 6"
                  className="animate-[dashMove_1s_linear_infinite]"
                />
              </svg>

              {/* Info: (20260611 - Luphia) Foreground Nodes Layout */}
              <div className="relative z-10 flex h-full w-full items-center justify-between">
                {/* Info: (20260611 - Luphia) Left Side: Global Factories Database */}
                <div className="flex h-full flex-col justify-between py-8 pl-2">
                  <div className="group dark:ring-border-default flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 ring-1 ring-slate-700 backdrop-blur-sm transition-transform hover:scale-110">
                    <Factory className="h-4 w-4 text-sky-400/70" />
                  </div>
                  <div className="group dark:ring-border-default flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 ring-1 ring-slate-700 backdrop-blur-sm transition-transform hover:scale-110">
                    <Globe2 className="h-4 w-4 text-sky-400/70" />
                  </div>
                  <div className="group dark:ring-border-default flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 ring-1 ring-slate-700 backdrop-blur-sm transition-transform hover:scale-110">
                    <Factory className="h-4 w-4 text-sky-400/70" />
                  </div>
                  <div className="absolute -bottom-2 left-2 text-xs font-semibold text-slate-400">
                    {t("net_zero_pathway.global_factories")}
                  </div>
                </div>

                {/* Info: (20260611 - Luphia) Center: AI Extraction Engine */}
                <div className="flex flex-col items-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 ring-2 ring-blue-500/30 backdrop-blur-md">
                    <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-blue-400" />
                    <Network className="h-7 w-7 text-blue-400" />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 ring-1 ring-blue-500/20">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    {t("net_zero_pathway.extraction")}
                  </div>
                </div>

                {/* Info: (20260611 - Luphia) Right Side: Your Enterprise (The Green Paradigm) */}
                <div className="flex flex-col items-center pr-2">
                  <div className="group relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600/40 to-emerald-900/40 ring-2 ring-green-400/60 backdrop-blur-md transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(52,211,153,0.4)]">
                    <Building2 className="absolute h-10 w-10 text-white/90" />
                    <Leaf className="absolute -top-3 -right-3 h-8 w-8 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  </div>
                  <div className="mt-5 text-center">
                    <div className="text-sm font-extrabold text-green-400">
                      {t("net_zero_pathway.your_company_paradigm")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes dashMove {
          from {
            stroke-dashoffset: 12;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `,
        }}
      />
    </section>
  );
}
