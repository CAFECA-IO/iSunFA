import {
  getInvoiceTestContext,
  InvoiceTestContext,
} from '@/tests/integration/test_cases/07_invoice_rc2/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import { APIName, APIPath } from '@/constants/api_connection';
import invoiceOutputCreateHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/output';
import invoiceOutputModifyHandler from '@/pages/api/rc2/account_book/[accountBookId]/invoice/[invoiceId]/output';
import { validateOutputData } from '@/lib/utils/validator';
import {
  CurrencyCode,
  DeductionType,
  InvoiceDirection,
  InvoiceType,
  TaxType,
} from '@/constants/invoice_rc2';

describe('Invoice RC2 - Output Invoice CRUD', () => {
  let ctx: InvoiceTestContext;
  let invoiceId: number;

  beforeAll(async () => {
    ctx = await getInvoiceTestContext();
  });
  it('should create invoice RC2 output', async () => {
    const invoiceOutputCreateClient = createTestClient({
      handler: invoiceOutputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const invoiceOutputCreateResponse = await invoiceOutputCreateClient
      .post(
        `${APIPath.CREATE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())}`
      )
      .send({
        fileId: ctx.fileIdForOutput,
        direction: InvoiceDirection.OUTPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(invoiceOutputCreateResponse.body.success).toBe(true);
    expect(invoiceOutputCreateResponse.body.payload?.id).toBeDefined();

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.CREATE_INVOICE_RC2_OUTPUT,
      invoiceOutputCreateResponse.body.payload
    );
    if (isOutputDataValid && outputData) {
      invoiceId = outputData.id;
    }

    expect(isOutputDataValid).toBe(true);
  });

  it('should update invoice RC2 output', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot update invoice output');
    }

    const invoiceOutputModifyClient = createTestClient({
      handler: invoiceOutputModifyHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });

    const response = await invoiceOutputModifyClient
      .put(
        APIPath.UPDATE_INVOICE_RC2_OUTPUT.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':invoiceId', invoiceId.toString())
      )
      .send({
        no: 'AB25000038',
        type: InvoiceType.OUTPUT_31,
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
      APIName.UPDATE_INVOICE_RC2_OUTPUT,
      response.body.payload
    );
    expect(isUpdateValid).toBe(true);
    expect(updatedData?.no).toBe('AB25000038');
  });

  it('should delete invoice RC2 output', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot delete invoice output');
    }

    const invoiceOutputDeleteClient = createTestClient({
      handler: invoiceOutputCreateHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
      },
    });

    const invoiceOutputResponse = await invoiceOutputDeleteClient
      .delete(
        APIPath.DELETE_INVOICE_RC2_OUTPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        invoiceIds: [invoiceId],
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(invoiceOutputResponse.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.DELETE_INVOICE_RC2_OUTPUT,
      invoiceOutputResponse.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData?.deletedIds.length).toBe(1);
  });
});
