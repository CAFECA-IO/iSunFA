import { certificateAPIDeleteMultipleUtils as deleteUtils } from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { deleteMultipleCertificates } from '@/lib/utils/repo/certificate.repo';

// Info: (20250609 - Shirley) 模擬依賴
jest.mock('@/lib/utils/repo/certificate.repo');

// Info: (20250609 - Shirley) 設置模擬函數
const mockDeleteMultipleCertificates = jest.mocked(deleteMultipleCertificates);

// ToDo: (20250612 - Shirley) Revise ineffective test cases
describe('Certificate API Delete Utils 測試', () => {
  const mockTimestamp = 1640995200;
  const mockCertificateIds = [1, 2, 3];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteCertificates', () => {
    it('應該成功刪除多個憑證', async () => {
      const expectedDeletedIds = [1, 2, 3];
      mockDeleteMultipleCertificates.mockResolvedValue(expectedDeletedIds);

      const options = {
        certificateIds: mockCertificateIds,
        nowInSecond: mockTimestamp,
      };

      const result = await deleteUtils.deleteCertificates(options);

      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(options);
      expect(result).toEqual(expectedDeletedIds);
    });

    it('應該正確處理空的憑證 ID 列表', async () => {
      const emptyIds: number[] = [];
      mockDeleteMultipleCertificates.mockResolvedValue([]);

      const options = {
        certificateIds: emptyIds,
        nowInSecond: mockTimestamp,
      };

      const result = await deleteUtils.deleteCertificates(options);

      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(options);
      expect(result).toEqual([]);
    });

    it('應該正確處理部分刪除成功的情況', async () => {
      const partiallyDeletedIds = [1, 3]; // Info: (20250609 - Shirley) ID 2 刪除失敗
      mockDeleteMultipleCertificates.mockResolvedValue(partiallyDeletedIds);

      const options = {
        certificateIds: mockCertificateIds,
        nowInSecond: mockTimestamp,
      };

      const result = await deleteUtils.deleteCertificates(options);

      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(options);
      expect(result).toEqual(partiallyDeletedIds);
      expect(result.length).toBeLessThan(mockCertificateIds.length);
    });

    it('應該正確處理刪除失敗的情況', async () => {
      const errorMessage = 'Database error occurred';
      mockDeleteMultipleCertificates.mockRejectedValue(new Error(errorMessage));

      const options = {
        certificateIds: mockCertificateIds,
        nowInSecond: mockTimestamp,
      };

      await expect(deleteUtils.deleteCertificates(options)).rejects.toThrow(errorMessage);
      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(options);
    });

    it('應該正確傳遞所有參數到 repo 函數', async () => {
      mockDeleteMultipleCertificates.mockResolvedValue([]);

      const customOptions = {
        certificateIds: [10, 20, 30],
        nowInSecond: 1641000000,
      };

      await deleteUtils.deleteCertificates(customOptions);

      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(customOptions);
      expect(mockDeleteMultipleCertificates).toHaveBeenCalledTimes(1);
    });

    it('應該處理單個憑證 ID 的刪除', async () => {
      const singleId = [1];
      mockDeleteMultipleCertificates.mockResolvedValue(singleId);

      const options = {
        certificateIds: singleId,
        nowInSecond: mockTimestamp,
      };

      const result = await deleteUtils.deleteCertificates(options);

      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(options);
      expect(result).toEqual(singleId);
    });

    it('應該處理大量憑證 ID 的刪除', async () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => i + 1);
      mockDeleteMultipleCertificates.mockResolvedValue(manyIds);

      const options = {
        certificateIds: manyIds,
        nowInSecond: mockTimestamp,
      };

      const result = await deleteUtils.deleteCertificates(options);

      expect(mockDeleteMultipleCertificates).toHaveBeenCalledWith(options);
      expect(result).toEqual(manyIds);
      expect(result.length).toBe(100);
    });
  });
});
