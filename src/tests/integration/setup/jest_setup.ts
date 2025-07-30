/** Info: (20250703 - Shirley)
 * Integration Test Jest Setup Configuration
 *
 * Provides Jest configuration and global setup for integration tests using supertest.
 * Manages test environment variables, server lifecycle, and test timeout settings.
 *
 * Purpose:
 * - Configure Jest environment for integration testing
 * - Set up test environment variables
 * - Manage test server lifecycle and cleanup
 * - Configure test timeouts for API calls
 *
 * Usage:
 * // This file is automatically loaded by Jest through setupFilesAfterEnv
 * // No direct import required in test files
 *
 * // Environment variables set:
 * // - INTEGRATION_TEST: 'true'
 * // - TEST_TYPE: 'integration'
 * // - DEBUG_API: 'true' (if DEBUG_TESTS is enabled)
 */
import { closeAllTestServers } from '@/tests/integration/setup/test_client';

beforeAll(async () => {
  process.env.INTEGRATION_TEST = 'true';
  process.env.TEST_TYPE = 'integration';

  if (process.env.DEBUG_TESTS === 'true') {
    process.env.DEBUG_API = 'true';
  }
});

afterAll(async () => {
  await closeAllTestServers();
  delete process.env.DEBUG_API;
});

beforeEach(() => {
  // Info: (20250701 - Shirley) Clear any test-specific environment variables if needed
});

// Info: (20250703 - Shirley) Don't close servers after each test since they're reused across tests in beforeAll
// afterEach(async () => {
//   await closeAllTestServers();
// });

// Info: (20250701 - Shirley) Extend Jest timeout for integration tests
jest.setTimeout(30000);

jest.mock('pusher', () => {
  return jest.fn().mockImplementation(() => ({
    trigger: jest.fn(),
  }));
});

jest.mock('@/lib/utils/crypto', () => {
  // Info: (20250710 - Tzuhan) 拿到真的 export，保留其餘函式
  const real = jest.requireActual('@/lib/utils/crypto');
  // Info: (20250710 - Tzuhan) 只要同一組 keyPair 就夠測試用
  const keyPairPromise = crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return {
    ...real,
    // Info: (20250710 - Tzuhan) 不再讀檔案，直接回傳 in-memory 公鑰
    getPublicKeyByCompany: jest.fn(async () => (await keyPairPromise).publicKey),
    // Info: (20250710 - Tzuhan) 同理，回傳 in-memory 私鑰
    getPrivateKeyByCompany: jest.fn(async () => (await keyPairPromise).privateKey),
    // Info: (20250710 - Tzuhan) 如果測試裡面有用到 storeKeyByCompany，也一併 stub 掉
    storeKeyByCompany: jest.fn(),
  };
});
