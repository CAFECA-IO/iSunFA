"use client";

import { useState, FC } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { ISUNFA_ROUTE } from "@/constants/url";
import BrandLogo from "@/components/header/brand_logo";
import HeaderActions from "@/components/header/header_actions";
import MechanismModal from "@/components/salary_calculator/mechanism_modal";
// import { useAuth } from "@/contexts/auth_context";

const CalculatorHeader: FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isMechanismModalOpen, setIsMechanismModalOpen] = useState(false);
  // const { user } = useAuth();

  const isCalc = pathname === ISUNFA_ROUTE.SALARY_CALCULATOR;
  // const isList = pathname === ISUNFA_ROUTE.EMPLOYEE_LIST;
  // const isSlip = pathname === ISUNFA_ROUTE.PAY_SLIP;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/**
       * Info: (20260826 - Julian) 毛玻璃移到**子層**，`<header>` 自己不帶 backdrop-filter。
       *
       * `backdrop-filter` 與 `transform` 一樣會讓元素成為子孫 `position: fixed`
       * 的**包含塊** —— 於是小鈴鐺面板的 `fixed inset-0 h-dvh` 不是相對視窗，
       * 而是相對這個 64px 高的 header 定位。實測（20260826）：面板 top 落在
       * 7742px、底部連結跟著跑到面板頂端下方，手機版因此既捲不到底、
       * 也點不到「查看全部通知」。
       *
       * 把 bg / blur / shadow / ring 放進一個 `absolute inset-0 -z-10` 的兄弟層，
       * 視覺完全相同，而 header 不再是包含塊。這比在面板那端補位移可靠 ——
       * 位移要猜 header 有多高、banner 在不在，而這個做法把前提直接拿掉。
       */}
      <div className="bg-surface-raised/90 ring-border-default absolute inset-0 -z-10 shadow-sm ring-1 backdrop-blur-xl" />
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-x-6">
          <BrandLogo />
          <div className="hidden items-center gap-x-4 lg:flex">
            <Link
              href={ISUNFA_ROUTE.SALARY_CALCULATOR}
              className={`hover:text-brand text-sm font-medium transition-colors ${isCalc ? "text-brand" : "text-text-secondary"}`}
            >
              {t("calculator.header.main_title")}
            </Link>

            <button
              onClick={() => setIsMechanismModalOpen(true)}
              className="text-text-muted hover:text-brand cursor-pointer border-none bg-transparent text-xs font-semibold transition-colors"
            >
              {t("calculator.header.how_it_works")}
            </button>
          </div>
          {/* {user && (
            <div className="hidden md:flex items-center gap-x-4">
              <Link
                href={ISUNFA_ROUTE.PAY_SLIP}
                className={`text-sm font-medium transition-colors hover:text-orange-600 ${isSlip ? "text-orange-600" : "text-gray-600"}`}
              >
                {t("calculator.header.pay_slip")}
              </Link>
              <Link
                href={ISUNFA_ROUTE.EMPLOYEE_LIST}
                className={`text-sm font-medium transition-colors hover:text-orange-600 ${isList ? "text-orange-600" : "text-gray-600"}`}
              >
                {t("calculator.header.employee_list")}
              </Link>
            </div>
          )} */}
        </div>

        {/* Info: (20260901 - Luphia) 右側控件列共用 HeaderActions（review #6731 三輪高-2）。develop 側這一列是 gap-x-4，統一後為 gap-x-6——與另兩個 header 一致，行為差異已在 PR 描述申報 */}
        <HeaderActions />
      </nav>

      <MechanismModal
        isOpen={isMechanismModalOpen}
        onClose={() => setIsMechanismModalOpen(false)}
      />
    </header>
  );
};

export default CalculatorHeader;
