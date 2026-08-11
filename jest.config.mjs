import nextJest from 'next/jest.js'
 
const createJestConfig = nextJest({
  // Info: (20260510 - Tzuhan) Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})
 
// Info: (20260510 - Tzuhan) Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  // Info: (20260510 - Tzuhan) Add more setup options before each test is run
  // Info: (20260510 - Tzuhan) setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  /**
   * Info: (20260811 - Julian) `*.tz.test.ts` 由 `npm run test:tz`（scripts/jest_tz.mjs）
   * 以固定時區另外跑，因此排除在預設執行之外，避免同一批測試被跑兩次。
   *
   * 那些測試驗的是「在 UTC 以西的時區才會現形」的行為（日期被當成 UTC 午夜解析
   * 而退一天、日光節約時間的 23 小時日）。時區必須在行程啟動前就定好，
   * 在測試檔裡改 `process.env.TZ` 已經太晚 —— 完整理由見 scripts/jest_tz.mjs。
   *
   * 覆寫這個欄位就會蓋掉 jest 預設值，所以 `/node_modules/` 必須一併列回來。
   */
  testPathIgnorePatterns: ['/node_modules/', '\\.tz\\.test\\.ts$'],
  moduleNameMapper: {
    // Info: (20260510 - Tzuhan) Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
 
// Info: (20260510 - Tzuhan) createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
