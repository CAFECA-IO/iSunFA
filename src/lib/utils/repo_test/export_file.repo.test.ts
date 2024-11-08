import { exportAssets } from '@/lib/utils/repo/export_file.repo';
import { IAssetExportRequestBody } from '@/interfaces/export_file';
import { AssetSortBy, ExportFileType, ExportType } from '@/constants/export_file';
import { SortOrder } from '@/constants/sort';

describe('Export File Repository', () => {
  describe('exportAssets', () => {
    it('應該返回完整的資產列表', async () => {
      const params: IAssetExportRequestBody = {
        exportType: ExportType.ASSETS,
        fileType: ExportFileType.CSV,
        filters: {
          type: '設備',
          startDate: 1609459200,
          endDate: 1640995200,
          searchQuery: '資產',
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

    it('應該處理無過濾條件的情況', async () => {
      const params: IAssetExportRequestBody = {
        exportType: ExportType.ASSETS,
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

    it('應該根據排序條件正確排序資產', async () => {
      const params: IAssetExportRequestBody = {
        exportType: ExportType.ASSETS,
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
        // 驗證排序是否正確
        for (let i = 0; i < result.length - 1; i += 1) {
          expect(result[i].purchasePrice).toBeGreaterThanOrEqual(result[i + 1].purchasePrice);
        }
      }
    });
  });
});
