import { BaseTestContext, SharedContext } from '@/tests/integration/setup/base_test_context';
import { createTestClient } from '@/tests/integration/setup/test_client';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher'; // POST + LIST
import voucherIdHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]'; // GET / PUT / DELETE
import { APIPath, APIName } from '@/constants/api_connection';
import { EventType } from '@/constants/account';
import { validateOutputData } from '@/lib/utils/validator';

describe('Voucher V2 – CRUD', () => {
  let ctx: SharedContext;

  let voucherId: number;
  let createdBody: Record<string, unknown>;

  beforeAll(async () => {
    // 1. 取得共用上下文（含帳本、憑證科目、發票）
    ctx = await BaseTestContext.getSharedContext();

    // 2. 準備要 POST 的 payload
    createdBody = {
      actions: [],
      certificateIds: [],
      invoiceRC2Ids: [],
      voucherDate: Math.floor(Date.now() / 1000),
      type: EventType.INCOME,
      note: 'integration test',
      lineItems: [
        {
          description: '測試借方',
          debit: true,
          amount: 1000,
          accountId: ctx.accountIds.debitAccountId,
        },
        {
          description: '測試貸方',
          debit: false,
          amount: 1000,
          accountId: ctx.accountIds.creditAccountId,
        },
      ],
      assetIds: [],
      counterPartyId: null,
    };
  });

  it('POST voucher', async () => {
    const client = createTestClient({
      handler: voucherPostHandler,
      routeParams: { accountBookId: ctx.accountBookId.toString() },
    });

    const res = await client
      .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', ctx.accountBookId.toString()))
      .send(createdBody)
      .set('Cookie', ctx.cookies.join('; '))
      .expect(201);

    expect(res.body.success).toBe(true);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.VOUCHER_POST_V2,
      res.body.payload
    );
    expect(isOutputDataValid).toBe(true);

    // outputData 回傳的是新建的 voucherId
    voucherId = outputData as number;
  });

  it('GET voucher by id', async () => {
    const client = createTestClient({
      handler: voucherIdHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    const res = await client
      .get(
        APIPath.VOUCHER_GET_BY_ID_V2.replace(
          ':accountBookId',
          ctx.accountBookId.toString()
        ).replace(':voucherId', voucherId.toString())
      )
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.payload?.id).toBe(voucherId);
  });

  it('PUT update voucher note', async () => {
    const client = createTestClient({
      handler: voucherIdHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    const updated = { ...createdBody, note: 'updated note' };
    const res = await client
      .put(
        APIPath.VOUCHER_PUT_V2.replace(':accountBookId', ctx.accountBookId.toString()).replace(
          ':voucherId',
          voucherId.toString()
        )
      )
      .send(updated)
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);
    // PUT schema 回傳 id
    expect(res.body.payload).toBe(voucherId);
  });

  it('DELETE voucher', async () => {
    const client = createTestClient({
      handler: voucherIdHandler,
      routeParams: {
        accountBookId: ctx.accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    await client
      .delete(
        APIPath.VOUCHER_DELETE_V2.replace(':accountBookId', ctx.accountBookId.toString()).replace(
          ':voucherId',
          voucherId.toString()
        )
      )
      .set('Cookie', ctx.cookies.join('; '))
      .expect(200)
      .then((res) => {
        expect(res.body.success).toBe(true);
        // DELETE 不回傳 body.payload 或回 null
      });
  });
});
