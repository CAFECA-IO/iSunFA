import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { IoCloseOutline } from 'react-icons/io5';
import { GoArrowLeft } from 'react-icons/go';
import { VscGlobe } from 'react-icons/vsc';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Profile from '@/components/beta/layout/profile';
import CompanyBadge from '@/components/beta/layout/company_badge';
import SideMenuMobile from '@/components/beta/layout/mobile/side_menu_mobile';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import Notification from '@/components/beta/layout/notification';
import { INTERNATIONALIZATION_LIST } from '@/constants/i18n';

enum MenuItem {
  SIDE_MENU = 'SideMenu',
  NOTIFICATION = 'Notification',
  I18N = 'I18n',
  MODE_SWITCH = 'ModeSwitch',
}

interface HeaderMobileProps {
  toggleOverlay: () => void;
}

const HeaderMobile = ({ toggleOverlay }: HeaderMobileProps) => {
  const { asPath } = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState<boolean>(false);
  const [usingMenuItem, setUsingMenuItem] = useState<MenuItem>(MenuItem.SIDE_MENU);
  const [usingMenuItemTitle, setUsingMenuItemTitle] = useState<string>('');
  const isUsingDefaultMenuItem = usingMenuItem === MenuItem.SIDE_MENU;

  const openMenu = () => setIsMenuOpen(true);
  const toggleNotificationPanel = () => setIsNotificationPanelOpen((prev) => !prev);

  const goBackToDefaultMenuItem = () => {
    setUsingMenuItem(MenuItem.SIDE_MENU);
    setUsingMenuItemTitle('');
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setUsingMenuItem(MenuItem.SIDE_MENU);
    setUsingMenuItemTitle('');
  };

  const handleBack = () => {
    // use switch case to handle different menu items
    switch (usingMenuItem) {
      case MenuItem.SIDE_MENU:
        goBackToDefaultMenuItem();
        break;
      case MenuItem.NOTIFICATION:
        goBackToDefaultMenuItem();
        break;
      case MenuItem.I18N:
        goBackToDefaultMenuItem();
        break;
      case MenuItem.MODE_SWITCH:
        goBackToDefaultMenuItem();
        break;
      default:
        goBackToDefaultMenuItem();
        break;
    }
  };

  return (
    <header className="flex items-center bg-surface-neutral-surface-lv2 px-16px py-10px tablet:hidden">
      <button type="button" className="p-10px" onClick={openMenu}>
        <FiMenu
          size={20}
          className="text-button-text-secondary hover:text-button-text-primary-hover disabled:text-button-text-disable"
        />
      </button>

      <section className="ml-auto flex flex-none items-center gap-16px">
        <CompanyBadge />

        <Profile />
      </section>

      {isMenuOpen && (
        <div className="fixed left-0 top-0 z-40 h-full w-full bg-surface-neutral-surface-lv2">
          {isUsingDefaultMenuItem && (
            <section className="flex h-60px items-center gap-10px p-12px">
              <ModeSwitch />

              <button
                type="button"
                onClick={() => {
                  setUsingMenuItem(MenuItem.I18N);
                  setUsingMenuItemTitle('languages');
                }}
                className="group p-10px"
              >
                <VscGlobe
                  size={26}
                  className="text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
                />
              </button>

              <Notification
                isPanelOpen={isNotificationPanelOpen}
                setIsPanelOpen={setIsNotificationPanelOpen}
                toggleNotificationPanel={toggleNotificationPanel}
              />

              <button type="button" onClick={closeMenu} className="group ml-auto p-10px">
                <IoCloseOutline
                  size={24}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>
            </section>
          )}

          {!isUsingDefaultMenuItem && (
            <section className="flex h-60px items-center justify-between p-12px">
              <button type="button" onClick={handleBack} className="group p-10px">
                <GoArrowLeft
                  size={24}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>

              <h1 className="text-xs font-semibold uppercase leading-5 tracking-wide-1 text-text-neutral-tertiary">
                {usingMenuItemTitle}
              </h1>

              <button type="button" onClick={closeMenu} className="group p-10px">
                <IoCloseOutline
                  size={24}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>
            </section>
          )}

          {/* Info: (20250513 - Liz) Default : SIDE_MENU */}
          {usingMenuItem === MenuItem.SIDE_MENU && <SideMenuMobile toggleOverlay={toggleOverlay} />}

          {usingMenuItem === MenuItem.I18N && (
            <ul className="flex flex-col gap-12px">
              {INTERNATIONALIZATION_LIST.map((item) => (
                <li key={item.value} onClick={closeMenu} className="flex">
                  <Link
                    id={`${item.value.toUpperCase()}ButtonDesktop`}
                    scroll={false}
                    locale={item.value}
                    href={asPath}
                    className="flex flex-auto items-center justify-center gap-8px px-12px py-8px hover:bg-dropdown-surface-item-hover"
                  >
                    <Image
                      src={item.flag}
                      alt="flag"
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                    <span className="text-sm font-medium text-dropdown-text-primary">
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </header>
  );
};

export default HeaderMobile;
