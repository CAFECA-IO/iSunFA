import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  handleGetRequest,
  handlePutRequest,
  handleDeleteRequest,
} from '@/pages/api/v2/company/[companyId]/asset/[assetId]/index';
import { mockAssetDetails } from '@/interfaces/asset';
import { NextApiRequest } from 'next';

describe('Get asset detail', () => {
  it('should return correct asset detail data', async () => {
    const { statusMessage, payload } = await handleGetRequest();
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
    expect(payload).toEqual(mockAssetDetails);
  });
});

describe('Update asset', () => {
  it('should return correct updated asset data', async () => {
    const mockRequest = {
      body: {
        note: 'Updated: Main office computer',
        assetStatus: 'missing',
      },
    } as NextApiRequest;
    const { statusMessage, payload } = await handlePutRequest(mockRequest);
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_UPDATE);
    expect(payload).toEqual({
      ...mockAssetDetails,
      note: 'Updated: Main office computer',
      assetStatus: 'missing',
      updatedAt: expect.any(Number),
    });
  });
});

describe('Delete asset', () => {
  it('should return correct deleted asset data', async () => {
    const { statusMessage, payload } = await handleDeleteRequest();
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_DELETE);
    expect(payload).toEqual({
      ...mockAssetDetails,
      deletedAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
  });
});
