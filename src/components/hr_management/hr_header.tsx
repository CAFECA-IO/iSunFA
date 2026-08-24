"use client";

import { FC } from "react";
import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  Bell,
  LogOut,
  Menu as MenuIcon,
  Search,
  UserCircle2,
} from "lucide-react";
import BrandLogoImage from "@/components/common/brand_logo_image";
import { useAuth } from "@/contexts/auth_context";
import {
  HR_MANAGEMENT_ROUTE,
  HR_PENDING_ACTION_CLASS,
} from "@/constants/hr_management";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import { useTranslation } from "@/i18n/i18n_context";

interface IHrHeaderProps {
  /** Info: (20260818 - Julian) 由 layout 取得並下傳；`null` = 還不知道或未綁定 */
  identity: IHrIdentityView | null;
  onToggleSidebar: () => void;
}

/**
 * Info: (20260810 - Julian) 人事管理系統的頂部列：Logo、系統名、全域搜尋、通知、使用者。
 */
const HrHeader: FC<IHrHeaderProps> = ({ identity, onToggleSidebar }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  /**
   * Info: (20260818 - Julian) 優先顯示**員工檔**姓名，退回登入帳號的名字。
   *
   * `useAuth()` 給的是 Google 帳號顯示名稱，與人事系統裡的身分未必相同
   * （共用平板、演示時切換身分），而這一頁每一個數字都是員工檔的數字 ——
   * 兩者不一致時顯示前者，會讓人對著別人的資料以為是自己的。
   */
  const displayName = identity?.name ?? user?.name ?? "";

  /** Info: (20260818 - Julian) 「工地主任・第一工務所」；兩個外鍵都可能是 null */
  const displayRole =
    identity === null
      ? ""
      : [identity.jobTitle, identity.departmentName].filter(Boolean).join("・");

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
          <MenuIcon className="size-5 shrink-0" />
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
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 shrink-0 -translate-y-1/2 text-gray-400" />
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
            aria-label={t("hr_management.notification_aria")}
            title={t("hr_management.value.feature_pending")}
            disabled
            className={`relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 ${HR_PENDING_ACTION_CLASS}`}
          >
            <Bell className="size-5 shrink-0" />
          </button>

          {/* Info: (20260818 - Julian) 不標 `feature_pending`：灰掉會讓人不去點它，而登出就在裡面 */}
          <Menu as="div" className="relative">
            <MenuButton
              aria-label={t("hr_management.user_menu_aria")}
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-gray-100"
            >
              <UserCircle2 className="h-7 w-7 text-gray-400" />
              {displayName && (
                <span className="hidden max-w-[12rem] flex-col items-start lg:flex">
                  <span className="max-w-full truncate text-sm font-medium text-gray-700">
                    {identity === null
                      ? displayName
                      : `${displayName}（${identity.employeeNo}）`}
                  </span>
                  {displayRole && (
                    <span className="max-w-full truncate text-xs text-gray-400">
                      {displayRole}
                    </span>
                  )}
                </span>
              )}
            </MenuButton>

            <MenuItems className="absolute right-0 z-40 mt-2 w-52 origin-top-right rounded-xl bg-white p-1 shadow-lg ring-1 ring-gray-200 focus:outline-none">
              {/* Info: (20260818 - Julian) 小尺寸按鈕放不下姓名；共用平板換人時，登出前必須先看得到現在是誰 */}
              {displayName && (
                <div className="px-3 py-2 lg:hidden">
                  <div className="truncate text-sm font-medium text-gray-700">
                    {identity === null
                      ? displayName
                      : `${displayName}（${identity.employeeNo}）`}
                  </div>
                  {displayRole && (
                    <div className="truncate text-xs text-gray-400">
                      {displayRole}
                    </div>
                  )}
                </div>
              )}

              <MenuItem>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"
                >
                  <LogOut className="size-4 shrink-0" />
                  {t("header.logout")}
                </button>
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default HrHeader;
