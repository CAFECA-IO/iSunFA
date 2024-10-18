import { ocrTypes } from '@/constants/ocr';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';

const ocrListQueryValidator = z.object({
  ocrType: z.nativeEnum(ocrTypes).or(z.undefined()),
});

const ocrListBodyValidator = z.undefined();

export const ocrListValidator: IZodValidator<(typeof ocrListQueryValidator)['shape']> = {
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

const ocrResultGetByIdQueryValidator = z.object({
  resultId: z.string(),
  ocrType: z.nativeEnum(ocrTypes).or(z.undefined()),
});

const ocrResultGetByIdBodyValidator = z.undefined();

export const ocrResultGetByIdValidator: IZodValidator<
  (typeof ocrResultGetByIdQueryValidator)['shape']
> = {
  query: ocrResultGetByIdQueryValidator,
  body: ocrResultGetByIdBodyValidator,
};

const ocrDeleteQueryValidator = z.object({
  resultId: z.string(),
});

const ocrDeleteBodyValidator = z.object({});

export const ocrDeleteValidator: IZodValidator<
  (typeof ocrDeleteQueryValidator)['shape'],
  (typeof ocrDeleteBodyValidator)['shape']
> = {
  query: ocrDeleteQueryValidator,
  body: ocrDeleteBodyValidator,
};
