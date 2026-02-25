"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { ISUNFA_ROUTE } from "@/constants/url";
import LanguageSelector from "@/components/header/language_selector";
import BrandLogo from "@/components/header/brand_logo";
import UserActions from "@/components/header/user_actions";
import { useAuth } from "@/contexts/auth_context";

const CalculatorHeader: React.FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user } = useAuth();

  const isCalc = pathname === ISUNFA_ROUTE.SALARY_CALCULATOR;
  const isList = pathname === ISUNFA_ROUTE.EMPLOYEE_LIST;
  const isSlip = pathname === ISUNFA_ROUTE.PAY_SLIP;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl shadow-sm ring-1 ring-gray-900/5">
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-x-6">
          <BrandLogo />
          <div className="hidden lg:flex items-center gap-x-4">
            <Link
              href={ISUNFA_ROUTE.SALARY_CALCULATOR}
              className={`text-sm font-medium transition-colors hover:text-orange-600 ${isCalc ? "text-orange-600" : "text-gray-600"}`}
            >
              {t("calculator.header.main_title")}
            </Link>
            <Link
              href={ISUNFA_ROUTE.OPERATING_MECHANISM}
              className="text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors"
            >
              {t("calculator.header.how_it_works")}
            </Link>
          </div>
          {user && (
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
          )}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-8">
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>
    </header>
  );
};

export default CalculatorHeader;
