import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';
import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import invoiceOutputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/output';
import { APIPath } from '@/constants/api_connection';
import { CurrencyCode, InvoiceDirection } from '@/constants/invoice_rc2';
import { STATUS_CODE } from '@/constants/status_code';

describe('Invoice RC2 - Validation', () => {
  let ctx: SharedContext;
  let apiHelper: APITestHelper;
  let invoiceId: number;

  beforeAll(async () => {
    ctx = await BaseTestContext.getSharedContext();
    apiHelper = ctx.helper;

    invoiceId = (
      await apiHelper.createInvoice(
        InvoiceDirection.INPUT,
        ctx.accountBookId,
        ctx.invoiceFileIds.input
      )
    ).id;
  });

  test.skip('should reject duplicate output invoice → 409', async () => {
    const client = createTestClient({
      handler: invoiceOutputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });
    const body = {
      fileId: ctx.invoiceFileIds.output,
      direction: InvoiceDirection.OUTPUT,
      currencyCode: CurrencyCode.TWD,
      isGenerated: false,
      no: 'AA99999999',
      issuedDate: 1735660800,
    };

    // 第一張
    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send(body)
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    // 第二張（重覆）→ 預期 409
    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send(body)
      .set('Cookie', ctx.cookies.join('; '))
      .expect(409)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.CONFLICT);
      });
  });

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
        fileId: ctx.invoiceFileIds.input,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
        netAmount: 1000,
        taxRate: 5,
        taxAmount: 999,
        totalAmount: 1999,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(422)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.INVALID_VOUCHER_AMOUNT);
      });
  });

  it('should reject when required field missing → 422', async () => {
    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
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

  it('should block unauthorized create invoice → 401', async () => {
    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    await client
      .post(
        APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        fileId: ctx.invoiceFileIds.input,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      // 不帶 Cookie
      .expect(401)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.UNAUTHORIZED_ACCESS);
      });
  });

  it('should reject invalid enum value → 422', async () => {
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

  it('should reject wrong type (taxAmount as string) → 422', async () => {
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
        taxAmount: 'ABC',
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(422)
      .then((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe(STATUS_CODE.INVALID_INPUT_PARAMETER);
      });
  });
});
