"use client";

import { useState } from "react";
import Link from "next/link";

import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import AuthModal from "@/components/auth/auth_modal";

import { MODULES } from "@/constants/modules";

export default function Features() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const handleFeatureClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base leading-7 font-semibold text-orange-600">
            {t("features.title")}
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t("features.subtitle")}
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            {t("features.description")}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 xl:grid-cols-4">
            {/* Info: (20260807 - Luphia) 深色下另外加一圈橘環當 hover 訊號。
                hover:shadow-xl 是照白底設計的：黑色陰影疊在近黑的頁面上，
                實測最深處對頁面只有 1.05:1，等於整個 hover 只剩 4px 的位移。
                這與 globals.css 的原則一致 —— 深色的浮起交給邊框，陰影只是輔助。 */}
            {MODULES.map((feature) => (
              <Link
                key={feature.key}
                href={`/user/account_book/default/${feature.key}`}
                onClick={handleFeatureClick}
                className="relative block flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:ring-orange-500/60"
              >
                <dt className="flex items-center gap-x-3 text-base leading-7 font-semibold text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
                    <feature.icon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {t(`features.items.${feature.key}.title`)}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    {t(`features.items.${feature.key}.desc`)}
                  </p>
                </dd>
              </Link>
            ))}
          </dl>
        </div>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
