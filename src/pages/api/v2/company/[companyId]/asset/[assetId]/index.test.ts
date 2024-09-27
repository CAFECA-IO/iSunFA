import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  handleGetRequest,
  handlePutRequest,
  handleDeleteRequest,
} from '@/pages/api/v2/company/[companyId]/asset/[assetId]/index';
import { mockDetailedAssetV2 } from '@/interfaces/asset';

describe('handleGetRequest', () => {
  it('should return correct asset detail data', async () => {
    const { statusMessage, payload } = await handleGetRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_GET);
    expect(payload).toEqual(mockDetailedAssetV2);
  });
});

describe('handlePutRequest', () => {
  it('should return correct updated asset data', async () => {
    const { statusMessage, payload } = await handlePutRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_UPDATE);
    expect(payload).toEqual({ ...mockDetailedAssetV2, note: 'Updated: Main office computer' });
  });
});

describe('handleDeleteRequest', () => {
  it('should return correct deleted asset data', async () => {
    const { statusMessage, payload } = await handleDeleteRequest();

    expect(statusMessage).toBe(STATUS_MESSAGE.SUCCESS_DELETE);
    expect(payload).toEqual({ ...mockDetailedAssetV2, deletedAt: 2233448564 });
  });
});
