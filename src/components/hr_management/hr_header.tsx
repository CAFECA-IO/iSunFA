"use client";

import { FC } from "react";
import Link from "next/link";
import { Menu, Search, UserCircle2 } from "lucide-react";
import BrandLogoImage from "@/components/common/brand_logo_image";
import { useAuth } from "@/contexts/auth_context";
import {
  HR_MANAGEMENT_ROUTE,
  HR_PENDING_ACTION_CLASS,
} from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IHrHeaderProps {
  onToggleSidebar: () => void;
}

/**
 * Info: (20260810 - Julian) 人事管理系統的頂部列：Logo、系統名、全域搜尋、通知、使用者。
 */
const HrHeader: FC<IHrHeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const displayName = user?.name ?? "";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Info: (20260810 - Julian) 行動版才出現的側邊選單開關 */}
        <button
          type="button"
          aria-label={t("hr_management.open_menu_aria")}
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
        >
          <Menu className="size-5 shrink-0" />
        </button>

        <Link
          href={HR_MANAGEMENT_ROUTE.EMPLOYEE}
          className="flex shrink-0 items-center gap-3"
        >
          <BrandLogoImage className="h-8 w-auto" width={112} height={32} />
          <span className="sr-only">iSunFA</span>
          <span className="hidden border-l border-gray-200 pl-3 text-base font-bold text-gray-800 sm:inline">
            {t("hr_management.system_name")}
          </span>
        </Link>

        {/* Info: (20260810 - Julian) 全域搜尋 */}
        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              aria-label={t("hr_management.global_search_placeholder")}
              placeholder={t("hr_management.global_search_placeholder")}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-3 pl-9 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-4">
          <button
            type="button"
            aria-label={t("hr_management.global_search_placeholder")}
            title={t("hr_management.value.feature_pending")}
            disabled
            className={`rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden ${HR_PENDING_ACTION_CLASS}`}
          >
            <Search className="size-5 shrink-0" />
          </button>
          <button
            type="button"
            aria-label={t("hr_management.user_menu_aria")}
            title={t("hr_management.value.feature_pending")}
            disabled
            className={`flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-gray-100 ${HR_PENDING_ACTION_CLASS}`}
          >
            <UserCircle2 className="h-7 w-7 text-gray-400" />
            {displayName && (
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-gray-700 lg:inline">
                {displayName}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default HrHeader;
