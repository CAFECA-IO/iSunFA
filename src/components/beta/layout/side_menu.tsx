import React, { useEffect, useState } from 'react';
import { FiLayout } from 'react-icons/fi';
import { IoIosArrowForward } from 'react-icons/io';
import { GoArrowSwitch } from 'react-icons/go';
import Image from 'next/image';
import Link from 'next/link';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import EmbedCodeModal from '@/components/embed_code_modal/embed_code_modal_new';
import packageJson from '@package';
import { TeamRole } from '@/interfaces/team';
import { useDashboardCtx } from '@/contexts/dashboard_context';
import { MENU_CONFIG } from '@/interfaces/side_menu';
import { cn } from '@/lib/utils/common';

interface IDefaultMenuOption {
  title: string;
  iconSrc: string;
  iconSrcAlt: string;
  iconWidth: number;
  iconHeight: number;
  disabled?: boolean; // Info: (20250417 - Liz) if true 會在畫面上隱藏
  hiddenForRole?: TeamRole;
}

interface IMenuOptionWithLink extends IDefaultMenuOption {
  link: string;
  subMenu?: undefined;
}

interface IMenuOptionWithSubMenu extends IDefaultMenuOption {
  link?: undefined;
  subMenu: ISubMenuSection[];
}

type TMenuOption = IMenuOptionWithLink | IMenuOptionWithSubMenu;

interface ISubMenuSection {
  caption: string;
  disabled?: boolean;
  hiddenForRole?: TeamRole;
  subMenu: (ISubMenuOptionWithLink | ISubMenuOptionWithButton)[];
}

interface IDefaultSubMenuOption {
  title: string;
  disabled?: boolean;
  needToConnectAccountBook: boolean;
  hiddenForRole?: TeamRole;
}

enum SubMenuOptionType {
  LINK = 'Link',
  BUTTON = 'Button',
}

interface ISubMenuOptionWithLink extends IDefaultSubMenuOption {
  type: SubMenuOptionType.LINK;
  link: string;
}
interface ISubMenuOptionWithButton extends IDefaultSubMenuOption {
  type: SubMenuOptionType.BUTTON;
  link?: undefined;
}

type TSubMenuOption = ISubMenuOptionWithLink | ISubMenuOptionWithButton;
type SubMenuOptionProps = TSubMenuOption & {
  toggleOverlay?: () => void;
};

const SubMenuOption = ({
  type,
  title,
  link,
  disabled,
  needToConnectAccountBook,
  hiddenForRole,
  toggleOverlay = () => {},
}: SubMenuOptionProps) => {
  const { t } = useTranslation(['layout']);
  const { toastHandler } = useModalContext();
  const { connectedAccountBook } = useUserCtx();
  const notConnectAccountBook = !connectedAccountBook;
  const [isEmbedCodeModalOpen, setIsEmbedCodeModalOpen] = useState<boolean>(false);
  const { teamRole } = useUserCtx();

  const toggleEmbedCodeModal = () => {
    setIsEmbedCodeModalOpen((prev) => !prev);
  };

  const showAccountBookNeededToast = () => {
    toastHandler({
      id: ToastId.NEED_TO_SELECT_ACCOUNT_BOOK,
      type: ToastType.INFO,
      content: (
        <div className="flex items-center gap-32px">
          <p className="text-sm text-text-neutral-primary">
            {t('layout:TOAST.PLEASE_SELECT_AN_ACCOUNT_BOOK_BEFORE_PROCEEDING_WITH_THE_OPERATION')}
          </p>
          <Link
            href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE}
            className="text-base font-semibold text-link-text-primary"
          >
            {t('layout:TOAST.ACCOUNT_BOOKS_LINK')}
          </Link>
        </div>
      ),
      closeable: true,
      position: ToastPosition.TOP_CENTER,
      onOpen: () => {
        // Info: (20241018 - Liz) 開啟 Toast 時順便開啟 Overlay
        toggleOverlay();
      },
      onClose: () => {
        // Info: (20241018 - Liz) 關閉 Toast 時順便關閉 Overlay
        toggleOverlay();
      },
    });
  };

  const onClickButton = () => {
    if (needToConnectAccountBook && notConnectAccountBook) {
      showAccountBookNeededToast();
      return;
    }

    if (title === 'GENERATE_EMBED_CODE') {
      toggleEmbedCodeModal();
    }
    // Info: (20241126 - Liz) 如果有其他按鈕的 onClick 事件就新增在這裡: if (title === 'XXX') { ... }
  };

  const onClickLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (needToConnectAccountBook && notConnectAccountBook) {
      // Info: (20241018 - Liz) 阻止導航
      e.preventDefault();
      showAccountBookNeededToast();
    }
  };

  if (disabled) return null;

  if (type === SubMenuOptionType.LINK) {
    return (
      <Link
        href={link}
        onClick={onClickLink}
        className={cn('rounded-xs px-12px py-10px font-medium text-button-text-secondary', {
          'pointer-events-none disabled:text-button-text-disable':
            hiddenForRole && hiddenForRole === teamRole,
          'hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid':
            !hiddenForRole || hiddenForRole !== teamRole,
        })}
      >
        {t(`layout:SIDE_MENU.${title}`)}
      </Link>
    );
  }

  if (type === SubMenuOptionType.BUTTON) {
    return (
      <>
        <button
          type="button"
          onClick={onClickButton}
          className="rounded-xs px-12px py-10px text-left font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid"
        >
          {t(`layout:SIDE_MENU.${title}`)}
        </button>

        {isEmbedCodeModalOpen && (
          <EmbedCodeModal
            isModalVisible={isEmbedCodeModalOpen}
            modalVisibilityHandler={toggleEmbedCodeModal}
          />
        )}
      </>
    );
  }

  return null;
};

