import { STATUS_MESSAGE } from '@/constants/status_code';
import { MOCK_RESPONSE } from '@/interfaces/ledger';
import { handleGetRequest } from '@/pages/api/v2/company/[companyId]/ledger/index';

describe('handleGetRequest', () => {
  it('Should return the correct ledger data', async () => {
    const { statusMessage, payload } = await handleGetRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    expect(payload).toEqual(MOCK_RESPONSE);
  });
});
