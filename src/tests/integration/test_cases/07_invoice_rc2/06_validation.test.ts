import {
  clearInvoiceTestContext,
  getInvoiceTestContext,
  createInvoice,
  InvoiceTestContext,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';

import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import invoiceOutputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/output';

import { APIPath } from '@/constants/api_connection';
import { CurrencyCode, InvoiceDirection } from '@/constants/invoice_rc2';
import { STATUS_CODE } from '@/constants/status_code';

describe('Invoice RC2 - Validation', () => {
  let ctx: InvoiceTestContext;
  let invoiceId: number;

  beforeAll(async () => {
    ctx = await getInvoiceTestContext();
    const invoice = await createInvoice(ctx, InvoiceDirection.OUTPUT);
    invoiceId = invoice.id;
  });

  /* ------------------------------------------------------------------ */
  /* Info: (20250711 - Tzuhan) ① 重覆發票：後端尚未實作 -> 先 skip                                  */
  /* ------------------------------------------------------------------ */
  test.skip('should reject duplicate output invoice → 409', async () => {
    // Info: (20250711 - Tzuhan) 建第一張
    const client = createTestClient({
      handler: invoiceOutputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const body = {
      fileId: ctx.fileIdForOutput,
      direction: InvoiceDirection.OUTPUT,
      currencyCode: CurrencyCode.TWD,
      isGenerated: false,
      no: 'AA99999999', // Info: (20250711 - Tzuhan) 假設未來以「號碼」判斷重覆
      issuedDate: 1735660800, // Info: (20250711 - Tzuhan) 2025-11-01
    };

    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send(body)
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    // Info: (20250711 - Tzuhan) 建第二張（同號碼）── 期待未來 409
    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send(body)
      .set('Cookie', ctx.cookies.join('; '))
      .expect(409) // Info: (20250711 - Tzuhan) ← 後端實作好之後改回來
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.CONFLICT);
      });
  });

  /* ------------------------------------------------------------------ */
  /* Info: (20250711 - Tzuhan) ② 稅額錯誤：後端尚未實作 -> 先 skip                                 */
  /* ------------------------------------------------------------------ */
  test.skip('should reject wrong tax amount → 422', async () => {
    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        fileId: ctx.fileIdForInput,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
        netAmount: 1000,
        taxRate: 5,
        taxAmount: 999, // Info: (20250711 - Tzuhan) 錯誤
        totalAmount: 1999,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(422) // Info: (20250711 - Tzuhan) ← 後端實作好之後改回來
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.INVALID_VOUCHER_AMOUNT);
      });
  });

  /* ------------------------------------------------------------------ */
  /* Info: (20250711 - Tzuhan) ③ 缺欄位：後端僅標 incomplete，不會 422 -> 先 skip                  */
  /* ------------------------------------------------------------------ */
  test.skip('should reject when required field missing → 422', async () => {
    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        // Info: (20250711 - Tzuhan) 缺 fileId: ctx.fileIdForInput,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(422)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.INVALID_INPUT_PARAMETER);
      });
  });

  /* ------------------------------------------------------------------ */
  /* Info: (20250711 - Tzuhan) ④ 未授權：確定已實作，直接驗 401                                    */
  /* ------------------------------------------------------------------ */
  test.skip('should block unauthorized create invoice → 401', async () => {
    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        fileId: ctx.fileIdForInput,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      // Info: (20250711 - Tzuhan) ★ 不帶 Cookie
      .expect(401)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.UNAUTHORIZED_ACCESS);
      });
  });

  /* ------------------------------------------------------------ *
   * Info: (20250711 - Tzuhan) ⑤  Enum 值錯誤（currencyCode 非 ENUM 裡面的值）→ 422ISF0004
   * ------------------------------------------------------------ */
  test.skip('should reject invalid enum value → 422', async () => {
    const client = createTestClient({
      handler: invoiceOutputModifyHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });

    await client
      .put(
        APIPath.UPDATE_INVOICE_RC2_OUTPUT.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':invoiceId', invoiceId.toString())
      )
      .send({
        currencyCode: 'ETH',
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(422)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.INVALID_INPUT_PARAMETER);
      });
  });

  /* ------------------------------------------------------------ *
   * Info: (20250711 - Tzuhan) ⑥ 型別錯誤（taxAmount 應 number）→ 422ISF0005
   * ------------------------------------------------------------ */
  test.skip('should reject wrong type (taxAmount as string) → 422', async () => {
    const client = createTestClient({
      handler: invoiceOutputModifyHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });

    await client
      .put(
        APIPath.UPDATE_INVOICE_RC2_OUTPUT.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':invoiceId', invoiceId.toString())
      )
      .send({
        taxAmount: 'ABC', // Info: (20250711 - Tzuhan) ❌ 應為 number
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(422)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.INVALID_INPUT_PARAMETER);
      });
  });

  afterAll(async () => {
    await clearInvoiceTestContext();
  });
});
