"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import LanguageSelector from "@/components/header/language_selector";
import { useTranslation } from "@/i18n/i18n_context";

export interface IWizardHeaderProps {
  progressPercentage: number;
}

function useAnimatedNumber(value: number, duration: number = 1000) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = startValueRef.current;
    const endValue = value;
    let animationFrameId: number;

    if (startValue === endValue) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(
        startValue + (endValue - startValue) * easeOut,
      );

      setDisplayValue(current);
      startValueRef.current = current;

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return displayValue;
}

export function WizardHeader({ progressPercentage }: IWizardHeaderProps) {
  const { t } = useTranslation();
  const animatedProgress = useAnimatedNumber(progressPercentage, 1000);

  /**
   * Info: (20260809 - Luphia) 邊框用 border-slate-200 而非 border-white/80：
   * globals.css 對 .bg-white/60 有深色覆寫（表面會翻成深色），但 .border-white 沒有，
   * 兩者搭在一起會變成「深色面板配一條純白亮線」。slate 走 --t-* 色階，兩種模式都對。
   */
  return (
    <div className="relative z-50 flex shrink-0 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 backdrop-blur-xl">
      <div className="absolute top-0 right-0 -z-10 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-gradient-to-br from-orange-100/50 to-amber-50/50 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -z-10 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-gradient-to-tr from-orange-50/40 to-transparent blur-2xl"></div>

      <div className="relative flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 p-2 text-white ring-1 ring-orange-400/50">
          <Terminal className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg leading-tight font-extrabold tracking-tight text-slate-900 sm:text-xl">
            {t("admin_setup.header.title")}
          </h1>
          <p className="mt-0.5 hidden items-center text-xs leading-tight font-medium text-slate-500 sm:flex">
            <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
            <span>{t("admin_setup.header.subtitle")}</span>
          </p>
        </div>
      </div>

      <div className="z-10 flex shrink-0 items-center gap-4 sm:pr-2">
        <LanguageSelector />
        <div className="flex min-w-[120px] flex-col justify-center">
          <div className="mb-1.5 line-clamp-1 flex items-center justify-between">
            <span className="shrink-0 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Progress
            </span>
            <div className="ml-2 flex items-baseline gap-0.5">
              <span className="text-xl leading-none font-black tracking-tighter text-orange-500 tabular-nums">
                {animatedProgress}
              </span>
              <span className="text-xs font-bold text-orange-500">%</span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
