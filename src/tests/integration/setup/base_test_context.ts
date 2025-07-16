import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { TestDataFactory } from '@/tests/integration/setup/test_data_factory';

export interface SharedContext {
  helper: APITestHelper;
  cookies: string[];
  userId: number;
  teamId: number;
  accountBookId: number;
  teamIds: number[];
  accountBookIds: number[];
  fileIdForInput?: number;
  fileIdForOutput?: number;
  inputInvoiceId?: number;
  outputInvoiceId?: number;
  debitAccountId?: number;
  creditAccountId?: number;
  voucherId?: number;
}

/**
 * BaseTestContext：一次性建立並快取共用 context
 */
export class BaseTestContext {
  private static ctx: SharedContext;

  static async getSharedContext(): Promise<SharedContext> {
    if (!BaseTestContext.ctx) {
      const helper = await APITestHelper.createHelper({
        email: TestDataFactory.PRIMARY_TEST_EMAIL,
      });
      const teamRes = await helper.createTeam('IT Shared Team');
      const teamId = teamRes.body.payload!.id as number;
      const status = await helper.getStatusInfo();
      const userId = (status.body.payload!.user as { id: number }).id as number;
      const bookRes = await helper.createAccountBook('IT Shared Book', teamId, `${userId}`);
      BaseTestContext.ctx = {
        helper,
        cookies: helper.getCurrentSession(),
        userId,
        teamId,
        accountBookId: bookRes.body.payload!.id as number,
        teamIds: [teamId],
        accountBookIds: [bookRes.body.payload!.id as number],
        // fileIdForInput: undefined,
        // fileIdForOutput: undefined,
        // inputInvoiceId: undefined,
        // outputInvoiceId: undefined,
        // debitAccountId: undefined,
        // creditAccountId: undefined,
      };
    }
    return BaseTestContext.ctx;
  }
}
