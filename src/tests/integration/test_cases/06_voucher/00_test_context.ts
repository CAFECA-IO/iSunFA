import {
  getInvoiceTestContext,
  InvoiceTestContext as BaseCtx,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import accountListHandler from '@/pages/api/v2/account_book/[accountBookId]/account';
import { APIPath } from '@/constants/api_connection';

export interface VoucherTestContext extends BaseCtx {
  debitAccountId: number;
  creditAccountId: number;
}

let ctxPromise: Promise<VoucherTestContext> | undefined;

export async function getVoucherTestContext(): Promise<VoucherTestContext> {
  if (ctxPromise) return ctxPromise;

  ctxPromise = (async () => {
    const base = await getInvoiceTestContext();

    const accountListClient = createTestClient({
      handler: accountListHandler,
      routeParams: { accountBookId: base.accountBookId.toString() },
    });

    const res = await accountListClient
      .get(APIPath.ACCOUNT_LIST.replace(':accountBookId', base.accountBookId.toString()))
      .set('Cookie', base.cookies.join('; '))
      .expect(200);

    const [debitAcc, creditAcc] = res.body.payload.data;
    return {
      ...base,
      debitAccountId: debitAcc.id,
      creditAccountId: creditAcc.id,
    };
  })();

  return ctxPromise;
}

export { clearInvoiceTestContext as clearVoucherTestContext } from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
