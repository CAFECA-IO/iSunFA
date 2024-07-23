import { Options } from 'formidable';

export const copyright = 'iSunFA @ 2024. All rights reserved.';

/* Info: (20230711 - Shirley) ----- Landing Page ----- */
export const SCROLL_END = 530;

export const BOOKMARK_SCROLL_STEP = 200;

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

/* Info: (20230814 - Shirley) ----- Landing Footer ----- */
export const iSunFAAddress = process.env.I_SUN_FA_ADDRESS_IN_ENGLISH;
export const iSunFAAddressOnMap = process.env.I_SUN_FA_ADDRESS_ON_GOOGLE_MAP;
export const iSunFAPhone = process.env.I_SUN_FA_PHONE_NUMBER;
export const githubLink = process.env.GITHUB_LINK;

export const AUTH_PERIOD = 60 * 60; // 1 hr

export const COOKIE_NAME = {
  FIDO2: 'FIDO2',
  CREDENTIALS: 'CREDENTIALS',
  USER_INFO: 'USER_INFO',
};

export const DUMMY_CHALLENGE = 'RklETzIuVEVTVC5yZWctMTcxMjE3Njg1MC1oZWxsbw';
export const DUMMY_TIMESTAMP = 1712176850;

export const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://www.isunfa.com',
  'https://isunfa.com',
];

export const FIDO2_USER_HANDLE = 'iSunFA-User';

// 定義 Formidable 的 options
export const FORMIDABLE_OPTIONS: Partial<Options> = {
  encoding: 'utf-8',
  keepExtensions: true,
  maxFieldsSize: 200 * 1024 * 1024, // (200mb),
  maxFields: 1000,
  multiples: false,

  // 過濾器例子，保留圖片類型
  filter({ mimetype }) {
    return !!(mimetype && mimetype.includes('image'));
  },
};

export const AICH_URI = process.env.AICH_URI as string;

export const DEFAULT_PAGE_START_AT = 1;
export const DEFAULT_PAGE_LIMIT = 10;
export const DEFAULT_PAGE_OFFSET = 0;

export const USER_ICON_BACKGROUND_COLORS = [
  // Info: (20230814 - Murky) color from surface/support/strong/Light_Mode and Dark_Mode
  {
    lightMode: '#FD853A',
    darkMode: '#EC4A0A',
  },
  {
    lightMode: '#9B8AFB',
    darkMode: '#6938EF',
  },
  {
    lightMode: '#FD6F8E',
    darkMode: '#E31B54',
  },
  {
    lightMode: '#F670C7',
    darkMode: '#DD2590',
  },
  {
    lightMode: '#8098F9',
    darkMode: '#444CE7',
  },
  {
    lightMode: '#53B1FD',
    darkMode: '#1570EF',
  },
  {
    lightMode: '#6CDEA0',
    darkMode: '#29B368',
  },
];

export const FREE_COMPANY_ID = 1001;

export const NON_EXISTING_COMPANY_ID = -1;

export const DOMAIN = 'https://isunfa.com';
