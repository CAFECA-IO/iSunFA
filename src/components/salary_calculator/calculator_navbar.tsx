import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { TbLogin2, TbLogout2 } from 'react-icons/tb';
import { GrHomeRounded } from 'react-icons/gr';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
// import { useUserCtx } from '@/contexts/user_context';

const CalculatorNavbar: React.FC = () => {
  const { t } = useTranslation('calculator');
  const router = useRouter();
  //   const { isSignIn, userAuth } = useUserCtx();
  const isSignIn = true;
  const userAuth = {
    imageId: '/entities/happy_customer_001.png',
  };

  const {
    targetRef: userRef,
    componentVisible: isShowUserMenu,
    setComponentVisible: setIsShowUserMenu,
  } = useOuterClick<HTMLDivElement>(false);

  const isCalc = router.pathname === ISUNFA_ROUTE.SALARY_CALCULATOR;
  const isList = router.pathname === ISUNFA_ROUTE.EMPLOYEE_LIST;
  const isSlip = router.pathname === ISUNFA_ROUTE.PAY_SLIP;

  const toggleUserMenu = () => setIsShowUserMenu((prev) => !prev);

  const displayedLinks =
    isSignIn && userAuth ? (
      <div className="flex items-center gap-lv-4">
        <div className="flex items-center gap-24px">
          <Link
            href={ISUNFA_ROUTE.SALARY_CALCULATOR}
            className={`px-12px py-8px text-base font-medium hover:text-tabs-text-active ${isCalc ? 'text-tabs-text-active' : 'text-tabs-text-default'}`}
          >
            <div className="flex items-center gap-8px">
              <GrHomeRounded size={20} /> Calculator
            </div>
          </Link>
          <Link
            href={ISUNFA_ROUTE.PAY_SLIP}
            className={`px-12px py-8px text-base font-medium hover:text-tabs-text-active ${isSlip ? 'text-tabs-text-active' : 'text-tabs-text-default'}`}
          >
            My Pay Slip
          </Link>
          <Link
            href={ISUNFA_ROUTE.EMPLOYEE_LIST}
            className={`px-12px py-8px text-base font-medium hover:text-tabs-text-active ${isList ? 'text-tabs-text-active' : 'text-tabs-text-default'}`}
          >
            Employee List
          </Link>
        </div>

        <div ref={userRef} className="relative flex flex-col">
          {/* Info: (20250715 - Julian) User Avatar */}
          <button type="button" onClick={toggleUserMenu} className="overflow-hidden rounded-full">
            <Image src={userAuth?.imageId} width={56} height={56} alt="avatar" />
          </button>
          {isShowUserMenu && (
            <div className="absolute right-0 top-70px flex flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
              {/* ToDo: (20250715 - Julian) Logout */}
              <button
                type="button"
                className="flex items-center gap-12px whitespace-nowrap px-12px py-8px text-sm font-medium hover:bg-dropdown-surface-item-hover"
              >
                Log out <TbLogout2 size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    ) : (
      <Link
        href={ISUNFA_ROUTE.LOGIN}
        className="flex items-center gap-8px px-24px py-10px font-medium text-button-text-primary"
      >
        <TbLogin2 size={24} />
        {t('calculator:BUTTON.LOGIN')}
      </Link>
    );
  return (
    <div className="flex w-full items-center justify-between bg-surface-neutral-main-background px-60px py-12px">
      {/* Info: (20250715 - Julian) Logo and Title */}
      <div className="flex flex-1 items-center gap-lv-4">
        <Link href={ISUNFA_ROUTE.DASHBOARD}>
          <Image src="/logo/isunfa_logo_light.svg" alt="iSunFa_logo" width={100} height={30} />
        </Link>
        <p className="text-lg font-bold text-text-brand-primary-lv2">
          {t('calculator:PAGE.MAIN_TITLE')}
        </p>
      </div>

      {/* Info: (20250715 - Julian) Links / Login Button */}
      {displayedLinks}
    </div>
  );
};

export default CalculatorNavbar;
