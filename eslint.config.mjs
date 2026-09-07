/**
 * Info: (20250918 - Luphia) eslint.config.mjs
 * - 這份設定檔是我們團隊的程式碼規範，目標是為了統一風格、預防錯誤、提升程式碼品質與可讀性
 * - 使用 Prettier 統一程式碼風格
 * - 使用 ESLint 專注於程式碼品質、最佳實踐與潛在錯誤
 */

import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import nextPlugin from '@next/eslint-plugin-next';
import checkFile from 'eslint-plugin-check-file';
import prettierConfig from 'eslint-config-prettier';

// Info: (20251113 - Tzuhan)  --- 抽離出的共用規則 (同時適用於 Next.js 和 Hardhat) ---
const commonRules = {
  'import/prefer-default-export': 'off',
  'no-nested-ternary': 'off',
  'no-param-reassign': ['error', { props: false }],
  '@typescript-eslint/naming-convention': [
    'error',
    // Info: (20251113 - Tzuhan) 一般函式採用 camelCase，react 元件採用 PascalCase
    { selector: 'function', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
    // Info: (20251113 - Tzuhan) 一般變數採用 camelCase，react 元件採用 PascalCase，常數採用 UPPER_CASE
    { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
    // Info: (20251113 - Tzuhan) 類別、型別、介面採用 PascalCase
    { selector: 'typeLike', format: ['PascalCase'] },
    // Info: (20251113 - Tzuhan) 介面採用 IPascalCase，名稱強制以 I 開頭
    { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: true } },
  ],
  'check-file/filename-naming-convention': [
    'error',
    {
      '**/*.{js,ts,jsx,tsx}': 'SNAKE_CASE',
    },
    {
      ignoreMiddleExtensions: true,
    },
  ],
};

const tslintConfigs = [
  // Info: (20250918 - Luphia) 全域忽略設定
  {
    ignores: [
      'coverage',
      'node_modules',
      '.next',
      'dist',
      'build',
      'artifacts',
      'cache',
      'typechain-types',
      'eslint.config.mjs',
      'tailwind.config.ts',
      'postcss.config.mjs',
      'jest.*.ts',
      'src/generated',
      'src/types',
    ],
  },

  // Info: (20250918 - Luphia) 基礎設定
  ...tseslint.configs.recommended,
  // ...tailwindcss.configs['flat/recommended'],

  // Info: (20251113 - Tzuhan) --- CONFIG 1: Next.js / React App (src) ---
  {
    files: ['src/**/*.{js,mjs,cjs,ts,jsx,tsx}', 'next.config.ts'], // Info: (20251113 - Tzuhan) <-- 鎖定 Next.js 相關檔案
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': nextPlugin,
      // tailwindcss,
      'check-file': checkFile,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json'], // Info: (20251113 - Tzuhan) <-- 使用 Next.js 的 tsconfig
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    settings: {
      // Info: (20260712 - Luphia) 明確指定 React 版本，避免 eslint-plugin-react 在 ESLint 10 下自動偵測時呼叫已移除的 context.getFilename() 而崩潰
      react: { version: '19.2.7' },
      'import/resolver': { typescript: {} },
    },
    rules: {
      ...commonRules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': ['error', { functions: 'defaultArguments' }],

      // ToDo: (20260417 - Luphia) 需修正並取消此設置
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react/jsx-props-no-spreading': 'off',

      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['./*', '../*'], message: "請使用 '@/' 路徑別名取代相對路徑 '..'" }] },
      ],

      /**
       * Info: (20260811 - Luphia) 元件層不得直接使用 fido2_client 取簽章。
       *
       * 託管帳號（第三方登入）沒有 passkey，直呼 startLogin 會讓使用者卡在一個
       * 永遠不會成功的系統對話框前面。正確做法是 requestAssertion——它會依 custody
       * 自動選擇 passkey 或伺服器代簽，兩者回傳的都是真正的 WebAuthn assertion。
       *
       * 這條規則的存在是因為第一版只遷移了一個呼叫點，其餘十幾處全數漏掉，
       * 而漏掉的症狀只有託管使用者會遇到——不會有人在 code review 時發現。
       * 登入與部署精靈本來就沒有 custody 可言，在該檔案內以 eslint-disable-next-line 排除。
       */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='fido2ClientService'][property.name='startLogin']",
          message:
            '需要簽章時請改用 @/lib/auth/assertion_client 的 requestAssertion，否則託管帳號無法完成操作',
        },
      ],

      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/control-has-associated-label': [
        'warn',
        {
          ignoreElements: [
            'audio',
            'canvas',
            'embed',
            'input',
            'textarea',
            'tr',
            'video',
            'td',
            'th',
          ],
        },
      ],
    },
  },

  /**
   * Info: (20260811 - Luphia) 允許直接使用 fido2ClientService.startLogin 的例外清單。
   *
   * 三類檔案本來就不可能走 requestAssertion，把它們列在這裡（而不是散落 17 個
   * inline disable）才看得出「例外只有這些、而且每一類都有理由」：
   *
   * 1. 登入與 passkey 註冊：當下還沒有 session，也就沒有 custody 可判斷。
   * 2. 部署精靈：系統尚未初始化，SUPER_ADMIN 的 passkey 就是唯一信任根。
   * 3. 管理員操作與系統設定簽署：刻意只接受真實 passkey。託管帳號的「同意」
   *    只是一張 session cookie，讓它能授權最高權限操作等於沒有第二因素；
   *    custodial_signing.service 也對應地拒絕代簽 ADMIN_ACTION 用途的 challenge。
   */
  {
    files: [
      'src/lib/auth/assertion_client.ts',
      'src/lib/auth/passkey_login.ts',
      'src/components/auth/auth_modal.tsx',
      'src/services/registration.service.ts',
      'src/components/admin/setup/**/*.{ts,tsx}',
      'src/app/admin/**/*.{ts,tsx}',
      'src/components/admin/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // Info: (20251113 - Tzuhan) --- CONFIG 2: Hardhat / Node.js Scripts ---
  {
    files: ['scripts/**/*.ts', 'test/**/*.ts', 'ignition/**/*.ts', 'hardhat.config.ts'], // Info: (20251113 - Tzuhan) <-- 鎖定 Hardhat 相關檔案
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: false }, // Info: (20251113 - Tzuhan) Node 腳本不需要 JSX
        project: ['./tsconfig.hardhat.json'], // Info: (20251113 - Tzuhan) <-- 使用 Hardhat 專用 tsconfig
      },
      globals: {
        ...globals.node, // Info: (20251113 - Tzuhan) 主要是 Node 環境
        ...globals.es2020,
        ...globals.jest, // Info: (20251113 - Tzuhan) <-- 包含 Jest (給 test/ 資料夾)
      },
    },
    settings: {
      'import/resolver': { typescript: {} },
    },
    plugins: {
      'check-file': checkFile,
    },
    rules: {
      ...commonRules,
      'no-console': 'off', // Info: (20251113 - Tzuhan) 腳本/測試通常允許 console
      'no-restricted-imports': 'off', // Info: (20251113 - Tzuhan) 關閉 '@/' 路徑限制
      'import/no-extraneous-dependencies': 'off',
    },
  },

  // Info: (20250918 - Luphia) Prettier 必須放在最後
  prettierConfig,
];

export default tslintConfigs;
