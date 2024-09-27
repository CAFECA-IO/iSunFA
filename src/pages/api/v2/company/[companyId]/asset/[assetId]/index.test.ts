import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  handleGetRequest,
  handlePutRequest,
  handleDeleteRequest,
} from '@/pages/api/v2/company/[companyId]/asset/[assetId]/index';
import { mockDetailedAssetV2 } from '@/interfaces/asset';
import { NextApiRequest } from 'next';
import { getTimestampNow } from '@/lib/utils/common';

describe('Get asset detail', () => {
  it('should return correct asset detail data', async () => {
    const { statusMessage, payload } = await handleGetRequest();
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
    expect(payload).toEqual(mockDetailedAssetV2);
  });
});

describe('Update asset', () => {
  it('should return correct updated asset data', async () => {
    const mockRequest = {
      body: {
        note: 'Updated: Main office computer',
      },
    } as NextApiRequest;
    const { statusMessage, payload } = await handlePutRequest(mockRequest);
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_UPDATE);
    expect(payload).toEqual({ ...mockDetailedAssetV2, note: 'Updated: Main office computer' });
  });
});

describe('Delete asset', () => {
  it('should return correct deleted asset data', async () => {
    const { statusMessage, payload } = await handleDeleteRequest();
    const now = getTimestampNow();
    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_DELETE);
    expect(payload).toEqual({ ...mockDetailedAssetV2, deletedAt: now });
  });
});
