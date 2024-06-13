import * as module from '@/pages/api/v1/company/[companyId]/ocr/index.repository';
import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import * as common from '@/lib/utils/common';
import { Company } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';

jest.mock('../../../../../../lib/utils/common', () => ({
  formatApiResponse: jest.fn(),
  transformOCRImageIDToURL: jest.fn(),
  timestampInSeconds: jest.fn(),
}));

describe('/ocr/index.repository', () => {
  describe("findUniqueCompanyInPrisma", () => {
    it("should create company in prisma", async () => {
      const companyId = 1;

      const mockResult = {
        id: companyId,
      } as Company;

      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(mockResult);

      await expect(module.findUniqueCompanyInPrisma(companyId)).resolves.toEqual(mockResult);
    });
  });

  describe("findManyOCRByCompanyIdWithoutUsedInPrisma", () => {
    it("should find many ocr by companyId without journalId in prisma", async () => {
      const companyId = 1;

      const mockResult = [
        {
          id: 1,
          companyId,
          journalId: null,
          aichResultId: '1',
          status: ProgressStatus.SUCCESS,
          imageUrl: 'testImageUrl',
          imageName: 'testImageName',
          imageSize: 1024,
          createdAt: 0,
          updatedAt: 0,
        },
      ];

      jest.spyOn(prisma.ocr, "findMany").mockResolvedValue(mockResult);

      await expect(module.findManyOCRByCompanyIdWithoutUsedInPrisma(companyId)).resolves.toEqual(mockResult);
    });
  });

  describe("createOcrInPrisma", () => {
    it("should create ocr in prisma", async () => {
      const companyId = 1;
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
        companyId,
        journalId: null,
        aichResultId: mockAichResult.resultStatus.resultId,
        status: mockAichResult.resultStatus.status,
        imageUrl: mockAichResult.imageUrl,
        imageName: mockAichResult.imageName,
        imageSize: mockAichResult.imageSize,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      jest.spyOn(prisma.ocr, "create").mockResolvedValue(mockOcrResult);

      await expect(module.createOcrInPrisma(companyId, mockAichResult)).resolves.toEqual(mockOcrResult);
    });
  });

  describe("createJournalInPrisma", () => {
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
      const mockJournalCreateResult = {
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

      jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);

      jest.spyOn(prisma.journal, "create").mockResolvedValue(mockJournalCreateResult);

      const createdResult = await module.createJournalInPrisma(companyId, ocrId, mockAichResult);

      expect(createdResult).toEqual(mockJournalCreateResult);
    });
  });

  describe("createJournalAndOcrInPrisma", () => {
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
    const mockCompany = {
      id: companyId,
    } as Company;

    const mockOcrResult = {
      id: ocrId,
      companyId,
      journalId: null,
      aichResultId: aichResult.resultStatus.resultId,
      status: aichResult.resultStatus.status,
      imageUrl: aichResult.imageUrl,
      imageName: aichResult.imageName,
      imageSize: aichResult.imageSize,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    };

    const mockJournalCreate = {
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

    it('should use transaction to create journal and ocr in prisma', async () => {
      // Mocking Prisma and utility functions
      prisma.$transaction = jest.fn().mockImplementation((cb) => cb(prisma));

      jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);
      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(mockCompany);
      jest.spyOn(prisma.ocr, "create").mockResolvedValue(mockOcrResult);
      jest.spyOn(prisma.journal, "create").mockResolvedValue(mockJournalCreate);

      const newJournal = await module.createJournalAndOcrInPrisma(companyId, ocrId, aichResult);

      // Info: ( 20240605 - Murky) 測試如果正確執行玩所有步驟是不是會回傳正確的被創造的journal
      expect(newJournal).toEqual(mockJournalCreate);

      // ToDo: (20240605 - Murky) 此處測試createJournalAndOcrInPrisma是否有正確呼叫到$transaction
      // 然而create ocr 需要改正成僅產生ocr，應該去除journal的部分
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      // ToDo: (20240605 - Murky) 這裡原本想測試是否有正確呼叫findUniqueCompanyInPrisma，
      // 但是因為findUniqueCompanyInPrisma和createOrFindCompanyInPrisma是同一個file(module)，所以無法測試
      // 暫時用toHaveBeenCalledTimes()代替
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: companyId },
        select: { id: true },
      });

      // ToDo: (20240605 - Murky) 這裡原本想測試是否有正確呼叫 createJournalInPrisma，
      // 但是因為 createJournalInPrisma和createOrFindCompanyInPrisma是同一個file(module)，所以無法測試
      // 暫時用toHaveBeenCalledTimes()代替
      expect(prisma.journal.create).toHaveBeenCalledWith({
        data: {
          companyId,
          aichResultId: aichResult.resultStatus.resultId,
          ocrId,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      });
    });

    it('should throw error if process status is not in progress', async () => {
      const invalidAichResult = {
        resultStatus: {
          resultId: '3',
          status: ProgressStatus.INVALID_INPUT,
        },
        imageUrl: 'testImageUrl',
        imageName: 'testImageName',
        imageSize: 1024,
      };

      jest.spyOn(common, "timestampInSeconds").mockReturnValue(nowTimestamp);
      jest.spyOn(prisma.company, "findUnique").mockResolvedValue(mockCompany);
      jest.spyOn(prisma.ocr, "create").mockResolvedValue(mockOcrResult);
      jest.spyOn(prisma.journal, "create").mockResolvedValue(mockJournalCreate);

      await expect(module.createJournalAndOcrInPrisma(companyId, ocrId, invalidAichResult)).rejects.toThrow(STATUS_MESSAGE.OCR_PROCESS_STATUS_IS_NOT_IN_PROGRESS);
    });
  });
});
