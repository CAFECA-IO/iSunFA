import { BaseTestContext } from '@/tests/integration/setup/base_test_context';

export default async function globalSetup() {
  // Info: (20250715 - Tzuhan) 建立並快取共用測試上下文（使用者、team、accountBook）
  await BaseTestContext.getSharedContext();
}
