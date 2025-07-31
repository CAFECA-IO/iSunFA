import { TeamRole } from '@/interfaces/team';
import { ISUNFA_ROUTE } from '@/constants/url';

interface IDefaultMenuOption {
  title: string;
  iconSrc: string;
  iconSrcAlt: string;
  iconWidth: number;
  iconHeight: number;
  disabled?: boolean; // Info: (20250417 - Liz) if true 會在畫面上隱藏
  hiddenForRole?: TeamRole; // Info: (20250603 - Liz) 團隊檢視者角色的權限限制
}

interface IMenuOptionWithLink extends IDefaultMenuOption {
  link: string;
  subMenu?: undefined;
}

interface IMenuOptionWithSubMenu extends IDefaultMenuOption {
  link?: undefined;
  subMenu: ISubMenuSection[];
}

export type TMenuOption = IMenuOptionWithLink | IMenuOptionWithSubMenu;

export interface ISubMenuSection {
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

export enum SubMenuOptionType {
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

export type TSubMenuOption = ISubMenuOptionWithLink | ISubMenuOptionWithButton;

export const MENU_CONFIG: TMenuOption[] = [
  {
    title: 'INVOICE_MANAGEMENT',
    iconSrc: '/icons/invoice_management_icon.svg',
    iconSrcAlt: 'invoice_management_icon',
    iconWidth: 24,
    iconHeight: 24,
    subMenu: [
      {
        caption: 'INVOICE',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'INPUT_INVOICE',
            link: ISUNFA_ROUTE.INPUT_INVOICE_LIST,
            needToConnectAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'OUTPUT_INVOICE',
            link: ISUNFA_ROUTE.OUTPUT_INVOICE_LIST,
            needToConnectAccountBook: true,
          },
        ],
      },
    ],
  },
  {
    title: 'ACCOUNTING',
    iconSrc: '/icons/accounting_icon_calculator.svg',
    iconSrcAlt: 'accounting_icon_calculator',
    iconWidth: 20.34,
    iconHeight: 23.85,
    subMenu: [
      {
        caption: 'ACCOUNTING',
        // hiddenForRole: TeamRole.VIEWER, // Deprecated: (20250603 - Liz) 團隊檢視者角色的權限限制目前已移除
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'ADDING_VOUCHER',
            link: ISUNFA_ROUTE.ADD_NEW_VOUCHER,
            needToConnectAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'VOUCHER_LIST',
            link: ISUNFA_ROUTE.VOUCHER_LIST,
            needToConnectAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'PAYABLE_RECEIVABLE_LIST',
            link: ISUNFA_ROUTE.PAYABLE_RECEIVABLE_LIST,
            needToConnectAccountBook: true,
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
    // hiddenForRole: TeamRole.VIEWER, // Deprecated: (20250603 - Liz) 團隊檢視者角色的權限限制目前已移除
    subMenu: [
      {
        caption: 'ASSET',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'ASSET_LIST',
            link: ISUNFA_ROUTE.ASSET_LIST,
            needToConnectAccountBook: true,
          },
        ],
      },
    ],
  },
  {
    title: 'REPORTS',
    iconSrc: '/icons/reports_icon.svg',
    iconSrcAlt: 'reports_icon',
    iconWidth: 20.58,
    iconHeight: 23.85,
    // hiddenForRole: TeamRole.VIEWER, // Deprecated: (20250603 - Liz) 團隊檢視者角色的權限限制目前已移除
    subMenu: [
      {
        caption: 'FINANCIAL_REPORT',
        subMenu: [
          {
            type: SubMenuOptionType.LINK,
            title: 'BALANCE_SHEET',
            link: ISUNFA_ROUTE.BALANCE_SHEET,
            needToConnectAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'INCOME_STATEMENT',
            link: ISUNFA_ROUTE.INCOME_STATEMENT,
            needToConnectAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'STATEMENT_OF_CASH_FLOWS',
            link: ISUNFA_ROUTE.CASH_FLOW,
            needToConnectAccountBook: true,
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
            needToConnectAccountBook: true,
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'TRIAL_BALANCE',
            link: ISUNFA_ROUTE.TRIAL_BALANCE,
            needToConnectAccountBook: true,
          },
        ],
      },
      {
        caption: 'EMBED_CODE',
        subMenu: [
          {
            type: SubMenuOptionType.BUTTON,
            title: 'GENERATE_EMBED_CODE',
            needToConnectAccountBook: true,
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
            needToConnectAccountBook: false,
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
            needToConnectAccountBook: true,
            // hiddenForRole: TeamRole.VIEWER, // Deprecated: (20250603 - Liz) 團隊檢視者角色的權限限制目前已移除
          },
          {
            type: SubMenuOptionType.LINK,
            title: 'CLIENTS_SUPPLIERS_MANAGEMENT',
            link: ISUNFA_ROUTE.COUNTERPARTY,
            needToConnectAccountBook: true,
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

// Info: (20250514 - Liz) For Mobile ver Side Menu
export enum MenuContent {
  MAIN_MENU = 'MainMenu',
  SUB_MENU = 'SubMenu',
  I18N = 'I18n',
  NOTIFICATION = 'Notification',
}
