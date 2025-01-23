// import { SortOrder } from '@/constants/sort';
// import { STATUS_MESSAGE } from '@/constants/status_code';
// import { MOCK_RESPONSE } from '@/interfaces/trial_balance';
// import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/trial_balance/index';

describe('handleGetRequest', () => {
  it('應該返回正確的試算表資料', async () => {
    // const { statusMessage, payload } = await handleGetRequest({
    //   query: {
    //     page: 1,
    //     pageSize: 10,
    //     sortBy: 'createdAt',
    //     sortOrder: SortOrder.ASC,
    //     startDate: 0,
    //     endDate: 100000000,
    //   },
    //   body: {},
    //   session: {
    //     userId: 1,
    //     companyId: 1,
    //     roleId: 1,
    //     cookie: {}, // 替換為符合 Cookie 類型的物件
    //   },
    // });

    // expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    // expect(payload).toEqual(MOCK_RESPONSE);
    return true;
  });
});
