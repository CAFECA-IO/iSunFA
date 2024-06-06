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
        kycStatus: true,
        startDate: 1,
        createdAt: 1,
        updatedAt: 1,
        imageId: null,
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

  describe("createJournalAndOcrInPrisma", () => {
    it('should use transaction to create journal and ocr in prisma', async () => {
      const companyId = 1;
      const ocrId = 2;

      const aichResult = {
        resultStatus: {
          resultId: '3',
          status: ProgressStatus.IN_PROGRESS,
        },
        imageUrl: 'testImageUrl',
        imageName: 'testImageName',
        imageSize: 1024,
      };

      const nowTimestamp = 0;
      const company = {
        id: companyId,
        code: 'TEST_OCR',
        name: 'Company Name',
        regional: 'Regional Name',
        kycStatus: true,
        startDate: 1,
        createdAt: 1,
        updatedAt: 1,
        imageId: null,
      };

      const mockOcrResult = {
        id: ocrId,
        status: aichResult.resultStatus.status,
        imageUrl: aichResult.imageUrl,
        imageName: aichResult.imageName,
        imageSize: aichResult.imageSize,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      const mockJournalUpsert = {
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
      };

      // Mocking Prisma and utility functions
      prisma.$transaction = jest.fn().mockImplementation((cb) => cb(prisma));

      jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);
      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(null);
      jest.spyOn(prisma.company, "create").mockResolvedValue(company);
      jest.spyOn(prisma.ocr, "create").mockResolvedValue(mockOcrResult);
      jest.spyOn(prisma.journal, "upsert").mockResolvedValue(mockJournalUpsert);

      await module.createJournalAndOcrInPrisma(companyId, aichResult);

      // Verify that the transaction was called
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify that the functions inside the transaction were called with the correct arguments
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: companyId },
        select: { id: true },
      });

      expect(prisma.company.create).toHaveBeenCalledWith({
        data: {
          id: companyId,
          code: 'TEST_OCR',
          name: 'Company Name',
          regional: 'Regional Name',
          kycStatus: true,
          startDate: nowTimestamp,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        select: { id: true },
      });

      expect(prisma.ocr.create).toHaveBeenCalledWith({
        data: {
          imageName: aichResult.imageName,
          imageUrl: aichResult.imageUrl,
          imageSize: aichResult.imageSize,
          status: aichResult.resultStatus.status,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      });

      expect(prisma.journal.upsert).toHaveBeenCalledWith({
        where: {
          aichResultId: aichResult.resultStatus.resultId,
        },
        create: {
          companyId,
          ocrId,
          aichResultId: aichResult.resultStatus.resultId,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        update: {
          ocrId,
        },
      });
    });
  });
});
