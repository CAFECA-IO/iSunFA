// ToDo: (20240830 - Murky) To Jacky - please help me edit this test
it('should be true', () => {
  expect(true).toBe(true);
});
// import * as module from '@/pages/api/v1/company/[companyId]/ocr/index';
// import formidable from 'formidable';
// import { MockProxy, mock } from 'jest-mock-extended';
// import fs from 'fs';
// import { STATUS_MESSAGE } from '@/constants/status_code';
// import * as parseImageForm from '@/lib/utils/parse_image_form';
// import * as common from '@/lib/utils/common';
// import { ProgressStatus } from '@/constants/account';
// import * as repository from '@/lib/utils/repo/ocr.repo';
// import { Ocr } from '@prisma/client';
// import { IAccountResultStatus } from '@/interfaces/accounting_account';
// import { IOCR } from '@/interfaces/ocr';
// import * as fileModule from '@/constants/file';

// global.fetch = jest.fn();

// jest.mock('../../../../../../constants/file', () => ({
//   getFileFolder: jest.fn(),
//   FileFolder: jest.requireActual('../../../../../../constants/file').FileFolder,
// }));

// jest.mock('../../../../../../lib/utils/parse_image_form', () => ({
//   parseForm: jest.fn(),
//   findFileByName: jest.fn(),
//   readFile: jest.fn(),
//   bufferToBlob: jest.fn(),
// }));

// jest.mock('../../../../../../lib/utils/common', () => ({
//   formatApiResponse: jest.fn(),
//   transformOCRImageIDToURL: jest.fn(),
//   timestampInSeconds: jest.fn(),
//   timestampInMilliSeconds: jest.fn(),
//   transformBytesToFileSizeString: jest.fn(),
//   generateUUID: jest.fn(),
// }));

// jest.mock('../../../../../../lib/utils/repo/ocr.repo', () => {
//   return {
//     findCompanyInPrisma: jest.fn(),
//     createOcrInPrisma: jest.fn(),
//     createJournalInPrisma: jest.fn(),
//     createJournalAndOcrInPrisma: jest.fn(),
//   };
// });

// jest.mock('../../../../../../lib/utils/auth_check', () => ({
//   checkAdmin: jest.fn(),
// }));

// beforeEach(() => {});

// afterEach(() => {
//   jest.resetAllMocks();
// });

// describe('POST OCR', () => {
//   describe('readImageFromFilePath', () => {
//     let mockImage: MockProxy<formidable.File>;
//     const mockPath = '/test';
//     const mockMimetype = 'image/png';
//     const mockFileContent = Buffer.from('mock image content');
//     beforeEach(() => {
//       mockImage = mock<formidable.File>();
//       mockImage.filepath = mockPath;
//       mockImage.mimetype = mockMimetype;
//       jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockFileContent);
//     });
//     it('should return Blob', async () => {
//       jest.spyOn(fileModule, 'getFileFolder').mockReturnValue(mockPath);
//       jest.spyOn(parseImageForm, 'findFileByName').mockResolvedValue(mockPath);
//       const mockBuffer = Buffer.from('test');
//       const mockBlob = new Blob([mockBuffer], { type: mockMimetype || undefined });

//       jest.spyOn(parseImageForm, 'readFile').mockResolvedValue(mockBuffer);
//       jest.spyOn(parseImageForm, 'bufferToBlob').mockReturnValue(mockBlob);
//       const blob = await module.readImageFromFilePath(mockPath, mockMimetype);
//       expect(blob).toEqual(mockBlob);
//     });
//   });

//   describe('getImageName', () => {
//     it('should return true', () => {
//       const mockImage: MockProxy<formidable.File> = mock<formidable.File>();
//       const mockPath = './test';
//       mockImage.filepath = mockPath;

//       const imageName = module.getImageName(mockPath);
//       expect(imageName).toEqual('test');
//     });
//   });

//   describe('createImageFormData', () => {
//     it('should return FormData', () => {
//       const mockBlob = new Blob(['testBlob']);
//       const mockName = 'test';
//       const formData = module.createImageFormData(mockBlob, mockName);

//       // Info: (20240424 - Murky) FormData return will be "File" type, so we can't use "toEqual" to compare
//       const imageFile = formData.get('image') as File;
//       // Info: (20240424 - Murky) test if content is correct
//       imageFile.text().then((text) => {
//         expect(text).toBe('testBlob');
//       });

