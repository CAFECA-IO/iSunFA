import React, { useEffect, useState } from 'react';
import { FiLayout } from 'react-icons/fi';
import { IoIosArrowForward } from 'react-icons/io';
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

interface IDefaultMenuOption {
  title: string;
  iconSrc: string;
  iconSrcAlt: string;
  iconWidth: number;
  iconHeight: number;
  disabled?: boolean;
}

interface IMenuOptionWithLink extends IDefaultMenuOption {
  link: string;
  subMenu?: undefined;
}

interface IMenuOptionWithSubMenu extends IDefaultMenuOption {
  link?: undefined;
  subMenu: ISubMenuSubMenuSection[];
}

type TMenuOption = IMenuOptionWithLink | IMenuOptionWithSubMenu;

interface ISubMenuSubMenuSection {
  caption: string;
  subMenu: (ISubMenuOptionWithLink | ISubMenuOptionWithButton)[];
}

interface IDefaultSubMenuOption {
  title: string;
  disabled?: boolean;
  needToVerifyAccountBook: boolean;
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

const MENU_CONFIG: TMenuOption[] = [
  {
    title: 'ACCOUNTING',
    iconSrc: '/icons/accounting_icon_calculator.svg',
    iconSrcAlt: 'accounting_icon_calculator',
    iconWidth: 20.34,
    iconHeight: 23.85,
    subMenu: [
      {
        caption: 'ACCOUNTING',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'ADDING_VOUCHER',
            link: ISUNFA_ROUTE.ADD_NEW_VOUCHER,
            needToVerifyAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'VOUCHER_LIST',
            link: ISUNFA_ROUTE.VOUCHER_LIST,
            needToVerifyAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'PAYABLE_RECEIVABLE_LIST',
            link: ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST,
            needToVerifyAccountBook: true,
          },
        ],
      },
      {
        caption: 'CERTIFICATES',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'UPLOAD_CERTIFICATE',
            link: ISUNFA_ROUTE.CERTIFICATE_LIST,
            needToVerifyAccountBook: true,
          },
        ],
      },
    ],
  },
  {
    title: 'ASSET_MANAGEMENT',
    iconSrc: '/icons/asset_management_icon.svg',
    iconSrcAlt: 'asset_management_icon',
    iconWidth: 24,
    iconHeight: 24,
    subMenu: [
      {
        caption: 'ASSET',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'ASSET_LIST',
            link: ISUNFA_ROUTE.ASSET_LIST,
            needToVerifyAccountBook: true,
          },
        ],
      },
    ],
  },
  {
    title: 'PERSONNEL_MANAGEMENT',
    iconSrc: '/icons/personnel_management_icon.svg',
    iconSrcAlt: 'personnel_management_icon',
    iconWidth: 23.95,
    iconHeight: 24,
    disabled: true,
    subMenu: [],
  },
  {
    title: 'REPORTS',
    iconSrc: '/icons/reports_icon.svg',
    iconSrcAlt: 'reports_icon',
    iconWidth: 20.58,
    iconHeight: 23.85,
    subMenu: [
      {
        caption: 'FINANCIAL_REPORT',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'BALANCE_SHEET',
            link: ISUNFA_ROUTE.BALANCE_SHEET,
            needToVerifyAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'INCOME_STATEMENT',
            link: ISUNFA_ROUTE.INCOME_STATEMENT,
            needToVerifyAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'STATEMENT_OF_CASH_FLOWS',
            link: ISUNFA_ROUTE.CASH_FLOW,
            needToVerifyAccountBook: true,
          },
        ],
      },
      {
        caption: 'TAX_REPORT',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'BUSINESS_TAX_RETURN_401',
            link: ISUNFA_ROUTE.BUSINESS_TAX,
            needToVerifyAccountBook: true,
          },
        ],
      },
      {
        caption: 'DAILY_REPORT',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'LEDGER',
            link: ISUNFA_ROUTE.LEDGER,
            needToVerifyAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'TRIAL_BALANCE',
            link: ISUNFA_ROUTE.TRIAL_BALANCE,
            needToVerifyAccountBook: true,
          },
        ],
      },
      {
        caption: 'EMBED_CODE',
        subMenu: [
          {
            type: SubMenuOptionType.BUTTON,
            title: 'GENERATE_EMBED_CODE',
            needToVerifyAccountBook: true,
          },
        ],
      },
    ],
  },
  {
    title: 'PARAMETER_SETTINGS',
    iconSrc: '/icons/parameter_setting.svg',
    iconSrcAlt: 'parameter_setting',
    iconWidth: 23.77,
    iconHeight: 23.73,
    subMenu: [
      {
        caption: 'SETTINGS',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'GENERAL_SETTINGS',
            link: ISUNFA_ROUTE.GENERAL_SETTINGS,
            needToVerifyAccountBook: false,
          },
        ],
      },
      {
        caption: 'ACCOUNT_BOOK_SETTINGS',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'ACCOUNTING_SETTINGS',
            link: ISUNFA_ROUTE.ACCOUNTING_SETTINGS,
            needToVerifyAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'CLIENTS_SUPPLIERS_MANAGEMENT',
            link: ISUNFA_ROUTE.COUNTERPARTY,
            needToVerifyAccountBook: true,
          },
        ],
      },
    ],
  },
  {
    title: 'BACK_TO_DASHBOARD',
    iconSrc: '/icons/dashboard.svg',
    iconSrcAlt: 'dashboard_icon',
    iconWidth: 24,
    iconHeight: 24,
    link: ISUNFA_ROUTE.DASHBOARD,
  },
];

