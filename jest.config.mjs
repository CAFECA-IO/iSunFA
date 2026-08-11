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
 
/**
 * Info: (20260811 - Luphia) 讓 jest 轉譯 jose。
 *
 * jose 只發佈 ESM，而 next/jest 預設不轉譯 node_modules，於是任何 import 到它的模組
 * （DeWT、OAuth state token、challenge token）在測試裡一律 SyntaxError。
 * 「整組 OAuth 流程零測試」有一半卡在這裡，不是沒人想寫。
 *
 * 只改測試設定、不動 next.config 的 transpilePackages：那會連帶改變正式建置的打包行為，
 * 為了跑測試而冒這個風險並不划算。
 *
 * 上面的 marked 用 moduleNameMapper 指到 UMD 檔，這裡沒有那個選項——jose 只發佈 ESM，
 * 沒有任何 CJS / UMD 入口可指。實測整套測試時間沒有變化（約 10.8 秒），
 * 因為只有 jose 一包被納入轉譯。
 *
 * next/jest 會自行組出 transformIgnorePatterns 並覆蓋使用者提供的值，因此只能在拿到
 * 最終設定後，把 jose 加進它既有的例外群組。萬一 next 改了這個字串格式，這裡會靜默失效，
 * 但症狀是「auth 相關測試又開始 SyntaxError」——會立刻紅，不會變成錯誤的通過。
 */
export default async () => {
  const resolved = await createJestConfig(config)()

  resolved.transformIgnorePatterns = (
    resolved.transformIgnorePatterns ?? []
  ).map((pattern) =>
    pattern.startsWith('/node_modules/(?!')
      ? pattern.replace('(?!(', '(?!(jose|')
      : pattern,
  )

  return resolved
}
