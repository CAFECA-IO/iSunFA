import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import {
  createAssetWithVouchers,
  createManyAssets,
  deleteAsset,
  deleteManyAssets,
  listAssetsByCompanyId,
  getLegitAssetById,
  updateAsset,
} from '@/lib/utils/repo/asset.repo';
import { getTimestampNow } from '@/lib/utils/common';
import { SortOrder, SortBy } from '@/constants/sort';

const testCompanyId = 1000;
const testUserId = 1000;

xdescribe('createAssetWithVouchers (single asset)', () => {
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
xdescribe('createManyAssets (multiple assets)', () => {
  it('should create multiple Asset records', async () => {
    const assetNumberPrefix = getTimestampNow().toString();
    const amount = 2;

    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
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
      expect(asset.number).toContain(assetNumberPrefix);
      expect(asset.note).toBe(newAssetData.note);
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
      userId: testUserId,
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

  it('should correctly distribute purchase price among assets', async () => {
    const amount = 3;
    const totalPrice = 10000;
    const expectedPricePerAsset = Math.floor(totalPrice / amount);
    const remainder = totalPrice % amount;

    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
      name: 'Test Asset',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'PRICE-TEST',
      acquisitionDate: 1704067200,
      purchasePrice: totalPrice,
      accumulatedDepreciation: 0,
    };

    const assets = await createManyAssets(newAssetData, amount);
    expect(assets).toBeDefined();
    expect(assets).toHaveLength(amount);

    // Info: (20241213 - Shirley) 檢查前兩個資產的價格應該是平均值
    assets.slice(0, -1).forEach(async (item) => {
      const asset = await getLegitAssetById(item.id, testCompanyId);
      expect(asset?.purchasePrice).toBe(expectedPricePerAsset);
    });

    // Info: (20241213 - Shirley) 檢查最後一個資產的價格應該是平均值加上餘數
    const lastAsset = await getLegitAssetById(assets[amount - 1].id, testCompanyId);
    expect(lastAsset?.purchasePrice).toBe(expectedPricePerAsset + remainder);

    // Info: (20241213 - Shirley) 清理測試資料
    const assetIds = assets.map((asset) => asset.id);
    await deleteManyAssets(assetIds);
  });

  it('should correctly distribute residual value among assets', async () => {
    const amount = 3;
    const totalPrice = 10000;
    const totalResidualValue = 1000;

    const newAssetData = {
      userId: testUserId,
      companyId: testCompanyId,
      name: 'Test Asset',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'RESIDUAL-TEST',
      acquisitionDate: 1704067200,
      purchasePrice: totalPrice,
      accumulatedDepreciation: 0,
      residualValue: totalResidualValue,
    };

    const assets = await createManyAssets(newAssetData, amount);
    expect(assets).toBeDefined();
    expect(assets).toHaveLength(amount);

    // Info: (20241213 - Shirley) 清理測試資料
    const assetIds = assets.map((asset) => asset.id);
    await deleteManyAssets(assetIds);
  });
});

xdescribe('getAssetById (get the asset with fixed conditions)', () => {
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

xdescribe('deleteAsset', () => {
  it('should delete an existing asset', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
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

xdescribe('getAllAssetsWithVouchers', () => {
  it('should only return assets with vouchers', async () => {
    // Info: (20241209 - Shirley) 使用種子資料中已知有 voucher 的資產進行測試
    const assets = await listAssetsByCompanyId(testCompanyId, {});

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
    const assets = await listAssetsByCompanyId(testCompanyId, {
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
    const assets = await listAssetsByCompanyId(testCompanyId, {
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
    const assets = await listAssetsByCompanyId(differentCompanyId, {});

    // Info: (20241209 - Shirley) 假設測試資料庫中 companyId 999 沒有資產
    expect(assets).toHaveLength(0);
  });

  it('should correctly sort assets based on specified conditions', async () => {
    // Info: (20241209 - Shirley) 測試按名稱升序排序
    const sort = {
      sortBy: SortBy.ACQUISITION_DATE,
      sortOrder: SortOrder.ASC,
    };
    const assetsAcqDateASC = await listAssetsByCompanyId(testCompanyId, {
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
    const assetsPriceDesc = await listAssetsByCompanyId(testCompanyId, {
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
    const assets = await listAssetsByCompanyId(testCompanyId, {
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
    const assets = await listAssetsByCompanyId(testCompanyId, { filterCondition });

    expect(assets).toBeDefined();
    assets.forEach((asset) => {
      expect(asset.status).toBe(AssetStatus.NORMAL);
    });
  });
});

xdescribe('updateAsset', () => {
  it('should successfully update asset information', async () => {
    const now = getTimestampNow();
    // Info: (20241210 - Shirley) 先建立一個測試用資產
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
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

  it('should throw an error when trying to update a non-existent asset', async () => {
    const nonExistentId = -1;
    const updateData = {
      assetName: '測試名稱',
    };

    await expect(updateAsset(testCompanyId, nonExistentId, updateData)).rejects.toThrow();
  });

  it('should throw an error when trying to update an asset not belonging to the company', async () => {
    // Info: (20241210 - Shirley) 先建立一個測試用資產
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
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

  it('should be able to update multiple fields', async () => {
    // Info: (20241210 - Shirley) 先建立一個測試用資產
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
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

xdescribe('Soft Delete functionality tests', () => {
  it('should successfully perform soft delete and set deletedAt', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
      name: 'Soft Delete 測試資產',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'SOFT-DELETE-001',
      acquisitionDate: 1704067200,
      purchasePrice: 5000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);
    expect(asset).toBeDefined();

    // Info: (20241211 - Shirley) 執行軟刪除
    const deletedAsset = await deleteAsset(asset.id);
    expect(deletedAsset).toBeDefined();
    expect(deletedAsset.deletedAt).toBeDefined();

    // Info: (20241211 - Shirley) 確認資產已被軟刪除，不應該透過 getLegitAssetById 取得
    const fetchedAsset = await getLegitAssetById(asset.id, testCompanyId);
    expect(fetchedAsset).toBeNull();
  });

  it('should be able to soft delete multiple assets and set deletedAt', async () => {
    const assetData = {
      companyId: testCompanyId,
      userId: testUserId,
      name: 'Soft Delete 多資產測試',
      type: AssetEntityType.LAND,
      number: 'SOFT-DELETE-MULTI',
      acquisitionDate: 1704067200,
      purchasePrice: 15000,
      accumulatedDepreciation: 0,
      amount: 3,
    };

    const assets = await createManyAssets(assetData, assetData.amount);
    expect(assets.length).toBe(assetData.amount);

    const assetIds = assets.map((asset) => asset.id);

    // Info: (20241211 - Shirley) 執行多個軟刪除
    const deletedAssets = await deleteManyAssets(assetIds);
    expect(deletedAssets).toBeDefined();
    expect(deletedAssets.count).toBe(assetData.amount);

    // Info: (20241211 - Shirley) 確認每個資產已被軟刪除
    const fetchPromises = assetIds.map((id) => getLegitAssetById(id, testCompanyId));
    const fetchedAssets = await Promise.all(fetchPromises);

    fetchedAssets.forEach((fetchedAsset) => {
      expect(fetchedAsset).toBeNull();
    });
  });

  it('soft deleted assets should not appear in the asset list', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
      name: 'Soft Delete 列表測試資產',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'SOFT-DELETE-LIST',
      acquisitionDate: 1704067200,
      purchasePrice: 8000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);
    expect(asset).toBeDefined();

    // Info: (20241211 - Shirley) 執行軟刪除
    await deleteAsset(asset.id);

    // Info: (20241211 - Shirley) 獲取資產列表，確認已刪除的資產不在其中
    const assets = await listAssetsByCompanyId(testCompanyId, {});
    const deletedAsset = assets.find((a) => a.id === asset.id);
    expect(deletedAsset).toBeUndefined();
  });

  it('should not be able to update a soft deleted asset', async () => {
    const newAssetData = {
      companyId: testCompanyId,
      userId: testUserId,
      name: 'Soft Delete 更新測試資產',
      type: AssetEntityType.OFFICE_EQUIPMENT,
      number: 'SOFT-DELETE-UPDATE',
      acquisitionDate: 1704067200,
      purchasePrice: 12000,
      accumulatedDepreciation: 0,
    };

    const asset = await createAssetWithVouchers(newAssetData);
    expect(asset).toBeDefined();

    // Info: (20241211 - Shirley) 執行軟刪除
    await deleteAsset(asset.id);

    // Info: (20241211 - Shirley) 準備更新資料
    const updateData = {
      assetName: '更新後的名稱',
    };

    // Info: (20241211 - Shirley) 嘗試更新已軟刪除的資產，應拋出錯誤
    await expect(updateAsset(testCompanyId, asset.id, updateData)).rejects.toThrow();
  });
});
