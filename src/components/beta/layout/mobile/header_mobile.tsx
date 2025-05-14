import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { IoCloseOutline } from 'react-icons/io5';
import { GoArrowLeft } from 'react-icons/go';
import { VscGlobe, VscBell } from 'react-icons/vsc';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Profile from '@/components/beta/layout/profile';
import CompanyBadge from '@/components/beta/layout/company_badge';
import MainMenu from '@/components/beta/layout/mobile/main_menu';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import { INTERNATIONALIZATION_LIST } from '@/constants/i18n';
import { MenuContent } from '@/interfaces/side_menu';
import SubMenu from '@/components/beta/layout/mobile/sub_menu';

const HeaderMobile = () => {
  const { asPath } = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [usingMenuContent, setUsingMenuContent] = useState<MenuContent>(MenuContent.MAIN_MENU);
  const [headerTitle, setHeaderTitle] = useState<string>('');
  const [isDefaultMenuHeader, setIsDefaultMenuHeader] = useState<boolean>(true);
  const [selectedMenuOption, setSelectedMenuOption] = useState<string>('');

  const openMenu = () => setIsMenuOpen(true);

  const goBackToDefaultMenuContent = () => {
    setUsingMenuContent(MenuContent.MAIN_MENU);
    setHeaderTitle('');
    setIsDefaultMenuHeader(true);
  };

  const changeMenu = ({
    menuContent,
    headerTitle: newHeaderTitle,
  }: {
    menuContent: MenuContent;
    headerTitle: string;
  }) => {
    if (menuContent === MenuContent.MAIN_MENU) {
      goBackToDefaultMenuContent();
      return;
    }

    setUsingMenuContent(menuContent);
    setHeaderTitle(newHeaderTitle);
    setIsDefaultMenuHeader(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    goBackToDefaultMenuContent();
  };

  const handleBack = () => {
    switch (usingMenuContent) {
      case MenuContent.MAIN_MENU:
        goBackToDefaultMenuContent();
        break;
      case MenuContent.NOTIFICATION:
        goBackToDefaultMenuContent();
        break;
      case MenuContent.I18N:
        goBackToDefaultMenuContent();
        break;
      default:
        goBackToDefaultMenuContent();
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
        <div className="fixed left-0 top-0 z-40 flex h-screen w-full flex-col bg-surface-neutral-surface-lv2">
          {/* Info: (20250514 - Liz) Menu Header */}
          {isDefaultMenuHeader && (
            <section className="flex h-60px items-center gap-10px p-12px">
              <ModeSwitch />

              <button
                type="button"
                onClick={() => {
                  changeMenu({
                    menuContent: MenuContent.I18N,
                    headerTitle: 'languages',
                  });
                }}
                className="group p-10px"
              >
                <VscGlobe
                  size={20}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  changeMenu({
                    menuContent: MenuContent.NOTIFICATION,
                    headerTitle: 'notification',
                  });
                }}
                className="group p-10px"
              >
                <VscBell
                  size={20}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>

              <button type="button" onClick={closeMenu} className="group ml-auto p-10px">
                <IoCloseOutline
                  size={24}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>
            </section>
          )}

          {!isDefaultMenuHeader && (
            <section className="flex h-60px items-center justify-between p-12px">
              <button type="button" onClick={handleBack} className="group p-10px">
                <GoArrowLeft
                  size={24}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>

              <h1 className="text-xs font-semibold uppercase leading-5 tracking-wide-1 text-text-neutral-tertiary">
                {headerTitle}
              </h1>

              <button type="button" onClick={closeMenu} className="group p-10px">
                <IoCloseOutline
                  size={24}
                  className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover group-disabled:text-button-text-disable"
                />
              </button>
            </section>
          )}

          {/* Info: (20250513 - Liz) Menu Content - Default : MAIN_MENU */}
          <section className="flex flex-auto flex-col">
            {usingMenuContent === MenuContent.MAIN_MENU && (
              <MainMenu
                setSelectedMenuOption={setSelectedMenuOption}
                closeMenu={closeMenu}
                changeMenu={changeMenu}
              />
            )}

            {usingMenuContent === MenuContent.I18N && (
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

            {usingMenuContent === MenuContent.SUB_MENU && (
              <SubMenu selectedMenuOption={selectedMenuOption} closeMenu={closeMenu} />
            )}

            {usingMenuContent === MenuContent.NOTIFICATION && (
              <ul className="flex flex-col gap-12px">
                <li className="flex">
                  <Link
                    id="notificationButtonDesktop"
                    href={asPath}
                    className="flex flex-auto items-center justify-center gap-8px px-12px py-8px hover:bg-dropdown-surface-item-hover"
                  >
                    <span className="text-sm font-medium text-dropdown-text-primary">
                      Notification
                    </span>
                  </Link>
                </li>
              </ul>
            )}
          </section>
        </div>
      )}
    </header>
  );
};

export default HeaderMobile;