interface SubMenuSectionProps {
  subMenuSection: ISubMenuSection;
  toggleOverlay: () => void;
}

const SubMenuSection = ({ subMenuSection, toggleOverlay }: SubMenuSectionProps) => {
  const { teamRole } = useUserCtx();

  const { t } = useTranslation(['layout']);

  if (subMenuSection.disabled) return null;

  return (
    <>
      <h4
        className={cn(
          'text-xs font-semibold uppercase tracking-widest text-text-brand-primary-lv1',
          {
            'pointer-events-none disabled:text-button-text-disable':
              subMenuSection.hiddenForRole && subMenuSection.hiddenForRole === teamRole,
          }
        )}
      >
        {t(`layout:SIDE_MENU.${subMenuSection.caption}`)}
      </h4>

      {subMenuSection.subMenu.map((option) => (
        <SubMenuOption key={option.title} {...option} toggleOverlay={toggleOverlay} />
      ))}
    </>
  );
};

interface SubMenuProps {
  selectedMenuOption: string;
  toggleOverlay: () => void;
}

const SubMenu = ({ selectedMenuOption, toggleOverlay }: SubMenuProps) => {
  const subMenu = MENU_CONFIG.find((menu) => menu.title === selectedMenuOption)?.subMenu;

  if (!subMenu) return null;

  return (
    <div className="absolute left-full top-0 z-20 h-full w-280px bg-surface-neutral-surface-lv1 px-12px py-32px shadow-SideMenu before:absolute before:left-0 before:top-0 before:h-full before:w-12px before:bg-gradient-to-r before:from-shadow-lv-4 before:to-transparent">
      <div className="flex flex-col gap-24px">
        {subMenu.map((item) => (
          <SubMenuSection key={item.caption} subMenuSection={item} toggleOverlay={toggleOverlay} />
        ))}
      </div>
    </div>
  );
};

type MenuOptionProps = TMenuOption & {
  onClickMenuOption: (menuOptionTitle: string) => void;
};

const MenuOption = ({
  title,
  iconSrc,
  iconSrcAlt,
  iconWidth,
  iconHeight,
  disabled = false,
  hiddenForRole,
  link,
  subMenu,
  onClickMenuOption,
}: MenuOptionProps) => {
  const { t } = useTranslation(['layout']);
  const { teamRole } = useUserCtx();

  if (disabled) return null;

  return (
    <div>
      {link ? (
        <Link
          href={link}
          className={cn(
            'flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary',
            {
              'pointer-events-none disabled:text-button-text-disable':
                hiddenForRole && hiddenForRole === teamRole,
              'hover:bg-button-surface-soft-secondary-hover':
                !hiddenForRole || hiddenForRole !== teamRole,
            }
          )}
        >
          <div className="flex h-24px w-24px items-center justify-center">
            <Image src={iconSrc} alt={iconSrcAlt} width={iconWidth} height={iconHeight}></Image>
          </div>
          <p className="grow text-left">{t(`layout:SIDE_MENU.${title}`)}</p>
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onClickMenuOption(title)}
          className="flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover"
        >
          <div className="flex h-24px w-24px items-center justify-center">
            <Image src={iconSrc} alt={iconSrcAlt} width={iconWidth} height={iconHeight}></Image>
          </div>
          <p className="grow text-left">{t(`layout:SIDE_MENU.${title}`)}</p>
          {subMenu && <IoIosArrowForward size={20} />}
        </button>
      )}
    </div>
  );
};

interface SideMenuProps {
  toggleOverlay: () => void;
  notPrint?: boolean;
}

