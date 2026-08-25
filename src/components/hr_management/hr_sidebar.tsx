"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  activeHrNavKeyOf,
  HR_NAV_SECTIONS,
  IHrNavItem,
} from "@/components/hr_management/hr_nav_items";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { LEAVE_API } from "@/constants/leave_api";
import { OVERTIME_API } from "@/constants/overtime_api";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 兩個簽核頁的待簽筆數，用來在選單上印徽章。`null` = 還不知道。
 * 它**不決定要不要顯示** —— 那由 `hr/me` 的身分決定；以存量代替身分會把剛升上來、
 * 還沒有人送單的主管擋在門外。
 */
interface IApprovalInbox {
  leave: number | null;
  overtime: number | null;
}

const NAV_KEY_LEAVE_APPROVAL = "leave_approval";
const NAV_KEY_OVERTIME_APPROVAL = "overtime_approval";

interface IHrSidebarProps {
  /**
   * Info: (20260818 - Julian) 由 layout 取得並下傳。`null` = 還不知道（含未登入、
   * 未綁定員工檔、端點掛掉）—— 一律當成「顯示」，理由見 layout 的說明。
   */
  identity: IHrIdentityView | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Info: (20260810 - Julian) 左側主選單。桌機固定在版面左側，行動版改為覆蓋式抽屜
 * （`isOpen` 控制）；兩者共用同一份 `HR_NAV_SECTIONS`，避免選單項目在兩處漂移。
 */
const HrSidebar: FC<IHrSidebarProps> = ({ identity, isOpen, onClose }) => {
  const { t } = useTranslation();
  const pathname = usePathname();

  const [inbox, setInbox] = useState<IApprovalInbox>({
    leave: null,
    overtime: null,
  });

  /**
   * Info: (20260818 - Julian) 誰看得到簽核入口：部門主管，或具 `HR_ADMIN` 職能的人資。
   * 這是**顯示**判準不是授權判準 —— 每一支端點自己仍會擋；藏起來只是為了不讓一個
   * 按下去必定是空的入口佔著位置。
   */
  const canApprove =
    identity === null ||
    identity.isDepartmentManager ||
    identity.hrFunctions.includes(EmployeeHrFunction.HR_ADMIN);

  useEffect(() => {
    // Info: (20260818 - Julian) 看不到入口的人不必查筆數，省兩支請求
    if (!canApprove) return undefined;

    let active = true;
    // Info: (20260818 - Julian) 用 `allSettled` 而不是 `all`：加班那支掛掉不該讓假單徽章也消失
    void Promise.allSettled([
      request<IEnvelopeLike<unknown[]>>(LEAVE_API.REQUEST_PENDING),
      request<IEnvelopeLike<unknown[]>>(OVERTIME_API.REQUEST_PENDING),
    ]).then(([leave, overtime]) => {
      if (!active) return;
      const countOf = (
        settled: PromiseSettledResult<IEnvelopeLike<unknown[]>>,
      ): number | null =>
        settled.status === "fulfilled" && Array.isArray(settled.value.payload)
          ? settled.value.payload.length
          : null;
      setInbox({ leave: countOf(leave), overtime: countOf(overtime) });
    });

    return () => {
      active = false;
    };
  }, [canApprove]);

  const pendingCountOf = (key: string): number | null =>
    key === NAV_KEY_LEAVE_APPROVAL
      ? inbox.leave
      : key === NAV_KEY_OVERTIME_APPROVAL
        ? inbox.overtime
        : null;

  // Info: (20260818 - Julian) 選中哪一項由 `activeHrNavKeyOf` 一次決定，不在這裡逐項比對前綴
  const activeKey = activeHrNavKeyOf(pathname);

  const renderItem = (item: IHrNavItem) => {
    const Icon = item.icon;
    const isActive = item.key === activeKey;
    const pendingCount = pendingCountOf(item.key);
    const isApprovalItem =
      item.key === NAV_KEY_LEAVE_APPROVAL ||
      item.key === NAV_KEY_OVERTIME_APPROVAL;

    /**
     * Info: (20260818 - Julian) 簽核不到任何人就不佔一格。
     * 但**正在看那一頁時不藏** —— 選單項目在腳下消失，會讓人以為自己按錯了。
     */
    if (isApprovalItem && !canApprove && !isActive) return null;

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
        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
        {/* Info: (20260818 - Julian) 既然為了藏空選單已經查了筆數，就把「有幾張等我」印出來 */}
        {pendingCount !== null && pendingCount > 0 && (
          <span className="shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
            {pendingCount}
          </span>
        )}
      </Link>
    );
  };

  // Info: (20260818 - Julian) 分組選項
  const navList = (
    <nav className="flex h-full flex-col gap-4 overflow-auto p-3">
      {HR_NAV_SECTIONS.map((section) => (
        <div key={section.key} className="flex flex-col gap-1">
          {section.labelKey !== null && (
            <div className="px-3 pb-1 text-xs font-semibold tracking-wide text-gray-400">
              {t(section.labelKey)}
            </div>
          )}
          {section.items.map(renderItem)}
        </div>
      ))}
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
