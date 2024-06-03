import * as module from '@/pages/api/v1/company/[companyId]/ocr/index';
import formidable from 'formidable';
import { MockProxy, mock } from 'jest-mock-extended';
import { promises as fs } from 'fs';
import { STATUS_MESSAGE } from '@/constants/status_code';

jest.mock('./index', () => {
  return {
    __esModule: true, //   Info: (20240524 Murky) <----- this __esModule: true is important
    ...jest.requireActual('./index'),
  };
});

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('@prisma/client', () => {
  return {
    __esModule: true,
    PrismaClient: jest.fn(),
  };
});

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
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);
    });
    it('should return Blob', async () => {
      const blob = await module.readImageFromFilePath(mockImage);
      expect(fs.readFile).toHaveBeenCalledWith(mockPath);
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
  // describe("_getPayloadFromResponseJSON", () => {
  //   it("should return payload", async () => {
  //     const mockResponse = { payload: 'testPayload' };
  //     const promiseJson = jest.fn().mockResolvedValue(mockResponse);

  //     // const payload = await module._getPayloadFromResponseJSON(promiseJson);
  //     expect(payload).toEqual('testPayload');
  //   })
  // })
});