type TSubMenuOption = ISubMenuOptionWithLink | ISubMenuOptionWithButton;
type SubMenuOptionProps = TSubMenuOption & {
  toggleOverlay?: () => void;
};

const SubMenuOption = ({
  type,
  title,
  link,
  disabled,
  needToVerifyAccountBook,
  toggleOverlay = () => {},
}: SubMenuOptionProps) => {
  const { t } = useTranslation(['layout']);
  const { toastHandler } = useModalContext();
  const { selectedAccountBook } = useUserCtx();
  const noSelectedCompany = !selectedAccountBook;
  const [isEmbedCodeModalOpen, setIsEmbedCodeModalOpen] = useState<boolean>(false);

  const toggleEmbedCodeModal = () => {
    setIsEmbedCodeModalOpen((prev) => !prev);
  };

  const showCompanyNeededToast = () => {
    toastHandler({
      id: ToastId.NEED_TO_SELECT_COMPANY,
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
    if (needToVerifyAccountBook && noSelectedCompany) {
      showCompanyNeededToast();
      return;
    }

    if (title === 'GENERATE_EMBED_CODE') {
      toggleEmbedCodeModal();
    }
    // Info: (20241126 - Liz) 如果有其他按鈕的 onClick 事件就新增在這裡: if (title === 'XXX') { ... }
  };

  const onClickLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (needToVerifyAccountBook && noSelectedCompany) {
      // Info: (20241018 - Liz) 阻止導航
      e.preventDefault();
      showCompanyNeededToast();
    }
  };

  if (type === SubMenuOptionType.LINK) {
    return (
      <Link
        href={link}
        onClick={onClickLink}
        className={`rounded-xs px-12px py-10px font-medium hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:bg-transparent disabled:text-button-text-disable ${disabled ? 'pointer-events-none text-button-text-disable' : 'text-button-text-secondary'}`}
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
          className={`rounded-xs px-12px py-10px text-left font-medium hover:bg-button-surface-soft-secondary-hover hover:text-button-text-secondary-solid disabled:bg-transparent disabled:text-button-text-disable ${disabled ? 'pointer-events-none text-button-text-disable' : 'text-button-text-secondary'}`}
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
  subMenu: ISubMenuSubMenuSection;
  toggleOverlay: () => void;
}

const SubMenuSection = ({ subMenu, toggleOverlay }: SubMenuSectionProps) => {
  const { t } = useTranslation(['layout']);
  return (
    <>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-text-brand-primary-lv1">
        {t(`layout:SIDE_MENU.${subMenu.caption}`)}
      </h4>

      {subMenu.subMenu.map((item) => (
        <SubMenuOption key={item.title} {...item} toggleOverlay={toggleOverlay} />
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
    <div className="absolute left-full top-0 z-20 h-full w-280px bg-surface-neutral-surface-lv1 px-12px py-32px shadow-SideMenu before:absolute before:left-0 before:top-0 before:h-full before:w-12px before:bg-gradient-to-r before:from-gray-200 before:to-transparent">
      <div className="flex flex-col gap-24px">
        {subMenu.map((item) => (
          <SubMenuSection key={item.caption} subMenu={item} toggleOverlay={toggleOverlay} />
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
  link,
  subMenu,
  onClickMenuOption,
}: MenuOptionProps) => {
  const { t } = useTranslation(['layout']);

  return (
    <div>
      {link ? (
        <Link
          href={link}
          className="flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:bg-transparent disabled:text-button-text-disable"
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
          disabled={disabled}
          className="flex w-full items-center gap-8px px-12px py-10px font-medium text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:bg-transparent disabled:text-button-text-disable"
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
  const { version } = packageJson;
  const { t } = useTranslation(['layout']);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(true);
  const [selectedMenuOption, setSelectedMenuOption] = useState<string>('');

  const toggleSideMenu = () => {
    setIsSideMenuOpen((prev) => !prev);
  };

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
          {/* // Info: (20241121 - Liz) Side Menu Icon */}
          <div>
            <button type="button" onClick={toggleSideMenu} className="p-10px">
              <FiLayout size={24} />
            </button>
          </div>

          {/* // Info: (20241121 - Liz) Side Menu Content */}
          <div className="flex flex-auto flex-col gap-24px">
            {MENU_CONFIG.map((menu) => (
              <MenuOption key={menu.title} {...menu} onClickMenuOption={onClickMenuOption} />
            ))}
          </div>

          {isSubMenuOpen && (
            <SubMenu selectedMenuOption={selectedMenuOption} toggleOverlay={toggleOverlay} />
          )}

          {/* // Info: (20241121 - Liz) Side Menu Footer */}
          <div className="flex flex-col items-center gap-8px">
            <p className="text-xs text-text-neutral-tertiary">iSunFA 2024 Beta v{version}</p>

            {/* // Info: (20241212 - Liz) 隱私權政策和服務條款頁面 */}
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
          <button type="button" onClick={toggleSideMenu} className="p-10px">
            <FiLayout size={24} />
          </button>
        </section>
      )}
    </div>
  );
};

export default SideMenu;
