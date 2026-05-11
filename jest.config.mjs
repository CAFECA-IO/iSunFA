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
  },
}
 
// Info: (20260510 - Tzuhan) createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