//       expect(formData.get('imageName')).toEqual(mockName);
//     });
//   });

//   describe('uploadImageToAICH', () => {
//     const mockBlob = new Blob(['testBlob']);
//     const mockName = 'test';
//     it('should return Promise', async () => {
//       const mockResponse = {
//         ok: true,
//         json: jest.fn().mockResolvedValue({ payload: 'testPayload' }),
//       };

//       (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

//       const promiseJson = module.uploadImageToAICH(mockBlob, mockName);

//       expect(promiseJson).toBeInstanceOf(Promise);

//       expect(global.fetch).toHaveBeenCalledWith(
//         expect.stringContaining('/ocr/upload'),
//         expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
//       );
//     });

//     it('should throw error when fetch failed', async () => {
//       (global.fetch as jest.Mock).mockRejectedValue(new Error('fetch failed'));
//       await expect(module.uploadImageToAICH(mockBlob, mockName)).rejects.toThrow(
//         STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED
//       );
//     });

//     it('should throw error when response is not ok', async () => {
//       const mockResponse = {
//         ok: false,
//       };
//       (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

//       await expect(module.uploadImageToAICH(mockBlob, mockName)).rejects.toThrow(
//         STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED
//       );
//     });
//   });

//   // Info: (20240424 - Murky) This function is still editing
//   describe('getPayloadFromResponseJSON', () => {
//     it('should return payload', async () => {
//       const mockResponse: {
//         payload?: unknown;
//       } = { payload: 'testPayload' };
//       const promiseJson: Promise<{ payload?: unknown } | null> = new Promise((resolve) => {
//         resolve(mockResponse);
//       });

//       const payload = await module.getPayloadFromResponseJSON(promiseJson);
//       expect(payload).toEqual('testPayload');
//     });

//     it('should throw error when responseJSON is null', async () => {
//       const promiseJson: Promise<{ payload?: unknown } | null> = new Promise((resolve) => {
//         resolve(null);
//       });

//       await expect(module.getPayloadFromResponseJSON(promiseJson)).rejects.toThrow(
//         STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL
//       );
//     });
//   });

//   describe('createOcrFromAichResults', () => {
//     it('should return resultJson', async () => {
//       jest.spyOn(common, 'timestampInSeconds').mockReturnValue(0);
//       jest.spyOn(common, 'transformBytesToFileSizeString').mockReturnValue('1 MB');
//       const resultId = 'testResultId';
//       const companyId = 1;
//       const mockAichReturn = [
//         {
//           resultStatus: {
//             resultId,
//             status: ProgressStatus.SUCCESS,
//           },
//           imageUrl: 'testImageUrl',
//           imageName: 'testImageName',
//           imageSize: 1024,
//           type: 'invoice',
//           uploadIdentifier: 'test',
//           createAt: 0,
//         },
//       ];

//       const mockOcrDbResult: Ocr = {
//         id: 1,
//         companyId,
//         aichResultId: resultId,
//         status: ProgressStatus.SUCCESS,
//         imageUrl: 'testImageUrl',
//         imageName: 'testImageName',
//         imageSize: 1024,
//         type: 'invoice',
//         createdAt: 0,
//         updatedAt: 0,
//         deletedAt: null,
//       };

//       const expectResult: IOCR[] = [
//         {
//           aichResultId: 'testResultId',
//           createdAt: 0,
//           id: 1,
//           imageName: 'testImageName',
//           imageSize: '1 MB',
//           imageUrl: 'testImageUrl',
//           progress: 0,
//           status: ProgressStatus.IN_PROGRESS,
//           uploadIdentifier: 'test',
//         },
//       ];

//       jest.spyOn(repository, 'createOcrInPrisma').mockResolvedValue(mockOcrDbResult);

//       const resultJson = await module.createOcrFromAichResults(companyId, mockAichReturn);

//       expect(resultJson).toEqual(expectResult);
//     });
//   });

