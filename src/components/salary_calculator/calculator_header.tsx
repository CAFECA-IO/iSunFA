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
