import { exportAssets } from '@/lib/utils/repo/export_asset.repo';
import { IAssetExportRequestBody } from '@/interfaces/export_asset';
import { AssetSortBy, ExportFileType } from '@/constants/export_asset';
import { SortOrder } from '@/constants/sort';

describe('Export File Repository', () => {
  describe('exportAssets', () => {
    it('should return a complete list of assets', async () => {
      const params: IAssetExportRequestBody = {
        fileType: ExportFileType.CSV,
        filters: {
          type: 'Equipment',
          startDate: 1609459200,
          endDate: 1640995200,
          searchQuery: 'asset',
        },
        sort: [
          {
            by: AssetSortBy.ACQUISITION_DATE,
            order: SortOrder.ASC,
          },
        ],
        options: {
          fields: ['name', 'purchasePrice'],
          timezone: '+0800',
        },
      };

      const result = await exportAssets(params, 1000);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        result.forEach((asset) => {
          expect(asset).toHaveProperty('acquisitionDate');
          expect(asset).toHaveProperty('name');
          expect(asset).toHaveProperty('purchasePrice');
          expect(asset).toHaveProperty('accumulatedDepreciation');
          expect(asset).toHaveProperty('residualValue');
          expect(asset).toHaveProperty('remainingLife');
          expect(asset).toHaveProperty('type');
          expect(asset).toHaveProperty('status');
          expect(asset).toHaveProperty('number');
        });
      }
    });

    it('should handle cases with no filters', async () => {
      const params: IAssetExportRequestBody = {
        fileType: ExportFileType.CSV,
        filters: {},
        sort: [],
        options: {},
      };

      const result = await exportAssets(params, 1000);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        result.forEach((asset) => {
          expect(asset).toHaveProperty('acquisitionDate');
          expect(asset).toHaveProperty('name');
          expect(asset).toHaveProperty('purchasePrice');
          expect(asset).toHaveProperty('accumulatedDepreciation');
          expect(asset).toHaveProperty('residualValue');
          expect(asset).toHaveProperty('remainingLife');
          expect(asset).toHaveProperty('type');
          expect(asset).toHaveProperty('status');
          expect(asset).toHaveProperty('number');
        });
      }
    });

    it('should correctly sort assets based on sorting criteria', async () => {
      const params: IAssetExportRequestBody = {
        fileType: ExportFileType.CSV,
        filters: {},
        sort: [
          {
            by: AssetSortBy.PURCHASE_PRICE,
            order: SortOrder.DESC,
          },
        ],
        options: {},
      };

      const result = await exportAssets(params, 1000);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 1) {
        // Info: (20241108 - Shirley) Verify if sorting is correct
        for (let i = 0; i < result.length - 1; i += 1) {
          expect(result[i].purchasePrice).toBeGreaterThanOrEqual(result[i + 1].purchasePrice);
        }
      }
    });
  });
});
