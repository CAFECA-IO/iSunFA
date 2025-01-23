import { ocrTypes } from '@/constants/ocr';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';

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

const ocrResultGetOneQueryValidator = z.object({
  resultId: z.string(),
  ocrType: z.nativeEnum(ocrTypes).or(z.undefined()),
});

const ocrResultGetOneBodyValidator = z.object({});

export const ocrResultGetOneValidator: IZodValidator<
  (typeof ocrResultGetOneQueryValidator)['shape'],
  (typeof ocrResultGetOneBodyValidator)['shape']
> = {
  query: ocrResultGetOneQueryValidator,
  body: ocrResultGetOneBodyValidator,
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

export const ocrRequestValidators: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  GET_LIST: ocrListValidator,
  POST: ocrUploadValidator,
  GET_ONE: ocrResultGetOneValidator,
  DELETE: ocrDeleteValidator,
};
