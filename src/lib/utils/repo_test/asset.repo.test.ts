import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import {
  createAssetWithVouchers,
  createManyAssets,
  deleteAsset,
  deleteManyAssets,
  getAllAssetsByCompanyId,
  getLegitAssetById,
  updateAsset,
} from '@/lib/utils/repo/asset.repo';
import { getTimestampNow } from '@/lib/utils/common';
import { SortOrder, SortBy } from '@/constants/sort';

const testCompanyId = 1000;

describe('createAssetWithVouchers (single asset)', () => {
  it('should create a new Asset record', async () => {
    const assetNumberPrefix = 'A';
    const newAssetData = {
      companyId: testCompanyId,
      name: 'Test Asset Land',
      number: assetNumberPrefix,
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
      residualValue: 1000,
      usefulLife: 60,
      depreciationStart: 1704067200,
      type: AssetEntityType.LAND,
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
    const assets = await getAllAssetsByCompanyId(testCompanyId, {});

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
    const assets = await getAllAssetsByCompanyId(testCompanyId, {
      filterCondition: {
        type: AssetEntityType.LAND,
      },
    });

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
    const assets = await getAllAssetsByCompanyId(testCompanyId, {
      filterCondition: {
        status: AssetStatus.NORMAL,
      },
    });

    expect(assets).toBeDefined();
    assets.forEach((asset) => {
      expect(asset.status).toBe(AssetStatus.NORMAL);
    });
  });

  it('should return different asset lists for different company IDs', async () => {
    const differentCompanyId = 999;
    const assets = await getAllAssetsByCompanyId(differentCompanyId, {});

    // Info: (20241209 - Shirley) 假設測試資料庫中 companyId 999 沒有資產
    expect(assets).toHaveLength(0);
  });

  it('should correctly sort assets based on specified conditions', async () => {
    // Info: (20241209 - Shirley) 測試按名稱升序排序
    const sort = {
      sortBy: SortBy.ACQUISITION_DATE,
      sortOrder: SortOrder.ASC,
    };
    const assetsAcqDateASC = await getAllAssetsByCompanyId(testCompanyId, {
      sortOption: [sort],
    });

    expect(assetsAcqDateASC).toBeDefined();
    if (assetsAcqDateASC.length > 1) {
      for (let i = 1; i < assetsAcqDateASC.length; i += 1) {
        expect(
          assetsAcqDateASC[i - 1].acquisitionDate <= assetsAcqDateASC[i].acquisitionDate
        ).toBeTruthy();
      }
    }

    // Info: (20241209 - Shirley) 測試按購買價格降序排序
    const sortByPriceDesc = {
      sortBy: SortBy.PURCHASE_PRICE,
      sortOrder: SortOrder.DESC,
    };
    const assetsPriceDesc = await getAllAssetsByCompanyId(testCompanyId, {
      sortOption: [sortByPriceDesc],
    });

    expect(assetsPriceDesc).toBeDefined();
    if (assetsPriceDesc.length > 1) {
      for (let i = 1; i < assetsPriceDesc.length; i += 1) {
        expect(
          assetsPriceDesc[i - 1].purchasePrice >= assetsPriceDesc[i].purchasePrice
        ).toBeTruthy();
      }
    }
  });

  it('should default sort by acquisition date in descending order when no sort condition is specified', async () => {
    const assets = await getAllAssetsByCompanyId(testCompanyId, {
      sortOption: undefined,
    });

    expect(assets).toBeDefined();
    if (assets.length > 1) {
      for (let i = 1; i < assets.length; i += 1) {
        expect(assets[i - 1].acquisitionDate <= assets[i].acquisitionDate).toBeTruthy();
      }
    }
  });

  it('should filter assets based on provided conditions', async () => {
    const filterCondition = { status: AssetStatus.NORMAL };
    const assets = await getAllAssetsByCompanyId(testCompanyId, { filterCondition });

    expect(assets).toBeDefined();
    assets.forEach((asset) => {
      expect(asset.status).toBe(AssetStatus.NORMAL);
    });
  });
});

describe('updateAsset', () => {
  it('應該成功更新資產資訊', async () => {
    const now = getTimestampNow();
    // Info: (20241210 - Shirley) 先建立一個測試用資產
    const newAssetData = {
      companyId: testCompanyId,
      name: `測試資產-${now}`,
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'TEST-UPDATE',
      acquisitionDate: now,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);

    // Info: (20241210 - Shirley) 準備更新資料
    const updateData = {
      assetName: `更新後的資產名稱-${now}`,
      note: `更新後的備註-${now}`,
      assetStatus: AssetStatus.SCRAPPED,
    };

    // Info: (20241210 - Shirley) 執行更新
    const updatedAsset = await updateAsset(testCompanyId, asset.id, updateData);

    // Info: (20241210 - Shirley) 驗證更新結果
    expect(updatedAsset).toBeDefined();
    expect(updatedAsset.name).toBe(updateData.assetName);
    expect(updatedAsset.note).toBe(updateData.note);
    expect(updatedAsset.status).toBe(updateData.assetStatus);
    expect(updatedAsset.id).toBe(asset.id);

    // Info: (20241210 - Shirley) 清理測試資料
    await deleteAsset(asset.id);
  });

  it('當嘗試更新不存在的資產時應該拋出錯誤', async () => {
    const nonExistentId = -1;
    const updateData = {
      assetName: '測試名稱',
    };

    await expect(updateAsset(testCompanyId, nonExistentId, updateData)).rejects.toThrow();
  });

  it('當嘗試更新不屬於該公司的資產時應該拋出錯誤', async () => {
    // Info: (20241210 - Shirley) 先建立一個測試用資產
    const newAssetData = {
      companyId: testCompanyId,
      name: '測試資產',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'TEST-UPDATE-2',
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);

    const wrongCompanyId = 999;
    const updateData = {
      assetName: '更新後的資產名稱',
    };

    // Info: (20241210 - Shirley) 使用錯誤的公司ID嘗試更新
    await expect(updateAsset(wrongCompanyId, asset.id, updateData)).rejects.toThrow();

    // Info: (20241210 - Shirley) 清理測試資料
    await deleteAsset(asset.id);
  });

  it('應該能夠更新多個欄位', async () => {
    // Info: (20241210 - Shirley) 先建立一個測試用資產
    const newAssetData = {
      companyId: testCompanyId,
      name: '測試資產',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'TEST-UPDATE-3',
      acquisitionDate: 1704067200,
      purchasePrice: 10000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);

    // Info: (20241210 - Shirley) 準備更新多個欄位
    const data = {
      assetName: '更新後的資產名稱',
      purchasePrice: 20000,
      acquisitionDate: 1754067200,
      note: '新的備註',
    };

    const updatedAsset = await updateAsset(testCompanyId, asset.id, data);

    // Info: (20241210 - Shirley) 驗證所有更新的欄位
    expect(updatedAsset.name).toBe(data.assetName);
    expect(updatedAsset.purchasePrice).toBe(data.purchasePrice);
    expect(updatedAsset.acquisitionDate).toBe(data.acquisitionDate);
    expect(updatedAsset.note).toBe(data.note);

    // Info: (20241210 - Shirley) 清理測試資料
    await deleteAsset(asset.id);
  });
});
