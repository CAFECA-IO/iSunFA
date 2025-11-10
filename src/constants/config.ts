import { Options } from 'formidable';

export const copyright = 'iSunFA @ 2024. All rights reserved.';

/* Info: (20230711 - Shirley) ----- Landing Page ----- */
export const SCROLL_END = 530;

export const BOOKMARK_SCROLL_STEP = 200;

/* Info: (20230814 - Shirley) ----- Landing Footer ----- */
export const iSunFAAddress = process.env.I_SUN_FA_ADDRESS_IN_ENGLISH;
export const iSunFAAddressInChinese = process.env.I_SUN_FA_ADDRESS_IN_CHINESE;
export const iSunFAAddressOnMap = process.env.I_SUN_FA_ADDRESS_ON_GOOGLE_MAP;
export const iSunFAPhone = process.env.I_SUN_FA_PHONE_NUMBER;
export const githubLink = process.env.GITHUB_LINK;
export const facebookLink = process.env.FACEBOOK_LINK;
export const youtubeLink = process.env.YOUTUBE_LINK;

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

// Info: (20240718 - Jacky) 定義 Formidable 的 options
export const FORMIDABLE_OPTIONS: Partial<Options> = {
  encoding: 'utf-8',
  keepExtensions: true,
  maxFieldsSize: 200 * 1024 * 1024, // (200mb),
  maxFields: 1000,
  multiples: false,

  // Info: (20240718 - Jacky) 過濾器例子，保留圖片類型
  filter({ mimetype }) {
    return !!(mimetype && (mimetype.includes('image') || mimetype.includes('pdf')));
  },
};

export const DEFAULT_PAGE_START_AT = 1;
export const DEFAULT_PAGE_LIMIT = 10;
export const DEFAULT_MAX_PAGE_LIMIT = 2147483647;

export const DEFAULT_PAGE_OFFSET = 0;
export const DEFAULT_END_DATE = 2147483647;

export const DEFAULT_PAGE_LIMIT_FOR_ACCOUNT_BOOK_LIST = 5;

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

export const FREE_ACCOUNT_BOOK_ID = 1001;
export const NON_EXISTING_ACCOUNT_BOOK_ID = -1;
// export const DOMAIN = 'https://isunfa.com'; // Info: (20241126 - tzuhan) 我們會部署到多個網站 domain 不一定是這個也可能是 localhost 或是 https://isunfa.tw
export const NON_EXISTING_REPORT_ID = -1;
export const BUFFER_AMOUNT = 0.01; // Info: (20240806 - Shirley) 小於0.01來避免浮點數精度問題
export const IV_LENGTH = 12;
export const EXPIRATION_FOR_DATA_IN_INDEXED_DB_IN_SECONDS = 259200; // Info: (20240827 - Shirley) 3 days
