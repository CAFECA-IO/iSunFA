import {
  getVoucherTestContext,
  VoucherTestContext,
} from '@/tests/integration/test_cases/06_voucher/00_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import voucherListHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';
import voucherListByAccHandler from '@/pages/api/v2/account_book/[accountBookId]/account/[accountId]/voucher';

import { APIPath } from '@/constants/api_connection';
import { EventType } from '@/constants/account';
import { voucherGetAllFrontendValidatorV2 as FrontendSchema } from '@/lib/utils/zod_schema/voucher';
import { VoucherListTabV2 } from '@/constants/voucher';

describe('Voucher V2 – List', () => {
  let ctx: VoucherTestContext;
  let voucherId: number;

  beforeAll(async () => {
    ctx = await getVoucherTestContext();

    const client = createTestClient({
      handler: voucherListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', ctx.accountBookId.toString()))
      .send({
        actions: [],
        certificateIds: [],
        invoiceRC2Ids: [],
        voucherDate: Math.floor(Date.now() / 1000),
        type: EventType.PAYMENT,
        note: 'list test',
        lineItems: [
          { description: 'debit', debit: true, amount: 500, accountId: ctx.debitAccountId },
          { description: 'credit', debit: false, amount: 500, accountId: ctx.creditAccountId },
        ],
        assetIds: [],
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(201);

    voucherId = res.body.payload.id;
  });

  it('GET /voucher list', async () => {
    const client = createTestClient({
      handler: voucherListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .get(APIPath.VOUCHER_LIST_V2.replace(':accountBookId', ctx.accountBookId.toString()))
      .query({
        page: 1,
        pageSize: 10,
        tab: VoucherListTabV2.UPLOADED,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    const parsed = FrontendSchema.safeParse(res.body.payload);
    expect(parsed.success).toBe(true);
    expect(parsed?.data?.data?.some((v: { id: number }) => v.id === voucherId)).toBe(true);
  });

  it('GET /voucher list by account', async () => {
    const client = createTestClient({
      handler: voucherListByAccHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        accountId: ctx.debitAccountId.toString(),
      },
    });

    const res = await client
      .get(
        APIPath.VOUCHER_LIST_GET_BY_ACCOUNT_V2.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':accountId', ctx.debitAccountId.toString())
      )
      .query({ page: 1, pageSize: 10 })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.payload.data.length).toBeGreaterThan(0);
  });
});
