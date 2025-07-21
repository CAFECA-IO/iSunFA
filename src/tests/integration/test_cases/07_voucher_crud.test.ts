import { APITestHelper } from '@/tests/integration/setup/api_helper';
import { createTestClient } from '@/tests/integration/setup/test_client';

import createAccountBookHandler from '@/pages/api/v2/user/[userId]/account_book';
import voucherPostHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher';
import voucherIdHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]';
import voucherRestoreHandler from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]/restore';

import { APIPath, APIName } from '@/constants/api_connection';
import { EventType } from '@/constants/account';
import { validateOutputData } from '@/lib/utils/validator';
import { WORK_TAG } from '@/interfaces/account_book';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';

describe('Voucher V2 – 完整 CRUD + Restore', () => {
  let helper: APITestHelper;
  let currentUserId: string;
  let teamId: number;
  let accountBookId: number;
  let cookies: string[];

  let voucherId: number;
  let payload: Record<string, unknown>;

  beforeAll(async () => {
    helper = await APITestHelper.createHelper({ autoAuth: true });
    const status = await helper.getStatusInfo();
    currentUserId = ((status.body.payload?.user as { id: number }).id as number).toString();
    cookies = helper.getCurrentSession();

    await helper.agreeToTerms();
    await helper.createUserRole();
    await helper.selectUserRole();

    // 建立 Team
    const teamResp = await helper.createTeam();
    teamId = (teamResp.body.payload as { id: number }).id;

    // 建立 Account Book
    const randomTaxId = `${Math.floor(Math.random() * 90000000) + 10000000}`;
    const testCompany = {
      name: `Voucher Test Co.`,
      taxId: randomTaxId,
      tag: WORK_TAG.ALL,
      teamId,
      businessLocation: LocaleKey.tw,
      accountingCurrency: CurrencyType.TWD,
      representativeName: 'VT Rep',
      taxSerialNumber: `VT${randomTaxId}`,
      contactPerson: 'VT Tester',
      phoneNumber: '+886-2-1234-5678',
      city: 'Taipei',
      district: 'Zhongzheng',
      enteredAddress: '100 Test Rd, Zhongzheng, Taipei',
    };

    const createBookClient = createTestClient({
      handler: createAccountBookHandler,
      routeParams: { userId: currentUserId },
    });
    const bookRes = await createBookClient
      .post(`/api/v2/user/${currentUserId}/account_book`)
      .send(testCompany)
      .set('Cookie', cookies.join('; '))
      .expect(200);
    accountBookId = bookRes.body.payload.id;

    // 準備 Voucher POST 的 body
    payload = {
      actions: [],
      certificateIds: [],
      invoiceRC2Ids: [],
      voucherDate: Math.floor(Date.now() / 1000),
      type: EventType.INCOME,
      note: 'integration test',
      lineItems: [
        { description: '測試借方', debit: true, amount: 1000, accountId: 2103 },
        { description: '測試貸方', debit: false, amount: 1000, accountId: 1603 },
      ],
      assetIds: [],
      counterPartyId: null,
    };
  });

  it('POST /voucher → 建立一張新的 Voucher', async () => {
    const client = createTestClient({
      handler: voucherPostHandler,
      routeParams: { accountBookId: accountBookId.toString() },
    });

    const res = await client
      .post(APIPath.VOUCHER_POST_V2.replace(':accountBookId', accountBookId.toString()))
      .send(payload)
      .set('Cookie', cookies.join('; '))
      .expect(201);

    expect(res.body.success).toBe(true);
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.VOUCHER_POST_V2,
      res.body.payload
    );
    expect(isOutputDataValid).toBe(true);
    voucherId = outputData as number;
  });

  it('GET /voucher/:id → 取得剛建立的 Voucher', async () => {
    const client = createTestClient({
      handler: voucherIdHandler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    const res = await client
      .get(
        APIPath.VOUCHER_GET_BY_ID_V2.replace(':accountBookId', accountBookId.toString()).replace(
          ':voucherId',
          voucherId.toString()
        )
      )
      .set('Cookie', cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.payload.id).toBe(voucherId);
  });

  it('PUT /voucher/:id → 更新 Voucher note', async () => {
    const client = createTestClient({
      handler: voucherIdHandler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    const updated = { ...payload, note: 'updated note' };
    const res = await client
      .put(
        APIPath.VOUCHER_PUT_V2.replace(':accountBookId', accountBookId.toString()).replace(
          ':voucherId',
          voucherId.toString()
        )
      )
      .send(updated)
      .set('Cookie', cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.payload).toBe(voucherId);
  });

  it('DELETE /voucher/:id → 刪除 Voucher', async () => {
    const client = createTestClient({
      handler: voucherIdHandler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    const res = await client
      .delete(
        APIPath.VOUCHER_DELETE_V2.replace(':accountBookId', accountBookId.toString()).replace(
          ':voucherId',
          voucherId.toString()
        )
      )
      .set('Cookie', cookies.join('; '))
      .expect(200);

    expect(res.body.success).toBe(true);
    // 刪除後 payload 可為 null 或 undefined
  });

  it('POST /voucher/:id/restore → 還原剛才刪除的 Voucher', async () => {
    const client = createTestClient({
      handler: voucherRestoreHandler,
      routeParams: {
        accountBookId: accountBookId.toString(),
        voucherId: voucherId.toString(),
      },
    });

    const res = await client
      .post(
        APIPath.VOUCHER_RESTORE_V2.replace(':accountBookId', accountBookId.toString()).replace(
          ':voucherId',
          voucherId.toString()
        )
      )
      .set('Cookie', cookies.join('; '));

    // eslint-disable-next-line no-console
    console.log('Restore response:', res.body);
    // .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.payload).toBe(voucherId);
  });
});
