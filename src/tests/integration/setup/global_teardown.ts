import { BaseTestContext } from '@/tests/integration/setup/base_test_context';

export default async function globalTeardown() {
  await BaseTestContext.cleanup();
}