const SideMenu = ({ toggleOverlay, notPrint }: SideMenuProps) => {
  const { t } = useTranslation(['layout']);
  const { version, versionName } = packageJson;
  const currentYear = new Date().getFullYear();
  const [selectedMenuOption, setSelectedMenuOption] = useState<string>('');
  const { isSideMenuOpen, toggleSideMenu } = useDashboardCtx();
  const { connectedAccountBook } = useUserCtx();

  const hasConnectedAccountBook = !!connectedAccountBook;
  const userAvatarSrc = hasConnectedAccountBook
    ? connectedAccountBook.imageId
    : '/images/default_account_book_image.svg';

  const {
    targetRef: subMenuTargetRef,
    componentVisible: isSubMenuOpen,
    setComponentVisible: setIsSubMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const onClickMenuOption = (menuOption: string) => {
    setSelectedMenuOption((prev) => {
      const currentMenuOption = prev === menuOption ? '' : menuOption;
      setIsSubMenuOpen(!!currentMenuOption);
      return currentMenuOption;
    });
  };

  useEffect(() => {
    // Info: (20241121 - Liz) 觸發 useOuterClick 的 handleClickOutside 時，將 selectedMenuOption 設為空字串
    if (!isSubMenuOpen && selectedMenuOption) {
      setSelectedMenuOption('');
    }
  }, [isSubMenuOpen, selectedMenuOption]);

  return (
    <div
      className={`z-100 h-full bg-surface-neutral-main-background ${notPrint ? 'print:hidden' : ''}`}
    >
      {isSideMenuOpen ? (
        <section
          className="relative flex h-full w-280px flex-none flex-col gap-24px bg-surface-neutral-surface-lv2 px-12px py-32px shadow-SideMenu"
          ref={subMenuTargetRef}
        >
          {/* Info: (20241121 - Liz) Side Menu Icon */}
          <div>
            <button
              type="button"
              onClick={toggleSideMenu}
              className="p-10px text-button-text-secondary"
            >
              <FiLayout size={24} />
            </button>
          </div>

          {/* Info: (20250401 - Liz) Profile (Connected Account Book) */}
          <section className="flex items-center gap-16px">
            <div className="flex-none items-center justify-center">
              <Image
                src={userAvatarSrc}
                alt="user_avatar"
                width={64}
                height={64}
                className="rounded-full"
              ></Image>
            </div>

            <div className="flex min-w-0 flex-auto items-center justify-between">
              <div className="flex min-w-0 flex-col gap-4px">
                <h3 className="text-xs font-semibold leading-5 tracking-tight-016 text-text-neutral-tertiary">
                  {t('layout:SIDE_MENU.CURRENT_ACCOUNT_BOOK')}
                </h3>

                {hasConnectedAccountBook && (
                  <h4 className="truncate text-lg font-semibold text-text-neutral-secondary">
                    {connectedAccountBook.name}
                  </h4>
                )}

                {!hasConnectedAccountBook && (
                  <Link
                    href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE}
                    className="text-start text-lg font-semibold tracking-tight-018 text-link-text-primary"
                  >
                    {t('layout:SIDE_MENU.SELECT_ACCOUNT_BOOK')}
                  </Link>
                )}
              </div>

              {hasConnectedAccountBook && (
                <Link
                  href={ISUNFA_ROUTE.ACCOUNT_BOOKS_PAGE}
                  className="flex-none text-button-text-secondary"
                >
                  <GoArrowSwitch size={24} />
                </Link>
              )}
            </div>
          </section>

          {/* Info: (20250401 - Liz) Divider */}
          <div className="h-1px bg-divider-stroke-lv-4"></div>

          {/* Info: (20241121 - Liz) Side Menu Content */}
          <div className="flex flex-auto flex-col gap-24px">
            {MENU_CONFIG.map((menu) => (
              <MenuOption key={menu.title} {...menu} onClickMenuOption={onClickMenuOption} />
            ))}
          </div>

          {isSubMenuOpen && (
            <SubMenu selectedMenuOption={selectedMenuOption} toggleOverlay={toggleOverlay} />
          )}

          {/* Info: (20241121 - Liz) Side Menu Footer */}
          <div className="flex flex-col items-center gap-8px">
            <p className="text-xs text-text-neutral-tertiary">
              iSunFA {currentYear} {versionName} v{version}
            </p>

            {/* Info: (20241212 - Liz) 隱私權政策和服務條款頁面 */}
            <div className="flex gap-8px text-sm font-semibold">
              <Link href={ISUNFA_ROUTE.PRIVACY_POLICY} className="text-link-text-primary">
                {t('layout:SIDE_MENU.PRIVACY_POLICY')}
              </Link>
              <div className="w-1px bg-stroke-neutral-quaternary"></div>
              <Link href={ISUNFA_ROUTE.TERMS_OF_SERVICE} className="text-link-text-primary">
                {t('layout:SIDE_MENU.TERMS_OF_SERVICE')}
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="h-full w-66px flex-none px-12px py-32px">
          <button
            type="button"
            onClick={toggleSideMenu}
            className="p-10px text-button-text-secondary"
          >
            <FiLayout size={24} />
          </button>
        </section>
      )}
    </div>
  );
};

export default SideMenu;
