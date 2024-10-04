import { STATUS_MESSAGE } from '@/constants/status_code';
import { MOCK_RESPONSE } from '@/interfaces/trial_balance';
import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/trial_balance/index';

describe('handleGetRequest', () => {
  it('Should return the correct trial balance data', async () => {
    const { statusMessage, payload } = await handleGetRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    expect(payload).toEqual(MOCK_RESPONSE);
  });
});
