import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  handleGetRequest,
  handlePostRequest,
  MOCK_ASSET_LIST_PAYLOAD,
} from '@/pages/api/v2/company/[companyId]/asset/index';
import { mockCreateAssetInput, mockAssetDetails } from '@/interfaces/asset';
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
      body: mockCreateAssetInput,
    } as NextApiRequest;
    const { statusMessage, payload } = await handlePostRequest(mockRequest);
    expect(statusMessage).toBe(STATUS_MESSAGE.CREATED);
    // TODO: amount 指的是資產購買數量，不會在單一資產數據中顯示，需要在實作 API 時產生 amount 數量的資產數據 (20241001 - Shirley)
    const { amount, ...restOfMockCreateAssetInput } = mockCreateAssetInput;
    const expectedPayload = {
      ...mockAssetDetails,
      ...restOfMockCreateAssetInput,
    };
    expect(payload).toEqual({
      ...expectedPayload,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
  });
});
