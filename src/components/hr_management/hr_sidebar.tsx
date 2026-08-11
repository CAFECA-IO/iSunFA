"use client";

import { FC } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HR_NAV_ITEMS } from "@/components/hr_management/hr_nav_items";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IHrSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Info: (20260810 - Julian) 左側主選單。
 * 桌機固定在版面左側，行動版改為覆蓋式抽屜（`isOpen` 控制）。
 * 兩者共用同一份 `HR_NAV_ITEMS`，避免選單項目在兩處各寫一次而漂移。
 */
const HrSidebar: FC<IHrSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const pathname = usePathname();

  const navList = (
    <nav className="flex flex-col gap-1 p-3">
      {HR_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        /**
         * Info: (20260810 - Julian) 儀表板是所有子路徑的前綴，用 startsWith 會讓它
         * 在任何子頁都亮著，因此只有它比對全等，其餘比對前綴（詳情頁仍要亮著列表）。
         */
        const isActive =
          item.href === HR_MANAGEMENT_ROUTE.DASHBOARD
            ? pathname === item.href
            : pathname.startsWith(item.href);

        if (item.disabled) {
          return (
            <span
              key={item.key}
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-300 select-none"
            >
              <Icon className="size-5 shrink-0" />
              {t(item.labelKey)}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClose}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-orange-50 text-orange-600"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon
              className={`size-5 shrink-0 ${isActive ? "text-orange-500" : "text-gray-400"}`}
            />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Info: (20260810 - Julian) 桌機版：常駐側欄 */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-16">{navList}</div>
      </aside>

      {/* Info: (20260810 - Julian) 行動版：抽屜與遮罩 */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            className="absolute inset-0 h-full w-full bg-gray-900/40"
          />
          <aside className="absolute top-0 left-0 h-full w-64 border-r border-gray-200 bg-white shadow-xl">
            {navList}
          </aside>
        </div>
      )}
    </>
  );
};

export default HrSidebar;
