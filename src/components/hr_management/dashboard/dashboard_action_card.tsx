"use client";

import { FC, ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import {
  DASHBOARD_LIST_LIMIT,
  HR_PENDING_ACTION_CLASS,
} from "@/constants/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardActionCardProps {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  /** Info: (20260810 - Julian) 全部筆數；超過顯示上限時在頁尾提示還有幾筆 */
  total: number;
  emptyText: string;
  children: ReactNode;
}

// Info: (20260810 - Julian) 待辦與提醒各卡片的共用外框：頭像 + 主要資訊 + 右側標記。
export const DashboardActionRow: FC<{
  initials: string;
  title: ReactNode;
  subtitle: string;
  trailing: ReactNode;
}> = ({ initials, title, subtitle, trailing }) => (
  <li className="flex items-center gap-3 px-4 py-2.5">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-600">
      {initials}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-gray-800">{title}</p>
      <p className="mt-0.5 truncate text-xs text-gray-400">{subtitle}</p>
    </div>
    <div className="flex shrink-0 items-center gap-2">{trailing}</div>
  </li>
);

const DashboardActionCard: FC<IDashboardActionCardProps> = ({
  icon: Icon,
  iconClass,
  title,
  total,
  emptyText,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-700">
          <Icon className={`size-5 shrink-0 ${iconClass}`} />
          {title}
        </h3>
        {total > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">
            {total}
          </span>
        )}
      </header>

      {total === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          {emptyText}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">{children}</ul>
          {total > DASHBOARD_LIST_LIMIT && (
            // ToDo: (20260810 - Julian) 對應的清單頁完成後改為 Link
            <button
              type="button"
              title={t("hr_management.value.feature_pending")}
              disabled
              className={`border-t border-gray-100 px-4 py-2.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 ${HR_PENDING_ACTION_CLASS}`}
            >
              {t("hr_management.dashboard.view_all", { count: total })}
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default DashboardActionCard;
