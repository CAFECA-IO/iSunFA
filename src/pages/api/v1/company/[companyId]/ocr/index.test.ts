import { NextApiRequest, NextApiResponse } from 'next';
import * as module from '@/pages/api/v1/company/[companyId]/ocr/index';
import formidable from 'formidable';
import { MockProxy, mock } from 'jest-mock-extended';
import fs from 'fs';
import { STATUS_MESSAGE } from '@/constants/status_code';
import * as parseImageForm from '@/lib/utils/parse_image_form';
import * as common from '@/lib/utils/common';
import { ProgressStatus } from '@/constants/account';
import * as repository from '@/pages/api/v1/company/[companyId]/ocr/index.repository';
import { Journal } from '@prisma/client';
import { IAccountResultStatus } from '@/interfaces/accounting_account';

global.fetch = jest.fn();

jest.mock('../../../../../../lib/utils/parse_image_form', () => ({
  parseForm: jest.fn(),
}));

jest.mock('../../../../../../lib/utils/common', () => ({
  formatApiResponse: jest.fn(),
  transformOCRImageIDToURL: jest.fn(),
  timestampInSeconds: jest.fn(),
}));

jest.mock('./index.repository', () => {
  return {
    findCompanyInPrisma: jest.fn(),
    createOcrInPrisma: jest.fn(),
    createJournalInPrisma: jest.fn(),
    createJournalAndOcrInPrisma: jest.fn(),
  };
});

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    query: {},
    method: '',
    json: jest.fn(),
    body: {},
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('/OCR/index.ts', () => {
  describe('readImageFromFilePath', () => {
    let mockImage: MockProxy<formidable.File>;
    const mockPath = '/test';
    const mockMimetype = 'image/png';
    const mockFileContent = Buffer.from('mock image content');
    beforeEach(() => {
      mockImage = mock<formidable.File>();
      mockImage.filepath = mockPath;
      mockImage.mimetype = mockMimetype;
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockFileContent);
    });
    it('should return Blob', async () => {
      const blob = await module.readImageFromFilePath(mockImage);
      expect(fs.promises.readFile).toHaveBeenCalledWith(mockPath);
      expect(blob).toEqual(new Blob([mockFileContent], { type: mockMimetype || undefined }));
    });
  });

  describe('getImageName', () => {
    it('should return true', () => {
      const mockImage: MockProxy<formidable.File> = mock<formidable.File>();
      const mockPath = './test';
      mockImage.filepath = mockPath;

      const imageName = module.getImageName(mockImage);
      expect(imageName).toEqual('test');
    });
  });

  describe('createImageFormData', () => {
    it('should return FormData', () => {
      const mockBlob = new Blob(['testBlob']);
      const mockName = 'test';
      const formData = module.createImageFormData(mockBlob, mockName);

      // Info Murky (20240424) FormData return will be "File" type, so we can't use "toEqual" to compare
      const imageFile = formData.get('image') as File;
      // Info Murky (20240424) test if content is correct
      imageFile.text().then((text) => {
        expect(text).toBe('testBlob');
      });

      expect(formData.get('imageName')).toEqual(mockName);
    });
  });

  describe('uploadImageToAICH', () => {
    const mockBlob = new Blob(['testBlob']);
    const mockName = 'test';
    it('should return Promise', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ payload: 'testPayload' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const promiseJson = module.uploadImageToAICH(mockBlob, mockName);

      expect(promiseJson).toBeInstanceOf(Promise);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ocr/upload'),
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
    });

    it('should throw error when fetch failed', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('fetch failed'));
      await expect(module.uploadImageToAICH(mockBlob, mockName)).rejects.toThrow(
        STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED
      );
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(module.uploadImageToAICH(mockBlob, mockName)).rejects.toThrow(
        STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED
      );
    });
  });

  // Info Murky (20240424) This function is still editing
  describe('getPayloadFromResponseJSON', () => {
    it('should return payload', async () => {
      const mockResponse: {
        payload?: unknown;
      } = { payload: 'testPayload' };
      const promiseJson: Promise<{ payload?: unknown } | null> = new Promise((resolve) => {
        resolve(mockResponse);
      });

      const payload = await module.getPayloadFromResponseJSON(promiseJson);
      expect(payload).toEqual('testPayload');
    });

    it('should throw error when responseJSON is null', async () => {
      const promiseJson: Promise<{ payload?: unknown } | null> = new Promise((resolve) => {
        resolve(null);
      });

      await expect(module.getPayloadFromResponseJSON(promiseJson)).rejects.toThrow(
        STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL
      );
    });
  });

  describe('postImageToAICH', () => {
    let mockImages: MockProxy<formidable.Files<'image'>>;
    let mockImage: MockProxy<formidable.File>;
    const mockPath = '/test';
    const mockMimetype = 'image/png';
    const mockFileContent = Buffer.from('mock image content');
    beforeEach(() => {
      mockImage = mock<formidable.File>();
      mockImage.filepath = mockPath;
      mockImage.mimetype = mockMimetype;
      mockImage.size = 1000;
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockFileContent);
      jest.spyOn(common, 'transformOCRImageIDToURL').mockReturnValue('testImageUrl');

      // help me mock formidable.Files<"image">

      mockImages = mock<formidable.Files<'image'>>({
        image: [mockImage],
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should throw error when images is empty', async () => {
      mockImages = mock<formidable.Files<'image'>>({
        image: [],
      });
      await expect(module.postImageToAICH(mockImages)).rejects.toThrow(
        STATUS_MESSAGE.INVALID_INPUT_FORM_DATA_IMAGE
      );
    });

    it('should return resultJson', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ payload: 'testPayload' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const resultJson = await module.postImageToAICH(mockImages);

      const resultJsonExpect = expect.objectContaining({
        resultStatus: expect.any(String),
        imageUrl: expect.any(String),
        imageName: expect.any(String),
        imageSize: expect.any(Number),
      });

      const resultJsonArrayExpect = expect.arrayContaining([resultJsonExpect]);

      expect(resultJson).toEqual(resultJsonArrayExpect);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ocr/upload'),
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
    });
  });

  describe('isCompanyIdValid', () => {
    it('should return true if companyId is numeric', () => {
      const companyId = '1';
      expect(module.isCompanyIdValid(companyId)).toBe(true);
    });

    it('should return false if companyId is not numeric', () => {
      const companyId = 'a';
      expect(module.isCompanyIdValid(companyId)).toBe(false);
    });

    it('should return false if companyId is undefined', () => {
      const companyId = undefined;
      expect(module.isCompanyIdValid(companyId)).toBe(false);
    });
    it('should return false if companyId is array', () => {
      const companyId = ['1'];
      expect(module.isCompanyIdValid(companyId)).toBe(false);
    });
  });

  describe('getImageFileFromFormData', () => {
    let mockFiles: MockProxy<formidable.Files<'image'>>;
    let mockFields: MockProxy<formidable.Fields>;
    beforeEach(() => {
      mockFiles = {
        image: [
          {
            filepath: '/test.png',
            originalFilename: 'test.png',
            mimetype: 'image/png',
            hashAlgorithm: 'sha1',
            newFilename: 'test.png',
            size: 1024,
            toJSON: jest.fn(),
          },
        ],
      };
      mockFields = mock<formidable.Fields>();
    });

    it('should return image file', async () => {
      const mockReturn = {
        fields: mockFields,
        files: mockFiles,
      };

      jest.spyOn(parseImageForm, 'parseForm').mockResolvedValue(mockReturn);
      const imageFile = await module.getImageFileFromFormData(req);
      expect(imageFile).toEqual(mockFiles);
    });

    it('should throw error when parseForm failed', async () => {
      jest.spyOn(parseImageForm, 'parseForm').mockRejectedValue(new Error('parseForm failed'));
      await expect(module.getImageFileFromFormData(req)).rejects.toThrow(
        STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR
      );
    });
  });

  describe('createJournalsAndOcrFromAichResults', () => {
    it('should return resultJson', async () => {
      const nowTimestamp = 0;
      const companyId = 1;
      const ocrId = 2;
      const resultId = 'testResultId';
      const mockAichReturn = [
        {
          resultStatus: {
            resultId,
            status: ProgressStatus.SUCCESS,
          },
          imageUrl: 'testImageUrl',
          imageName: 'testImageName',
          imageSize: 1024,
        },
      ];

      const mockJournal: Journal = {
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

      const mockAccountingResult: IAccountResultStatus[] = [
        {
          resultId,
          status: ProgressStatus.SUCCESS,
        },
      ];

      jest.spyOn(repository, 'createJournalAndOcrInPrisma').mockResolvedValue(mockJournal);

      const resultJson = await module.createJournalsAndOcrFromAichResults(
        companyId,
        mockAichReturn
      );

      expect(resultJson).toEqual(mockAccountingResult);
    });

    it('should throw error when createJournalAndOcrInPrisma failed', async () => {
      const companyId = 1;
      const mockAichReturn = [
        {
          resultStatus: {
            resultId: '1',
            status: ProgressStatus.LLM_ERROR,
          },
          imageUrl: 'testImageUrl',
          imageName: 'testImageName',
          imageSize: 1024,
        },
      ];

      jest
        .spyOn(repository, 'createJournalAndOcrInPrisma')
        .mockRejectedValue(new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR));

      await expect(
        module.createJournalsAndOcrFromAichResults(companyId, mockAichReturn)
      ).rejects.toThrow(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    });
  });

  describe('handlePostRequest', () => {
    it('should return resultJson', async () => {
      const companyId = '1';
      const resultId = 'testResultId';
      const mockFields = mock<formidable.Fields>();
      const mockFiles: MockProxy<formidable.Files<'image'>> = {
        image: [
          {
            filepath: '/test.png',
            originalFilename: 'test.png',
            mimetype: 'image/png',
            hashAlgorithm: 'sha1',
            newFilename: 'test.png',
            size: 1024,
            toJSON: jest.fn(),
          },
        ],
      };

      const mockAichReturn = [
        {
          resultStatus: {
            resultId,
            status: ProgressStatus.SUCCESS,
          },
          imageUrl: 'testImageUrl',
          imageName: 'testImageName',
          imageSize: 1024,
        },
      ];

      const mockResult: IAccountResultStatus[] = [
        {
          resultId,
          status: ProgressStatus.SUCCESS,
        },
      ];

      const mockReturn = {
        powerby: 'ISunFa',
        success: true,
        code: '201',
        message: 'Success',
        payload: mockResult,
      };

      jest.mock('./index', () => {
        return {
          postImageToAICH: jest.fn().mockResolvedValue(mockAichReturn),
          isCompanyIdValid: jest.fn().mockReturnValue(true),
          getImageFileFromFormData: jest.fn().mockResolvedValue(mockFiles),
          createJournalsAndOcrFromAichResults: jest.fn().mockResolvedValue(mockResult),
        };
      });

      req.query.companyId = companyId;

      jest.spyOn(parseImageForm, 'parseForm').mockResolvedValue({
        fields: mockFields,
        files: mockFiles,
      });

      // Depreciate ( 20240605 - Murky ) - This is not necessary
      jest
        .spyOn(common, 'formatApiResponse')
        .mockReturnValue({ httpCode: 201, result: mockReturn });
      jest.spyOn(common, 'timestampInSeconds').mockReturnValue(1);
      jest.spyOn(common, 'transformOCRImageIDToURL').mockReturnValue('testImageUrl');
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from('test'));

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ payload: 'testPayload' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await module.handlePostRequest(req, res);

      expect(repository.createJournalAndOcrInPrisma).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);

      // ToDo: (20240521 - Murky) 這邊應概要去檢查 res 回傳的內容是否正確
      // 然而因為測試檔的res不是function, 暫時用toHaveBeenCalledWith代替
      expect(res.json).toHaveBeenCalledWith(mockReturn);
    });
  });
});
