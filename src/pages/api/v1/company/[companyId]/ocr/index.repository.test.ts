import * as module from '@/pages/api/v1/company/[companyId]/ocr/index.repository';
import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import * as common from '@/lib/utils/common';

jest.mock('../../../../../../lib/utils/common', () => ({
  formatApiResponse: jest.fn(),
  transformOCRImageIDToURL: jest.fn(),
  timestampInSeconds: jest.fn(),
}));

describe('/ocr/index.repository', () => {
  describe("createOrFindCompanyInPrisma", () => {
    it("should create company in prisma", async () => {
      const companyId = 1;
      const company = {
        id: companyId,
        code: 'TEST_OCR',
        name: 'Company Name',
        regional: 'Regional Name',
        startDate: 1,
        createdAt: 1,
        updatedAt: 1,
      };

      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(null);
      jest.spyOn(prisma.company, "create").mockResolvedValue(company);

      await expect(module.createOrFindCompanyInPrisma(companyId)).resolves.toEqual(company);
    });
  });

  describe("createOcrInPrisma", () => {
    it("should create ocr in prisma", async () => {
      const mockAichResult = {
        resultStatus: {
          resultId: '1',
          status: ProgressStatus.SUCCESS,
        },
        imageUrl: 'testImageUrl',
        imageName: 'testImageName',
        imageSize: 1024,
      };

      const nowTimestamp = 0;
      jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);

      const mockOcrResult = {
        id: 1,
        status: mockAichResult.resultStatus.status,
        imageUrl: mockAichResult.imageUrl,
        imageName: mockAichResult.imageName,
        imageSize: mockAichResult.imageSize,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      jest.spyOn(prisma.ocr, "create").mockResolvedValue(mockOcrResult);

      await expect(module.createOcrInPrisma(mockAichResult)).resolves.toEqual(mockOcrResult);
    });
  });

  describe("upsertJournalInPrisma", () => {
    it("should upsert journal in prisma", async () => {
      const companyId = 1;
      const ocrId = 1;
      const mockAichResult = {
        resultStatus: {
          resultId: '1',
          status: ProgressStatus.SUCCESS,
        },
        imageUrl: 'testImageUrl',
        imageName: 'testImageName',
        imageSize: 1024,
      };

      const nowTimestamp = 0;
      jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);

      jest.spyOn(prisma.journal, "upsert").mockResolvedValue({
        id: 1,
        tokenContract: null,
        tokenId: null,
        ocrId,
        aichResultId: null,
        invoiceId: null,
        voucherId: null,
        projectId: null,
        contractId: null,
        companyId,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      await module.upsertJournalInPrisma(companyId, mockAichResult, 1);

      expect(prisma.journal.upsert).toHaveBeenCalledWith({
        where: { aichResultId: mockAichResult.resultStatus.resultId },
        create: {
          companyId,
          ocrId,
          aichResultId: mockAichResult.resultStatus.resultId,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        update: {
          ocrId: 1,
        },
      });
    });
  });
});
