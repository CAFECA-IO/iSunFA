import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  handleGetRequest,
  handlePostRequest,
  MOCK_ASSET_LIST_PAYLOAD,
} from '@/pages/api/v2/company/[companyId]/asset/index';
import { mockDetailedAssetV2 } from '@/interfaces/asset';

describe('handleGetRequest', () => {
  it('should return correct asset list data', async () => {
    const { statusMessage, payload } = await handleGetRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    expect(payload).toEqual(MOCK_ASSET_LIST_PAYLOAD);
  });
});

describe('handlePostRequest', () => {
  it('should return correct new asset data', async () => {
    const { statusMessage, payload } = await handlePostRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.CREATED);
    expect(payload).toEqual(mockDetailedAssetV2);
  });
});
