import {
  createInvoice,
  getInvoiceTestContext,
  InvoiceTestContext,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceListHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
import { InvoiceDirection } from '@/constants/invoice_rc2';

describe('Invoice RC2 - Invoice List (list both input/output invoice', () => {
  let ctx: InvoiceTestContext;

  beforeAll(async () => {
    ctx = await getInvoiceTestContext();
    // eslint-disable-next-line no-console
    console.log('ctx.accountBookId', ctx.accountBookId);
    await createInvoice(ctx, InvoiceDirection.INPUT);
    await createInvoice(ctx, InvoiceDirection.OUTPUT);
  });

  it('should list input invoices', async () => {
    const client = createTestClient({
      handler: invoiceListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .get(`${APIPath.LIST_INVOICE_RC2.replace(':accountBookId', ctx.accountBookId.toString())}`)
      .query({ page: 1, pageSize: 10 })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.LIST_INVOICE_RC2,
      res.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData).toBeDefined();
  });
});
