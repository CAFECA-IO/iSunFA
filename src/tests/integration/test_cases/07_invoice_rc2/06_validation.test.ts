/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  clearInvoiceTestContext,
  getInvoiceTestContext,
  InvoiceTestContext,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import invoiceOutputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/output';

describe('Invoice RC2 - Validation', () => {
  let ctx: InvoiceTestContext;

  beforeAll(async () => {
    ctx = await getInvoiceTestContext();
  });

  it('duplicate invoice number -> 409', async () => {
    /* 建立兩張同號碼 */
  });

  it('wrong tax amount -> 400', async () => {
    /* 送錯 taxAmount */
  });

  it('missing fields -> 422', async () => {
    /* 少 issuedDate */
  });

  it('unauthorized -> 401', async () => {
    /* 不傳 Cookie 直呼 */
  });

  afterAll(async () => {
    await clearInvoiceTestContext();
  });
});
