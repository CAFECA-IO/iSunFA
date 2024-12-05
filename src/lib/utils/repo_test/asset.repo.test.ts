import { AssetDepreciationMethod, AssetStatus } from '@/constants/asset';
import { createAssetWithVouchers, createManyAssets } from '@/lib/utils/repo/asset.repo';

const testCompanyId = 1000;

describe('Asset Repository Tests', () => {
  describe('createAssetWithVouchers (single asset)', () => {
    it('should create a new Asset record', async () => {
      const newAssetData = {
        companyId: testCompanyId,
        name: 'Test Asset',
        type: 'Equipment',
        number: 'A-001',
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
      expect(asset.type).toBe(newAssetData.type);
      expect(asset.number).toBe(newAssetData.number);
      expect(asset.acquisitionDate).toBe(newAssetData.acquisitionDate);
      expect(asset.purchasePrice).toBe(newAssetData.purchasePrice);
      expect(asset.accumulatedDepreciation).toBe(newAssetData.accumulatedDepreciation);
      expect(asset.residualValue).toBe(newAssetData.residualValue);
      expect(asset.remainingLife).toBe(newAssetData.usefulLife);
      expect(asset.status).toBe(AssetStatus.NORMAL);
      expect(asset.depreciationStart).toBe(newAssetData.depreciationStart);
      expect(asset.depreciationMethod).toBe(newAssetData.depreciationMethod);
      expect(asset.usefulLife).toBe(newAssetData.usefulLife);
      expect(asset.note).toBe(newAssetData.note);
    });

    it('should create asset with default values when optional fields are not provided', async () => {
      const newAssetData = {
        companyId: testCompanyId,
        name: 'Test Asset',
        type: 'Equipment',
        number: 'AB-002',
        acquisitionDate: 1704067200,
        purchasePrice: 10000,
        accumulatedDepreciation: 0,
      };

      const asset = await createAssetWithVouchers(newAssetData);

      expect(asset).toBeDefined();
      expect(asset.residualValue).toBe(newAssetData.purchasePrice);
      expect(asset.remainingLife).toBe(0);
      expect(asset.depreciationStart).toBe(newAssetData.acquisitionDate);
      expect(asset.depreciationMethod).toBe(AssetDepreciationMethod.NONE);
      expect(asset.usefulLife).toBe(0);
    });
  });

  describe('createManyAssets (multiple assets)', () => {
    it('should create multiple Asset records', async () => {
      const newAssetData = {
        companyId: testCompanyId,
        name: 'Test Asset',
        type: 'Equipment',
        number: 'Z-001',
        acquisitionDate: 1704067200,
        purchasePrice: 10000,
        accumulatedDepreciation: 0,
        residualValue: 1000,
        usefulLife: 60,
        depreciationStart: 1704067200,
        depreciationMethod: AssetDepreciationMethod.STRAIGHT_LINE,
        note: 'Test asset note',
      };

      const amount = 5;
      const assets = await createManyAssets(newAssetData, amount);

      expect(assets).toBeDefined();
      expect(assets.length).toBe(amount);

      assets.forEach((asset, index) => {
        expect(asset.companyId).toBe(testCompanyId);
        expect(asset.name).toBe(newAssetData.name);
        expect(asset.type).toBe(newAssetData.type);
        expect(asset.number).toBe(`Z-00${index + 1}`); // Info: (20241205 - Shirley) 檢查 asset number 編號格式
        expect(asset.acquisitionDate).toBe(newAssetData.acquisitionDate);
        expect(asset.purchasePrice).toBe(newAssetData.purchasePrice);
        expect(asset.accumulatedDepreciation).toBe(newAssetData.accumulatedDepreciation);
        expect(asset.residualValue).toBe(newAssetData.residualValue);
        expect(asset.remainingLife).toBe(newAssetData.usefulLife);
        expect(asset.status).toBe(AssetStatus.NORMAL);
        expect(asset.depreciationStart).toBe(newAssetData.depreciationStart);
        expect(asset.depreciationMethod).toBe(newAssetData.depreciationMethod);
        expect(asset.usefulLife).toBe(newAssetData.usefulLife);
        expect(asset.note).toBe(newAssetData.note);
      });
    });
  });
});
