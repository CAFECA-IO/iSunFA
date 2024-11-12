import Image from 'next/image';
import React from 'react';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useTranslation } from 'next-i18next';

const Profile = () => {
  const { t } = useTranslation('dashboard');
  const { signOut, userAuth } = useUserCtx();

  const userAvatarSrc = userAuth?.imageId || '/images/fake_user_avatar.png';

  // Deprecated: (20241105 - Liz)
  // eslint-disable-next-line no-console
  console.log('userAvatarSrc', userAvatarSrc);

  const {
    targetRef: profileRef,
    componentVisible: isDropdownOpen,
    setComponentVisible: setIsDropdownOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  return (
    <section className="relative" ref={profileRef}>
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
        <div className="absolute right-0 top-full z-70 flex w-max translate-y-6 flex-col text-nowrap rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M">
          {/* // Info: (20241014 - Liz) ===== 我的帳號 ===== */}
          {/* // ToDo: (20241014 - Liz) 連結到我的帳號頁面 */}
          <button
            type="button"
            onClick={toggleDropdown}
            className="flex items-center gap-12px rounded-xs px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <Image
              src={'/icons/my_account_icon.svg'}
              alt="my_account_icon"
              width={16}
              height={16}
            ></Image>
            <p>{t('dashboard:HEADER.MY_ACCOUNT')}</p>
          </button>

          {/* // Info: (20241014 - Liz) ===== 訂閱與帳單 ===== */}
          {/* // ToDo: (20241014 - Liz) 連結到訂閱與帳單的頁面 */}
          <button
            type="button"
            onClick={toggleDropdown}
            className="flex items-center gap-12px rounded-xs px-12px py-8px hover:bg-dropdown-surface-item-hover"
          >
            <Image src={'/icons/bell.svg'} alt="subscription_icon" width={16} height={16}></Image>
            <p>{t('dashboard:HEADER.SUBSCRIPTION_AND_BILLS')}</p>
          </button>

          {/* // Info: (20241014 - Liz) ===== 登出 ===== */}
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
