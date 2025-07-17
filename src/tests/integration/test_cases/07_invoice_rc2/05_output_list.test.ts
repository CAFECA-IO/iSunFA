import { InvoiceContext } from '@/tests/integration/fixtures/invoice_fixture';
import {
  getInvoiceTestContext,
  // createInvoice
} from '@/tests/integration/fixtures/invoice_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceOutputListHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateOutputData } from '@/lib/utils/validator';
// import { InvoiceDirection } from '@/constants/invoice_rc2';

describe('Invoice RC2 - Output Invoice List', () => {
  let ctx: InvoiceContext;

  beforeAll(async () => {
    // 1. 初始化 Fixture，完成共用 Context 建立與測試檔案上傳
    ctx = await getInvoiceTestContext();

    // 2. 產生一筆 OUTPUT 發票，供 list 測試使用
    // await createInvoice(ctx, InvoiceDirection.OUTPUT);
  });

  it('should list output invoices', async () => {
    const client = createTestClient({
      handler: invoiceOutputListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .get(APIPath.LIST_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString()))
      .query({ page: 1, pageSize: 10 })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.LIST_INVOICE_RC2_OUTPUT,
      res.body.payload
    );

    expect(isOutputDataValid).toBe(true);
    expect(outputData).toBeDefined();
  });
});
