import {
  clearInvoiceTestContext,
  createInvoice,
  getInvoiceTestContext,
  InvoiceTestContext,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceInputListHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
import { InvoiceDirection } from '@/constants/invoice_rc2';

describe('Invoice RC2 - Input Invoice List', () => {
  let ctx: InvoiceTestContext;

  beforeAll(async () => {
    ctx = await getInvoiceTestContext();
    await createInvoice(ctx, InvoiceDirection.INPUT);
  });

  it('should list input invoices', async () => {
    const client = createTestClient({
      handler: invoiceInputListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .get(
        `${APIPath.LIST_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())}`
      )
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

  afterAll(async () => {
    await clearInvoiceTestContext();
  });
});
