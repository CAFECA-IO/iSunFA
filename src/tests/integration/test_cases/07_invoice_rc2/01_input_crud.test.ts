import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';
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
  let ctx: SharedContext;
  let invoiceId: number;

  beforeAll(async () => {
    ctx = await BaseTestContext.getSharedContext();
  });

  it('should create invoice RC2 input', async () => {
    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .post(
        APIPath.CREATE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({
        fileId: ctx.invoiceFileIds.input,
        direction: InvoiceDirection.INPUT,
        isGenerated: false,
        currencyCode: CurrencyCode.TWD,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.payload?.id).toBeDefined();

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.CREATE_INVOICE_RC2_INPUT,
      res.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    invoiceId = outputData!.id;
  });

  it('should update invoice RC2 input', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot update invoice input');
    }

    const client = createTestClient({
      handler: invoiceInputModifyHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        invoiceId: invoiceId.toString(),
      },
    });

    const res = await client
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

    expect(res.body.success).toBe(true);
    expect(res.body.payload?.id).toBe(invoiceId);

    const { isOutputDataValid: isUpdateValid, outputData: updatedData } = validateOutputData(
      APIName.UPDATE_INVOICE_RC2_INPUT,
      res.body.payload
    );
    expect(isUpdateValid).toBe(true);
    expect(updatedData?.no).toBe('AB25000038');
  });

  it('should delete invoice RC2 input', async () => {
    if (invoiceId === undefined) {
      throw new Error('invoiceId is not defined, cannot delete invoice input');
    }

    const client = createTestClient({
      handler: invoiceInputCreateHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .delete(
        APIPath.DELETE_INVOICE_RC2_INPUT.replace(':accountBookId', ctx.accountBookId.toString())
      )
      .send({ invoiceIds: [invoiceId] })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.DELETE_INVOICE_RC2_INPUT,
      res.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    expect(outputData?.deletedIds).toContain(invoiceId);
  });
});
