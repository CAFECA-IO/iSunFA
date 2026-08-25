"use client";

import { useState, FC } from 'react';

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
    <header className="sticky top-0 z-50 w-full bg-surface-raised/90 shadow-sm ring-1 ring-border-default backdrop-blur-xl">
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-x-6">
          <BrandLogo />
          <div className="hidden items-center gap-x-4 lg:flex">
            <Link
              href={ISUNFA_ROUTE.SALARY_CALCULATOR}
              className={`text-sm font-medium transition-colors hover:text-brand ${isCalc ? "text-brand" : "text-text-secondary"}`}
            >
              {t("calculator.header.main_title")}
            </Link>
            
            <button
              onClick={() => setIsMechanismModalOpen(true)}
              className="text-xs font-semibold text-text-muted hover:text-brand transition-colors bg-transparent border-none cursor-pointer"
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

        <div className="flex items-center gap-x-4 lg:gap-x-8">
          <HeaderNav />
          {/* Info: (20260825 - Julian) xl 以下這兩個收進漢堡選單（見 header_nav.tsx） */}
          <div className="hidden items-center gap-x-4 lg:gap-x-8 xl:flex">
            <ThemeToggle />
            <LanguageSelector />
          </div>
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
