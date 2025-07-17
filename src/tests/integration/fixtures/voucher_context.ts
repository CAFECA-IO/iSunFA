import { InvoiceContext } from '@/tests/integration/fixtures/invoice_fixture';
import { getInvoiceTestContext } from '@/tests/integration/fixtures/invoice_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import accountListHandler from '@/pages/api/v2/account_book/[accountBookId]/account';
import { APIPath } from '@/constants/api_connection';

/** Voucher 專屬的 Context，繼承自 InvoiceContext */
export interface VoucherContext extends InvoiceContext {
  debitAccountId: number;
  creditAccountId: number;
}

let ctxPromise: Promise<VoucherContext> | undefined;

export async function getVoucherTestContext(): Promise<VoucherContext> {
  if (ctxPromise) return ctxPromise;

  ctxPromise = (async () => {
    // 1. 先用新的 InvoiceFixture 拿到 InvoiceContext
    const base = await getInvoiceTestContext();

    // 2. 呼叫「帳戶列表」API
    const client = createTestClient({
      handler: accountListHandler,
      routeParams: { accountBookId: String(base.accountBookId) },
    });
    const res = await client
      .get(APIPath.ACCOUNT_LIST.replace(':accountBookId', String(base.accountBookId)))
      .set('Cookie', base.cookies.join('; '))
      .expect(200);

    // 3. 拿到借、貸帳號 ID
    const { data } = res.body.payload;
    const [debitAcc, creditAcc] = data;
    if (!debitAcc || !creditAcc) {
      throw new Error('Voucher context setup failed: missing account data');
    }

    // 4. 回傳並快取完整的 VoucherContext
    return {
      ...base,
      debitAccountId: debitAcc.id,
      creditAccountId: creditAcc.id,
    };
  })();

  return ctxPromise;
}
