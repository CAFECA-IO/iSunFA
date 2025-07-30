import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';
import { ISUNFA_ROUTE } from '@/constants/url';

const Profile = () => {
  const { t } = useTranslation('dashboard');
  const { signOut, userAuth, switchRole } = useUserCtx();

  const userAvatarSrc = userAuth?.imageId || '/elements/avatar_default.svg';

  const {
    targetRef: profileRef,
    componentVisible: isDropdownOpen,
    setComponentVisible: setIsDropdownOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  return (
    <section className="relative flex" ref={profileRef}>
      <button type="button" onClick={toggleDropdown} className="rounded-full">
        <Image
          src={userAvatarSrc}
          alt="user_avatar"
          width={40}
          height={40}
          className="rounded-full"
        ></Image>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full z-70 flex w-max translate-y-6 flex-col text-nowrap rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px text-dropdown-text-primary shadow-Dropshadow_M">
          {/* Info: (20241014 - Liz) ===== 我的帳號 ===== */}
          <Link
            href={ISUNFA_ROUTE.MY_ACCOUNT_PAGE}
            className="flex items-center gap-12px rounded-xs px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <Image
              src={'/icons/my_account_icon.svg'}
              alt="my_account_icon"
              width={16}
              height={16}
            ></Image>
            <p>{t('dashboard:HEADER.MY_ACCOUNT')}</p>
          </Link>

          {/* Info: (20241014 - Liz) ===== 訂閱與帳單 ===== */}
          <Link
            href={ISUNFA_ROUTE.SUBSCRIPTIONS}
            className="flex items-center gap-12px rounded-xs px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <Image src={'/icons/bell.svg'} alt="subscription_icon" width={16} height={16}></Image>
            <p>{t('dashboard:HEADER.SUBSCRIPTION_AND_BILLS')}</p>
          </Link>

          {/* Info: (20241209 - Liz) ===== 切換角色 ===== */}
          <button
            type="button"
            onClick={switchRole}
            className="flex items-center gap-12px rounded-xs px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <Image
              src={'/icons/switch_role_icon.svg'}
              alt="switch_role_icon"
              width={16}
              height={16}
            ></Image>
            <p>{t('dashboard:HEADER.SWITCH_ROLE')}</p>
          </button>

          {/* Info: (20241014 - Liz) ===== 登出 ===== */}
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-12px rounded-xs px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <Image src={'/icons/logout_icon.svg'} alt="logout_icon" width={16} height={16}></Image>
            <p>{t('dashboard:HEADER.LOGOUT')}</p>
          </button>
        </div>
      )}
    </section>
  );
};

export default Profile;
