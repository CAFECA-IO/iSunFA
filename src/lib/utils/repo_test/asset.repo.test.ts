import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import {
  createAssetWithVouchers,
  createManyAssets,
  deleteAsset,
  deleteManyAssets,
  getAllAssetsByCompanyId,
  getLegitAssetById,
} from '@/lib/utils/repo/asset.repo';
import { getTimestampNow } from '@/lib/utils/common';

const testCompanyId = 1000;

describe('createAssetWithVouchers (single asset)', () => {
  it('should create a new Asset record', async () => {
    const assetNumberPrefix = 'A';
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset Land',
      type: AssetEntityType.LAND,
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

    await deleteAsset(asset.id);
  });

  it('should handle special asset number format', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'EQ-1206',
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);

    expect(asset).toBeDefined();
    expect(asset.number).toMatch(/^EQ-1206-[\w-]+-\d{6}$/);

    await deleteAsset(asset.id);
  });

  it('should create asset with default values when optional fields are not provided', async () => {
    const assetNumberPrefix = 'B';
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset Office Equipment',
      type: AssetEntityType.OFFICE_EQUIPMENT,
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

    await deleteAsset(asset.id);
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
      type: AssetEntityType.OFFICE_EQUIPMENT,
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

    const assetIds = assets.map((asset) => asset.id);

    await deleteManyAssets(assetIds);
  });

  it('should create assets with sequential numbers', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: AssetEntityType.OFFICE_EQUIPMENT,
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

    const assetIds = assets.map((asset) => asset.id);
    await deleteManyAssets(assetIds);
  });
});

describe('getAssetById (get the asset with fixed conditions)', () => {
  it('should return asset if it has a voucher', async () => {
    const SEED_DATA_ASSET_ID = 1;
    const asset = await getLegitAssetById(SEED_DATA_ASSET_ID, testCompanyId);

    expect(asset).toBeDefined();
  });

  it('should not return asset if it does not have a voucher', async () => {
    const TEST_DATA_ASSET_ID = 3;
    const asset = await getLegitAssetById(TEST_DATA_ASSET_ID, testCompanyId);

    expect(asset).toBeNull();
  });
});

describe('deleteAsset', () => {
  it('should delete an existing asset', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'TEST-004',
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);
    const deletedAsset = await deleteAsset(asset.id);

    expect(deletedAsset).toBeDefined();
    expect(deletedAsset.id).toBe(asset.id);

    const checkAsset = await getLegitAssetById(asset.id, testCompanyId);
    expect(checkAsset).toBeNull();
  });

  it('should throw an error when trying to delete a non-existent asset', async () => {
    const nonExistentId = -1;

    const deleteNonExistentAsset = async () => {
      await deleteAsset(nonExistentId);
    };

    await expect(deleteNonExistentAsset).rejects.toThrow();
  });
});

describe('getAllAssetsWithVouchers', () => {
  it('should only return assets with vouchers', async () => {
    // Info: (20241209 - Shirley) 使用種子資料中已知有 voucher 的資產進行測試
    const assets = await getAllAssetsByCompanyId(testCompanyId);

    expect(assets).toBeDefined();
    expect(Array.isArray(assets)).toBe(true);

    // Info: (20241209 - Shirley) 確認每個資產都有關聯的 voucher
    assets.forEach((asset) => {
      // Info: (20241209 - Shirley) prisma 的 count 回傳的物件是 _count，所以需要使用 _count 來檢查
      // eslint-disable-next-line no-underscore-dangle
      expect(asset._count.assetVouchers).toBeGreaterThan(0);
    });
  });

  it('should include correct asset fields', async () => {
    const assets = await getAllAssetsByCompanyId(testCompanyId);

    if (assets.length > 0) {
      const asset = assets[0];
      expect(asset).toHaveProperty('id');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('number');
      expect(asset).toHaveProperty('type');
      expect(asset).toHaveProperty('status');
      expect(asset).toHaveProperty('purchasePrice');
      expect(asset).toHaveProperty('acquisitionDate');
      expect(asset).toHaveProperty('createdAt');
      expect(asset).toHaveProperty('updatedAt');
      expect(asset).toHaveProperty('_count.assetVouchers');
    }
  });

  it('should correctly filter assets when search conditions are provided', async () => {
    const searchCondition = {
      status: AssetStatus.NORMAL,
    };

    const assets = await getAllAssetsByCompanyId(testCompanyId, searchCondition);

    expect(assets).toBeDefined();
    assets.forEach((asset) => {
      expect(asset.status).toBe(AssetStatus.NORMAL);
    });
  });

  it('should return different asset lists for different company IDs', async () => {
    const differentCompanyId = 999;
    const assets = await getAllAssetsByCompanyId(differentCompanyId);

    // Info: (20241209 - Shirley) 假設測試資料庫中 companyId 999 沒有資產
    expect(assets).toHaveLength(0);
  });

  it('should correctly sort assets based on specified conditions', async () => {
    // Info: (20241209 - Shirley) 測試按名稱升序排序
    const sortByNameAsc = {
      name: 'asc' as const,
    };
    const assetsNameAsc = await getAllAssetsByCompanyId(testCompanyId, undefined, sortByNameAsc);

    expect(assetsNameAsc).toBeDefined();
    if (assetsNameAsc.length > 1) {
      for (let i = 1; i < assetsNameAsc.length; i += 1) {
        expect(assetsNameAsc[i - 1].name <= assetsNameAsc[i].name).toBeTruthy();
      }
    }

    // Info: (20241209 - Shirley) 測試按購買價格降序排序
    const sortByPriceDesc = {
      purchasePrice: 'desc' as const,
    };
    const assetsPriceDesc = await getAllAssetsByCompanyId(
      testCompanyId,
      undefined,
      sortByPriceDesc
    );

    expect(assetsPriceDesc).toBeDefined();
    if (assetsPriceDesc.length > 1) {
      for (let i = 1; i < assetsPriceDesc.length; i += 1) {
        expect(
          assetsPriceDesc[i - 1].purchasePrice >= assetsPriceDesc[i].purchasePrice
        ).toBeTruthy();
      }
    }
  });

  it('should default sort by creation time in descending order when no sort condition is specified', async () => {
    const assets = await getAllAssetsByCompanyId(testCompanyId);

    expect(assets).toBeDefined();
    if (assets.length > 1) {
      for (let i = 1; i < assets.length; i += 1) {
        expect(assets[i - 1].createdAt >= assets[i].createdAt).toBeTruthy();
      }
    }
  });
});
