import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  handleGetRequest,
  handlePostRequest,
  MOCK_ASSET_LIST_PAYLOAD,
} from '@/pages/api/v2/company/[companyId]/asset/index';
import { mockCreateAssetInputV2, mockDetailedAssetV2 } from '@/interfaces/asset';
import { NextApiRequest } from 'next';

describe('List assets', () => {
  it('should return correct asset list data', async () => {
    const { statusMessage, payload } = await handleGetRequest();
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_LIST);
    expect(payload).toEqual(MOCK_ASSET_LIST_PAYLOAD);
  });
});

describe('Create asset', () => {
  it('should return correct new asset data', async () => {
    const mockRequest = {
      body: mockCreateAssetInputV2,
    } as NextApiRequest;
    const { statusMessage, payload } = await handlePostRequest(mockRequest);
    expect(statusMessage).toBe(STATUS_MESSAGE.CREATED);
    expect(payload).toEqual({
      ...mockDetailedAssetV2,
    });
  });
});
