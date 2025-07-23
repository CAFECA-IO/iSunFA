import { BaseTestContext } from '@/tests/integration/setup/base_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceInputListHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
import { InvoiceDirection } from '@/constants/invoice_rc2';

describe('Invoice RC2 - Input Invoice List', () => {
  let accountBookId: number;
  let cookies: string[];

  beforeAll(async () => {
    const ctx = await BaseTestContext.getSharedContext();
    cookies = ctx.cookies;
    const teamId = ctx.teamId || (await ctx.helper.createTeam(ctx.userId)).id;
    const accountBook = await BaseTestContext.createAccountBook(ctx.userId, teamId);
    accountBookId = accountBook!.id;
    const fileIdForInput = await BaseTestContext.uploadEncryptedFile(
      'invoice_input',
      accountBookId,
      InvoiceDirection.INPUT
    );
    await BaseTestContext.createInvoice(accountBookId, fileIdForInput, InvoiceDirection.INPUT);
  });

  it('should list input invoices', async () => {
    const client = createTestClient({
      handler: invoiceInputListHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const res = await client
      .get(`${APIPath.LIST_INVOICE_RC2_INPUT.replace(':accountBookId', accountBookId.toString())}`)
      .query({ page: 1, pageSize: 10 })
      .set('Cookie', cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.LIST_INVOICE_RC2_INPUT,
      res.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData).toBeDefined();
  });
});
