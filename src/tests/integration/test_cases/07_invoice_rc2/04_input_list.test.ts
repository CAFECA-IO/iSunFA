import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceInputListHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
import { InvoiceDirection } from '@/constants/invoice_rc2';

describe('Invoice RC2 - Input Invoice List', () => {
  let ctx: SharedContext;
  let apiHelper: APITestHelper;

  beforeAll(async () => {
    ctx = await BaseTestContext.getSharedContext();
    apiHelper = ctx.helper;
    await apiHelper.createInvoice(
      InvoiceDirection.INPUT,
      ctx.accountBookId,
      ctx.invoiceFileIds.input
    );
  });

  it('should list input invoices', async () => {
    const client = createTestClient({
      handler: invoiceInputListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .get(APIPath.LIST_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString()))
      .query({ page: 1, pageSize: 10 })
      .set('Cookie', ctx.cookies.join('; '))
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
