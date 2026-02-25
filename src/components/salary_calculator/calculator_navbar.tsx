import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslation } from "@/i18n/i18n_context";
import { LogIn, LogOut, Home } from "lucide-react";
import useOuterClick from "@/lib/hooks/use_outer_click";
import { ISUNFA_ROUTE } from "@/constants/url";
import LanguageSelector from "@/components/header/language_selector";
import { useAuth } from "@/contexts/auth_context";
import { UserIcon } from "lucide-react";

const CalculatorNavbar: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const isSignIn = !!user;

  const {
    targetRef: userRef,
    componentVisible: isShowUserMenu,
    setComponentVisible: setIsShowUserMenu,
  } = useOuterClick<HTMLDivElement>(false);

  const isCalc = router.pathname === ISUNFA_ROUTE.SALARY_CALCULATOR;
  const isList = router.pathname === ISUNFA_ROUTE.EMPLOYEE_LIST;
  const isSlip = router.pathname === ISUNFA_ROUTE.PAY_SLIP;

  const toggleUserMenu = () => setIsShowUserMenu((prev) => !prev);

  const displayedLinks = isSignIn ? (
    <>
      <div className="flex items-center gap-24px">
        <Link
          href={ISUNFA_ROUTE.SALARY_CALCULATOR}
          className={`px-12px py-8px text-base font-medium hover:text-tabs-text-active ${isCalc ? "text-tabs-text-active" : "text-tabs-text-default"}`}
        >
          <div className="flex items-center gap-8px">
            <Home size={20} /> {t("calculator.header.calculator")}
          </div>
        </Link>
        <Link
          href={ISUNFA_ROUTE.PAY_SLIP}
          className={`px-12px py-8px text-base font-medium hover:text-tabs-text-active ${isSlip ? "text-tabs-text-active" : "text-tabs-text-default"}`}
        >
          {t("calculator.header.pay_slip")}
        </Link>
        <Link
          href={ISUNFA_ROUTE.EMPLOYEE_LIST}
          className={`px-12px py-8px text-base font-medium hover:text-tabs-text-active ${isList ? "text-tabs-text-active" : "text-tabs-text-default"}`}
        >
          {t("calculator.header.employee_list")}
        </Link>
      </div>

      <div ref={userRef} className="relative flex flex-col">
        {/* Info: (20250715 - Julian) User Avatar */}
        {/* <button type="button" onClick={toggleUserMenu} className="overflow-hidden rounded-full">
            <Image src={userAuth?.imageId} width={56} height={56} alt="avatar" />
          </button> */}
        <button
          type="button"
          onClick={toggleUserMenu}
          className="overflow-hidden rounded-full"
        >
          <UserIcon size={56} />
        </button>
        {isShowUserMenu && (
          <div className="absolute right-0 top-70px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
            {/* ToDo: (20250715 - Julian) Logout */}
            <button
              type="button"
              className="flex items-center gap-12px whitespace-nowrap px-12px py-8px text-sm font-medium hover:bg-dropdown-surface-item-hover"
            >
              {t("calculator.header.logout")} <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </>
  ) : (
    // Info: (20250724 - Julian) 先隱藏
    <button className="flex items-center gap-8px px-24px py-10px font-medium text-button-text-primary">
      <LogIn size={24} />
      {t("calculator:NAVBAR.LOGIN")}
    </button>
  );

  return (
    <div className="flex w-full items-center justify-between bg-surface-neutral-surface-lv1 px-lv-4 py-12px tablet:bg-surface-neutral-main-background tablet:px-60px">
      {/* Info: (20250715 - Julian) Logo and Title */}
      <div className="flex flex-1 items-center gap-x-lv-4">
        <Link href={ISUNFA_ROUTE.HOME}>
          <Image
            src="/logo/isunfa_logo_light.svg"
            alt="iSunFa_logo"
            width={100}
            height={30}
          />
        </Link>
        <Link
          href={ISUNFA_ROUTE.SALARY_CALCULATOR}
          className="text-base font-bold text-text-brand-primary-lv2 hover:text-text-brand-primary-solid tablet:text-lg"
        >
          {t("calculator.header.main_title")}
        </Link>
        <Link
          href={ISUNFA_ROUTE.OPERATING_MECHANISM}
          className="text-xs font-semibold text-link-text-primary hover:text-link-text-primary-hover tablet:text-sm"
        >
          {t("calculator.header.how_it_works")}
        </Link>
      </div>

      {/* Info: (20250715 - Julian) Links / Login Button */}
      <div className="flex items-center gap-lv-4">
        {/* ToDo: (20250829 - Julian) 為了避免 language menu 跑版，先用 margin-right 調整 */}
        <div className="mr-40px">
          <LanguageSelector />
        </div>

        {displayedLinks}
      </div>
    </div>
  );
};

export default CalculatorNavbar;