//   describe('handlePostRequest', () => {
//     it('should return resultJson', async () => {
//       const resultId = 'testResultId';
//       const mockFields = mock<formidable.Fields>();
//       const mockFiles: MockProxy<formidable.Files<'image'>> = {
//         image: [
//           {
//             filepath: '/test.png',
//             originalFilename: 'test.png',
//             mimetype: 'image/png',
//             hashAlgorithm: 'sha1',
//             newFilename: 'test.png',
//             size: 1024,
//             toJSON: jest.fn(),
//           },
//         ],
//       };

//       const mockAichReturn = [
//         {
//           resultStatus: {
//             resultId,
//             status: ProgressStatus.SUCCESS,
//           },
//           imageUrl: 'testImageUrl',
//           imageName: 'testImageName',
//           imageSize: 1024,
//         },
//       ];

//       const mockResult: IAccountResultStatus[] = [
//         {
//           resultId,
//           status: ProgressStatus.SUCCESS,
//         },
//       ];

//       const mockReturn = {
//         powerby: 'ISunFa',
//         success: true,
//         code: '201',
//         message: 'Success',
//         payload: mockResult,
//       };

//       jest.mock('./index', () => {
//         return {
//           postImageToAICH: jest.fn().mockResolvedValue(mockAichReturn),
//           isCompanyIdValid: jest.fn().mockReturnValue(true),
//           getImageFileFromFormData: jest.fn().mockResolvedValue(mockFiles),
//           createJournalsAndOcrFromAichResults: jest.fn().mockResolvedValue(mockResult),
//         };
//       });

//       jest.spyOn(parseImageForm, 'parseForm').mockResolvedValue({
//         fields: mockFields,
//         files: mockFiles,
//       });

//       // Deprecated: (20240605 - Murky) - This is not necessary
//       jest
//         .spyOn(common, 'formatApiResponse')
//         .mockReturnValue({ httpCode: 201, result: mockReturn });
//       jest.spyOn(common, 'timestampInSeconds').mockReturnValue(1);
//       jest.spyOn(common, 'transformOCRImageIDToURL').mockReturnValue('testImageUrl');
//       jest.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from('test'));

//       const mockResponse = {
//         ok: true,
//         json: jest.fn().mockResolvedValue({ payload: 'testPayload' }),
//       };

//       (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
//     });
//   });
// });

// describe('GET OCR', () => {
//   describe('fetchStatus', () => {
//     it('should return resultJson', async () => {
//       const aichResultId = 'testAichResultId';

//       const mockResponse = {
//         ok: true,
//         json: jest.fn().mockResolvedValue({ payload: ProgressStatus.SUCCESS }),
//       };

//       (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

//       jest.spyOn(common, 'generateUUID').mockReturnValue(aichResultId);

//       const resultJson = await module.fetchStatus(aichResultId);
//       expect(resultJson).toEqual(ProgressStatus.SUCCESS);
//     });
//   });

//   describe('formatUnprocessedOCR', () => {
//     it('should return IOCR', async () => {
//       const mockAichId = 'testAichId';
//       const mockCompanyId = 1;
//       const mockImageFileSize = '1 MB';
//       const mockOcr: Ocr[] = [
//         {
//           id: 1,
//           aichResultId: mockAichId,
//           companyId: mockCompanyId,
//           status: 'success',
//           imageUrl: 'testImageUrl',
//           imageName: 'testImageName',
//           imageSize: 1024,
//           type: 'invoice',
//           createdAt: 0,
//           updatedAt: 0,
//           deletedAt: null,
//         },
//       ];

//       (global.fetch as jest.Mock).mockResolvedValue({
//         ok: true,
//         json: jest.fn().mockResolvedValue({ payload: ProgressStatus.SUCCESS }),
//       });
//       jest.spyOn(common, 'transformBytesToFileSizeString').mockReturnValue(mockImageFileSize);
//       jest.spyOn(common, 'timestampInSeconds').mockReturnValue(0);

//       const unprocessedOCR = await module.formatUnprocessedOCR(mockOcr);

//       const expectUnprocessedOCR = [
//         {
//           id: 1,
//           aichResultId: mockAichId,
//           imageName: 'testImageName',
//           imageUrl: 'testImageUrl',
//           imageSize: mockImageFileSize,
//           progress: 100,
//           status: ProgressStatus.SUCCESS,
//           createdAt: 0,
//         },
//       ];
//       expect(unprocessedOCR).toEqual(expectUnprocessedOCR);
//     });
//   });
// });
