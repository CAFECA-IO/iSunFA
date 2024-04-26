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
  // **注意**: 調整前請先備份參數
  options: {
    mirostat: 2, // default: 0 啟用Mirostat採樣以控制複雜度。0表示禁用，1表示使用Mirostat，2表示使用Mirostat 2.0。
    mirostat_eta: 0.2, // default: 0.1 影響演算法對生成文本反饋的響應速度。較低的學習率將導致調整速度較慢，而較高的學習率將使演算法響應更靈敏。
    mirostat_tau: 10.0, // default: 5.0 控制輸出的一致性與多樣性之間的平衡。較低的值將導致文本更集中和一致。
    num_ctx: 4096, // default: 2048 設置用於生成下一個token的上下文窗口大小。
    repeat_last_n: 64, // default: 64 設置模型向後查看多遠以防止重複。0表示禁用，-1表示與num_ctx相同。
    repeat_penalty: 1.1, // default: 1.1 設置對重複的懲罰強度。更高的值將更強烈地懲罰重複，較低的值則較為寬容。
    temperature: 0.9, // default: 0.8 模型的溫度。提高溫度將使模型回答更有創造性。
    seed: 845, // default: None 設置用於生成的隨機數種子。設置特定數字將使模型對相同提示生成相同的文本。
    // stop: '}\n```', // default: no default 設置停止序列。當遇到這個模式時，LLM將停止生成文本並返回。可以通過指定多個單獨的停止參數來設置多個停止模式。
    tfs_z: 1, // default: 1 尾部自由採樣用於減少輸出中不太可能的tokens的影響。更高的值將更多地減少影響，值為1.0則禁用此設置。
    num_predict: 256, // default: 128 預測生成文本時的最大token數量。-1表示無限生成，-2表示填充上下文。
    top_k: 80, // default: 40  降低生成無意義內容的概率。更高的值將提供更多樣的回答，而較低的值將更為保守。
    top_p: 0.95, // default: 0.9 與top-k一起工作。更高的值將導致文本更多樣化，而較低的值將生成更集中和保守的文本。
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
