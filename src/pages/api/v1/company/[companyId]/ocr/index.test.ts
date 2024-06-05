import * as module from '@/pages/api/v1/company/[companyId]/ocr/index';
import formidable from 'formidable';
import { MockProxy, mock } from 'jest-mock-extended';
import fs from 'fs';
import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/client';

// jest.mock('fs', () => ({
//   promises: {
//     readFile: jest.fn(),
//   },
// }));

// jest.mock('./index', () => {
//   return {
//     __esModule: true, //   Info: (20240524 Murky) <----- this __esModule: true is important
//     ...jest.requireActual('./index'),
//   };
// });

// jest.mock('@prisma/client', () => {
//   return {
//     __esModule: true,
//     PrismaClient: jest.fn(),
//   };
// });

global.fetch = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
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
      expect(imageFile).toBeInstanceOf(File);
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
  describe("getPayloadFromResponseJSON", () => {
    it("should return payload", async () => {
      const mockResponse:{
        payload?: unknown;
      } = { payload: 'testPayload' };
      const promiseJson: Promise<{ payload?: unknown; } | null> = new Promise((resolve) => {
        resolve(mockResponse);
      });

      const payload = await module.getPayloadFromResponseJSON(promiseJson);
      expect(payload).toEqual('testPayload');
    });

    it("should throw error when responseJSON is null", async () => {
      const promiseJson: Promise<{ payload?: unknown; } | null> = new Promise((resolve) => {
        resolve(null);
      });

      await expect(module.getPayloadFromResponseJSON(promiseJson)).rejects.toThrow(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
    });
  });

  describe("postImageToAICH", () => {
    let mockImages: MockProxy<formidable.Files<"image">>;
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

      // help me mock formidable.Files<"image">

      mockImages = mock<formidable.Files<"image">>(
        {
          image: [mockImage],
        }
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should throw error when images is empty", async () => {
      mockImages = mock<formidable.Files<"image">>(
        {
          image: [],
        }
      );
      await expect(module.postImageToAICH(mockImages)).rejects.toThrow(STATUS_MESSAGE.INVALID_INPUT_FORM_DATA_IMAGE);
    });

    it("should return resultJson", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ payload: 'testPayload' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const resultJson = await module.postImageToAICH(mockImages);

      const resultJsonExpect = expect.arrayContaining([
        expect.objectContaining({
          resultStatus: expect.any(String),
          imageUrl: expect.any(String),
          imageName: expect.any(String),
          imageSize: expect.any(Number),
        }),
      ]);

      expect(resultJson).toEqual(resultJsonExpect);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ocr/upload'),
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
    });
  });

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
});
