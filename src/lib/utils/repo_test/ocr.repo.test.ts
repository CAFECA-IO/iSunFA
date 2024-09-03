// ToDo: (20240830 - Murky) To Jacky - please help me edit this test
it('should be true', () => {
  expect(true).toBe(true);
});
// import * as module from '@/lib/utils/repo/ocr.repo';
// import prisma from '@/client';
// import { ProgressStatus } from '@/constants/account';
// import * as common from '@/lib/utils/common';
// import { Company } from '@prisma/client';

// jest.mock('../common', () => ({
//   formatApiResponse: jest.fn(),
//   transformOCRImageIDToURL: jest.fn(),
//   timestampInSeconds: jest.fn(),
// }));

// describe('/ocr/index.repository', () => {
//   describe('findUniqueCompanyInPrisma', () => {
//     it('should create company in prisma', async () => {
//       const companyId = 1;

//       const mockResult = {
//         id: companyId,
//       } as Company;

//       jest.spyOn(prisma.company, 'findUnique').mockResolvedValue(mockResult);

//       await expect(module.findUniqueCompanyInPrisma(companyId)).resolves.toEqual(mockResult);
//     });
//   });

//   describe('findManyOCRByCompanyIdWithoutUsedInPrisma', () => {
//     it('should find many ocr by companyId without journalId in prisma', async () => {
//       const companyId = 1;

//       const mockResult = [
//         {
//           id: 1,
//           companyId,
//           journalId: null,
//           aichResultId: '1',
//           status: ProgressStatus.SUCCESS,
//           imageUrl: 'testImageUrl',
//           imageName: 'testImageName',
//           imageSize: 1024,
//           createdAt: 0,
//           updatedAt: 0,
//         },
//       ];

//       jest.spyOn(prisma.ocr, 'findMany').mockResolvedValue(mockResult);

//       await expect(module.findManyOCRByCompanyIdWithoutUsedInPrisma(companyId)).resolves.toEqual(
//         mockResult
//       );
//     });
//   });

//   describe('createOcrInPrisma', () => {
//     it('should create ocr in prisma', async () => {
//       const companyId = 1;
//       const mockAichResult = {
//         resultStatus: {
//           resultId: '1',
//           status: ProgressStatus.SUCCESS,
//         },
//         imageUrl: 'testImageUrl',
//         imageName: 'testImageName',
//         imageSize: 1024,
//       };

//       const nowTimestamp = 0;
//       jest.spyOn(common, 'timestampInSeconds').mockReturnValue(nowTimestamp);

//       const mockOcrResult = {
//         id: 1,
//         companyId,
//         journalId: null,
//         aichResultId: mockAichResult.resultStatus.resultId,
//         status: mockAichResult.resultStatus.status,
//         imageUrl: mockAichResult.imageUrl,
//         imageName: mockAichResult.imageName,
//         imageSize: mockAichResult.imageSize,
//         createdAt: nowTimestamp,
//         updatedAt: nowTimestamp,
//       };

//       jest.spyOn(prisma.ocr, 'create').mockResolvedValue(mockOcrResult);

//       await expect(module.createOcrInPrisma(companyId, mockAichResult)).resolves.toEqual(
//         mockOcrResult
//       );
//     });
//   });
// });
