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
  moduleNameMapper: {
    // Info: (20260510 - Tzuhan) Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
    /*
     * Info: (20260810 - Emily) marked 只發佈 ESM（package.json 的 exports 沒有 CJS 入口），
     * 而 jest 預設不轉譯 node_modules —— 直接 import 會炸在
     * `SyntaxError: Unexpected token 'export'`。
     * 指到它自己附的 UMD 打包檔即可，正式環境仍走 ESM（Next 處理得了）。
     * 用 moduleNameMapper 而非 transformIgnorePatterns：後者要把整包重新轉譯，
     * 每次跑測試都多花數秒，而我們要的只是換一個入口檔。
     */
    '^marked$': '<rootDir>/node_modules/marked/lib/marked.umd.js',
  },
}
 
// Info: (20260510 - Tzuhan) createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
