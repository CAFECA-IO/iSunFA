import {
  clearInvoiceTestContext,
  getInvoiceTestContext,
  InvoiceTestContext,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { APIName, APIPath } from '@/constants/api_connection';
import invoiceInputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/input';
import invoiceInputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/input';
import { validateOutputData } from '@/lib/utils/validator';
import {
  CurrencyCode,
  DeductionType,
  InvoiceDirection,
  InvoiceType,
  TaxType,
} from '@/constants/invoice_rc2';

describe('Invoice RC2 - Input Invoice CRUD', () => {
  let ctx: InvoiceTestContext;
  let invoiceId: number;

  beforeAll(async () => {
    ctx = await getInvoiceTestContext();
  });
  test.skip('should create invoice RC2 input', async () => {
    const invoiceInputCreateClient = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const invoiceInputCreateResponse = await invoiceInputCreateClient
      .post(
        `${APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())}`
      )
      .send({
        fileId: ctx.fileIdForInput,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(invoiceInputCreateResponse.body.success).toBe(true);
    expect(invoiceInputCreateResponse.body.payload?.id).toBeDefined();

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.CREATE_INVOICE_RC2_INPUT,
      invoiceInputCreateResponse.body.payload
    );
    if (isOutputDataValid && outputData) {
      invoiceId = outputData.id;
    }

    expect(isOutputDataValid).toBe(true);
  });

  test.skip('should update invoice RC2 input', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot update invoice input');
    }

    const invoiceInputModifyClient = createTestClient({
      handler: invoiceInputModifyHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });

    const response = await invoiceInputModifyClient
      .put(
        APIPath.UPDATE_INVOICE_RC2_INPUT.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':invoiceId', invoiceId.toString())
      )
      .send({
        no: 'AB25000038',
        type: InvoiceType.INPUT_21,
        taxType: TaxType.TAXABLE,
        issuedDate: 1728835200,
        taxRate: 5,
        netAmount: 5200,
        taxAmount: 260,
        totalAmount: 5460,
        salesName: '統一智能空調工程有限公司',
        salesIdNumber: '00209406',
        deductionType: DeductionType.DEDUCTIBLE_FIXED_ASSETS,
        isSharedAmount: false,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.payload?.id).toBeDefined();

    const { isOutputDataValid: isUpdateValid, outputData: updatedData } = validateOutputData(
      APIName.UPDATE_INVOICE_RC2_INPUT,
      response.body.payload
    );
    expect(isUpdateValid).toBe(true);
    expect(updatedData?.no).toBe('AB25000038');
  });

  test.skip('should delete invoice RC2 input', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot delete invoice input');
    }

    const invoiceInputDeleteClient = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
      },
    });

    const invoiceInputResponse = await invoiceInputDeleteClient
      .delete(
        APIPath.DELETE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        invoiceIds: [invoiceId],
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(invoiceInputResponse.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.DELETE_INVOICE_RC2_INPUT,
      invoiceInputResponse.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData?.deletedIds.length).toBe(1);
  });

  afterAll(async () => {
    await clearInvoiceTestContext();
  });
});
