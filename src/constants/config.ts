import { randomInt } from 'crypto';

export const copyright = 'iSunFA @ 2024. All rights reserved.';

/* Info: (20230711 - Shirley) ----- Landing Page ----- */
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

export const FORMIDABLE_CONFIG = {
  uploadDir: '/tmp',
};

// Info Murky: Ref: https://github.com/ollama/ollama/blob/main/docs/api.md#parameters
export const LLAMA_CONFIG = {
  model: 'llama3',
  retryLimit: 10,
  // Info Murky :Ref https://github.com/ollama/ollama/blob/main/docs/modelfile.md#valid-parameters-and-values
  options: {
    mirostat: 1,
    mirostat_eta: 0.2,
    mirostat_tau: 7,
    num_ctx: 128,
    repeat_last_n: 64,
    repeat_penalty: 2,
    temperature: 0.9,
    seed: randomInt(1024),
    stop: '}\n```',
    tfs_z: 1,
    num_predict: 256,
    top_k: 100,
    top_p: 0.9,
  },
};

export const OCR_SERVICE_CONFIG = {
  cacheSize: 10,
  idLength: 20,
};

export const VOUCHER_SERVICE_CONFIG = {
  cacheSize: 10,
  idLength: 20,
};
