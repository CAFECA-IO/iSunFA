import { ocrTypes } from '@/constants/ocr';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';

const ocrListQueryValidator = z.object({
  ocrType: z.nativeEnum(ocrTypes).or(z.undefined()),
});

const ocrListBodyValidator = z.object({});

export const ocrListValidator: IZodValidator<
  (typeof ocrListQueryValidator)['shape'],
  (typeof ocrListBodyValidator)['shape']
> = {
  // Info: (20240911 - Murky) GET /ocr
  query: ocrListQueryValidator,
  body: ocrListBodyValidator,
};

const ocrUploadQueryValidator = z.object({});
const ocrUploadBodyValidator = z.object({
  fileId: z.number(),
  uploadIdentifier: z.string(),
});

export const ocrUploadValidator: IZodValidator<
  (typeof ocrUploadQueryValidator)['shape'],
  (typeof ocrUploadBodyValidator)['shape']
> = {
  // Info: (20240911 - Murky) POST /ocr
  query: ocrUploadQueryValidator,
  body: ocrUploadBodyValidator,
};
