import { createTestClient } from '@/tests/integration/setup/test_client';
import voucherListHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher'; // POST + LIST
import voucherListByAccHandler from '@/pages/api/v2/account_book/[accountBookId]/account/[accountId]/voucher';
import { APIPath } from '@/constants/api_connection';
import { EventType } from '@/constants/account';
import { voucherGetAllFrontendValidatorV2 as FrontendSchema } from '@/lib/utils/zod_schema/voucher';
import { VoucherListTabV2 } from '@/constants/voucher';
import {
  VoucherContext,
  getVoucherTestContext,
} from '@/tests/integration/fixtures/voucher_context';

describe('Voucher V2 – List', () => {
  let ctx: VoucherContext;
  let voucherId: number;

  beforeAll(async () => {
    // 1. 取得共用上下文（只會執行一次：含帳本、憑證科目、發票上下文）
    ctx = await getVoucherTestContext();

    // 2. 在帳本中新增一筆憑證，並取回 voucherId
    const postClient = createTestClient({
      handler: voucherListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });
    const postRes = await postClient
      .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', ctx.accountBookId.toString()))
      .send({
        actions: [],
        certificateIds: [],
        invoiceRC2Ids: [],
        voucherDate: Math.floor(Date.now() / 1000),
        type: EventType.PAYMENT,
        note: 'list test',
        lineItems: [
          {
            description: 'debit',
            debit: true,
            amount: 500,
            accountId: ctx.debitAccountId,
          },
          {
            description: 'credit',
            debit: false,
            amount: 500,
            accountId: ctx.creditAccountId,
          },
        ],
        assetIds: [],
        counterPartyId: null,
      })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(201);

    voucherId = postRes.body.payload.id;
  });

  it('GET /voucher list (all)', async () => {
    const listClient = createTestClient({
      handler: voucherListHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await listClient
      .get(APIPath.VOUCHER_LIST_V2.replace(':accountBookId', ctx.accountBookId.toString()))
      .query({ page: 1, pageSize: 10, tab: VoucherListTabV2.UPLOADED })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    // 用前端的 Zod schema 驗證整體結構
    const parsed = FrontendSchema.safeParse(res.body.payload);
    expect(parsed.success).toBe(true);

    // 確認剛剛新增的 voucherId 在列表中
    const list = parsed.data?.data as Array<{ id: number }>;
    expect(list.some((v) => v.id === voucherId)).toBe(true);
  });

  it('GET /account/:accountId/voucher list', async () => {
    const byAccClient = createTestClient({
      handler: voucherListByAccHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        accountId: ctx.debitAccountId.toString(),
      },
    });

    const res = await byAccClient
      .get(
        APIPath.VOUCHER_LIST_GET_BY_ACCOUNT_V2.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':accountId', ctx.debitAccountId.toString())
      )
      .query({ page: 1, pageSize: 10 })
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    // 這裡不使用 Zod schema，只簡單檢查 data array 長度
    expect(Array.isArray(res.body.payload.data)).toBe(true);
    expect(res.body.payload.data.length).toBeGreaterThan(0);
  });
});
