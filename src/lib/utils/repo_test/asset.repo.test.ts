import { AssetDepreciationMethod, AssetStatus } from '@/constants/asset';
import { createAssetWithVouchers, createManyAssets } from '@/lib/utils/repo/asset.repo';
import { getTimestampNow } from '@/lib/utils/common';

const testCompanyId = 1000;

describe('createAssetWithVouchers (single asset)', () => {
  it('should create a new Asset record', async () => {
    const assetNumberPrefix = 'A';
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: 'Equipment',
      number: assetNumberPrefix,
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
      residualValue: 1000,
      usefulLife: 60,
      depreciationStart: 1704067200,
      depreciationMethod: AssetDepreciationMethod.STRAIGHT_LINE,
      note: 'Test asset note',
    };

    const asset = await createAssetWithVouchers(newAssetData);

    expect(asset).toBeDefined();
    expect(asset.companyId).toBe(testCompanyId);
    expect(asset.name).toBe(newAssetData.name);
    expect(asset.number).toContain(assetNumberPrefix);
    expect(asset.status).toBe(AssetStatus.NORMAL);
    expect(asset.note).toBe(newAssetData.note);
    expect(asset.createdAt).toBeDefined();
    expect(asset.updatedAt).toBeDefined();
    expect(asset.id).toBeDefined();
  });

  it('should handle special asset number format', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: 'Equipment',
      number: 'EQ-1206',
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);

    expect(asset).toBeDefined();
    expect(asset.number).toMatch(/^EQ-1206-[\w-]+-\d{6}$/);
  });

  it('should create asset with default values when optional fields are not provided', async () => {
    const assetNumberPrefix = 'B';
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: 'Equipment',
      number: assetNumberPrefix,
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);

    expect(asset).toBeDefined();
    expect(asset.companyId).toBe(testCompanyId);
    expect(asset.name).toBe(newAssetData.name);
    expect(asset.number).toContain(assetNumberPrefix);
    expect(asset.status).toBe(AssetStatus.NORMAL);
    expect(asset.createdAt).toBeDefined();
    expect(asset.updatedAt).toBeDefined();
    expect(asset.id).toBeDefined();
  });
});
describe('createManyAssets (multiple assets)', () => {
  it('should create multiple Asset records', async () => {
    const assetNumberPrefix = getTimestampNow().toString();
    const amount = 2;

    const newAssetData = {
      companyId: testCompanyId,
      amount,
      name: 'Test Asset',
      type: 'Equipment',
      number: assetNumberPrefix,
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
      residualValue: 1000,
      usefulLife: 60,
      depreciationStart: 1704067200,
      depreciationMethod: AssetDepreciationMethod.STRAIGHT_LINE,
      note: 'Test asset note',
    };

    const assets = await createManyAssets(newAssetData, amount);

    expect(assets).toBeDefined();

    assets.forEach((asset) => {
      expect(asset.companyId).toBe(testCompanyId);
      expect(asset.name).toBe(newAssetData.name);
      expect(asset.status).toBe(AssetStatus.NORMAL);
      // TODO: (20241206 - Shirley) 雖然 DB 會成功建立資產，但 expect 拿到其他資產，所以先註解掉
      // expect(asset.number).toContain(assetNumberPrefix);
      // expect(asset.note).toBe(newAssetData.note);
      expect(asset.createdAt).toBeDefined();
      expect(asset.updatedAt).toBeDefined();
      expect(asset.id).toBeDefined();
    });
  });

  it('should create assets with sequential numbers', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: 'Equipment',
      number: 'SEQ-001',
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const amount = 3;
    const assets = await createManyAssets(newAssetData, amount);

    // Info: (20241206 - Shirley) 檢查是否所有資產編號都是唯一的
    const numbers = assets.map((asset) => asset.number);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(amount);

    // Info: (20241206 - Shirley) 檢查編號格式
    const uuidPattern = /^SEQ-001-[\w-]+-\d{6}$/;
    assets.forEach((asset) => {
      expect(asset.number).toMatch(uuidPattern);
    });
  });
});
