import { InvoiceContext } from '@/tests/integration/fixtures/invoice_fixture';
import {
  getInvoiceTestContext,
  // createInvoice
} from '@/tests/integration/fixtures/invoice_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceListHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
// import { InvoiceDirection } from '@/constants/invoice_rc2';

describe('Invoice RC2 - Invoice List (list both input/output invoices)', () => {
  let ctx: InvoiceContext;

  beforeAll(async () => {
    // 1. 初始化 Fixture，這同時完成 SharedContext 與檔案上傳

    ctx = await getInvoiceTestContext();

    // 2. 先建立一筆 Input 與一筆 Output 發票
    // await createInvoice(ctx, InvoiceDirection.INPUT);
    // await createInvoice(ctx, InvoiceDirection.OUTPUT);
  });

  it('should list both input and output invoices', async () => {
    const client = createTestClient({
      handler: invoiceListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .get(APIPath.LIST_INVOICE_RC2.replace(':accountBookId', ctx.accountBookId.toString()))
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
