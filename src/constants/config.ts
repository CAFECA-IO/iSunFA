import { REPORT_PATH } from './url';

export const TBD_API_URL = 'https://api.tidebit-defi.com/api';
export const TBD_API_VERSION = 'v1';

export const BFA_API_URL = '/api';
export const BFA_API_VERSION = 'v1';

export const MONTH_LIST = [
  'DATE_PICKER.JAN',
  'DATE_PICKER.FEB',
  'DATE_PICKER.MAR',
  'DATE_PICKER.APR',
  'DATE_PICKER.MAY',
  'DATE_PICKER.JUN',
  'DATE_PICKER.JUL',
  'DATE_PICKER.AUG',
  'DATE_PICKER.SEP',
  'DATE_PICKER.OCT',
  'DATE_PICKER.NOV',
  'DATE_PICKER.DEC',
];

export const WEEK_LIST = [
  'DATE_PICKER.SUN',
  'DATE_PICKER.MON',
  'DATE_PICKER.TUE',
  'DATE_PICKER.WED',
  'DATE_PICKER.THU',
  'DATE_PICKER.FRI',
  'DATE_PICKER.SAT',
];

export const sortOldAndNewOptions = ['SORTING.NEWEST', 'SORTING.OLDEST'];
export const default30DayPeriod = {
  startTimeStamp: Math.floor(Date.now() / 1000) - 86400 * 30,
  endTimeStamp: Math.floor(Date.now() / 1000),
};

export const ITEM_PER_PAGE = 10;

export const copyright = 'iSunFA @ 2023. All rights reserved.';

/* Info: (20230711 - Julian) ----- Landing Page ----- */
export const SCROLL_END = 530;

export const massiveDataContent = [
  {
    icon: '/icons/wallet.svg',
    text: 'LANDING_PAGE.MASSIVE_DATA_WALLET',
    alt: 'wallet_icon',
  },
  {
    icon: '/icons/blacklist.svg',
    text: 'LANDING_PAGE.MASSIVE_DATA_BLACKLIST',
    alt: 'blacklist_icon',
  },
  {
    icon: '/icons/block.svg',
    text: 'LANDING_PAGE.MASSIVE_DATA_BLOCK',
    alt: 'block_icon',
  },
  {
    icon: '/icons/transaction.svg',
    text: 'LANDING_PAGE.MASSIVE_DATA_TRANSACTION',
    alt: 'transaction_icon',
  },
  {
    icon: '/icons/evidence.svg',
    text: 'LANDING_PAGE.MASSIVE_DATA_EVIDENCE',
    alt: 'evidence_icon',
  },
];

export const toolsContent = [
  {
    title: 'LANDING_PAGE.TOOL_INTRO_1_TITLE',
    description: 'LANDING_PAGE.TOOL_INTRO_1_DESCRIPTION',
    desktopImg: '/elements/tracing_tool_2.png',
    mobileImg: '/elements/tracing_tool.png',
    alt: 'tracing_tool',
  },
  {
    title: 'LANDING_PAGE.TOOL_INTRO_2_TITLE',
    description: 'LANDING_PAGE.TOOL_INTRO_2_DESCRIPTION',
    desktopImg: '/elements/auditing_tool_1.png',
    mobileImg: '/elements/auditing_tool.png',
    alt: 'auditing_tool',
  },
  {
    title: 'LANDING_PAGE.TOOL_INTRO_3_TITLE',
    description: 'LANDING_PAGE.TOOL_INTRO_3_DESCRIPTION',
    desktopImg: '/elements/document.png',
    mobileImg: '/elements/document.png',
    alt: 'generate_reports',
  },
];

export const servicesContent = [
  {
    image: '/elements/tracing.png',
    alt: 'a screenshot of tracing tool',
    description: 'LANDING_PAGE.SERVICES_DESCRIPTION_1',
  },
  {
    image: '/elements/report.png',
    alt: 'balance sheet',
    description: 'LANDING_PAGE.SERVICES_DESCRIPTION_2',
  },
  {
    image: '/elements/law.png',
    alt: 'a weighing scale',
    description: 'LANDING_PAGE.SERVICES_DESCRIPTION_3',
  },
  {
    image: '/elements/safety_money.png',
    alt: 'a shield check image',
    description: 'LANDING_PAGE.SERVICES_DESCRIPTION_4',
  },
  {
    image: '/elements/smart_contract_1.png',
    alt: 'contracts image',
    description: 'LANDING_PAGE.SERVICES_DESCRIPTION_5',
  },
];

export const whyUsContent = [
  {
    image: '/icons/safety.png',
    alt: 'safety icon',
    description: 'LANDING_PAGE.WHY_iSunFA_DESCRIPTION_1',
  },
  {
    image: '/icons/financial_report.png',
    alt: 'financial report icon',
    description: 'LANDING_PAGE.WHY_iSunFA_DESCRIPTION_2',
  },
  {
    image: '/icons/compliance.png',
    alt: 'compliance icon',
    description: 'LANDING_PAGE.WHY_iSunFA_DESCRIPTION_3',
  },
  {
    image: '/icons/accountant.png',
    alt: 'accountant icon',
    description: 'LANDING_PAGE.WHY_iSunFA_DESCRIPTION_4',
  },
];

/* Info: (20230814 - Julian) ----- Landing Footer ----- */
export const iSunFAAddress = process.env.I_SUN_FA_ADDRESS_IN_ENGLISH;
export const iSunFAAddressOnMap = process.env.I_SUN_FA_ADDRESS_ON_GOOGLE_MAP;
export const iSunFAPhone = process.env.I_SUN_FA_PHONE_NUMBER;
export const githubLink = process.env.GITHUB_LINK;

/* Info: (20230814 - Julian) ----- Reports ----- */
export const CLOSING_TIME = 57600;

export const A4_SIZE = {
  WIDTH: 595,
  HEIGHT: 842,
};

export const pluginReportsList = [
  {
    name: 'PLUGIN.COMPREHENSIVE_INCOME_STATEMENT',
    imageSrc: '/icons/income_statement_icon.svg',
    linkPath: `${REPORT_PATH.INCOME_STATEMENTS}`,
  },
  {
    name: 'PLUGIN.BALANCE_SHEET',
    imageSrc: '/icons/balance_sheet_icon.svg',
    linkPath: `${REPORT_PATH.BALANCE_SHEETS}`,
  },
  {
    name: 'PLUGIN.CASH_FLOW_STATEMENT',
    imageSrc: '/icons/cash_flow_statement_icon.svg',
    linkPath: `${REPORT_PATH.CASH_FLOW_STATEMENTS}`,
  },
  {
    name: 'PLUGIN.RED_FLAG_ANALYSIS',
    imageSrc: '/icons/red_flags_icon.svg',
    linkPath: `${REPORT_PATH.RED_FLAGS}`,
  },
];

/* Info: (20230814 - Julian) ----- Chains ----- */
export const chainList = ['eth', 'bit', 'usdt', 'bnb', 'isun'];

export const chainIdToCurrencyName = [
  { id: 'eth', name: 'Ethereum' },
  { id: 'btc', name: 'Bitcoin' },
  { id: 'usdt', name: 'Tether' },
  { id: 'bnb', name: 'Binance Coin' },
  { id: 'isun', name: 'iSunCloud' },
];
