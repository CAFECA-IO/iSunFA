"use client";

import { useTranslation } from "@/i18n/i18n_context";

export default function Acknowledgement() {
  const { t } = useTranslation();

  return (
    // Info: (20260807 - Luphia) dark:bg-* 的 `!` 見 globals.css「刻意深色的表面」區塊
    <div className="dark:bg-surface-raised! dark:border-border-default border-t border-slate-800 bg-slate-900 py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <p className="text-sm text-gray-400">{t("acknowledgement.text")}</p>
        </div>
      </div>
    </div>
  );
}
