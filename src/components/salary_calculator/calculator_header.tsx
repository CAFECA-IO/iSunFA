"use client";

import { useState, FC } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { ISUNFA_ROUTE } from "@/constants/url";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";
import BrandLogo from "@/components/header/brand_logo";
import UserActions from "@/components/header/user_actions";
import HeaderNav from "@/components/header/header_nav";
import MechanismModal from "@/components/salary_calculator/mechanism_modal";

const CalculatorHeader: FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isMechanismModalOpen, setIsMechanismModalOpen] = useState(false);

  const isCalc = pathname === ISUNFA_ROUTE.SALARY_CALCULATOR;

  return (
    <header className="bg-surface-raised/90 ring-border-default sticky top-0 z-50 w-full shadow-sm ring-1 backdrop-blur-xl">
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
          {/*
            Info: (20260831 - Julian) 這裡原本有兩條指向 /salary_calculator/pay_slip
            與 /salary_calculator/employee_list 的導覽連結（被註解掉）。
            那兩個頁面已經搬到 /user/account_book/[account_book_id]/salary_calculator 之下，
            公開版的 header 不該有入口 —— 帳本版的導覽由 UserHeader 負責。
          */}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-8">
          <HeaderNav />
          <ThemeToggle />
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>

      <MechanismModal
        isOpen={isMechanismModalOpen}
        onClose={() => setIsMechanismModalOpen(false)}
      />
    </header>
  );
};

export default CalculatorHeader;
