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
      const current = Math.round(startValue + (endValue - startValue) * easeOut);

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

  return (
    <div className="relative flex flex-row items-center justify-between bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 px-4 py-3 shrink-0 z-50">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-100/50 to-amber-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-50/40 to-transparent rounded-full blur-2xl -z-10 -translate-x-1/2 translate-y-1/2"></div>

      <div className="relative flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-lg ring-1 ring-orange-400/50">
          <Terminal className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('admin_setup.header.title')}
          </h1>
          <p className="hidden sm:flex text-slate-500 text-xs items-center font-medium leading-tight mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            <span>{t('admin_setup.header.subtitle')}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 z-10 shrink-0 sm:pr-2">
        <LanguageSelector />
        <div className="flex flex-col justify-center min-w-[120px]">
          <div className="flex items-center justify-between mb-1.5 line-clamp-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold shrink-0">Progress</span>
            <div className="flex items-baseline gap-0.5 ml-2">
              <span className="text-xl font-black text-orange-500 tracking-tighter tabular-nums leading-none">
                {animatedProgress}
              </span>
              <span className="text-xs font-bold text-orange-500">%</span>
            </div>
          </div>
          <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
