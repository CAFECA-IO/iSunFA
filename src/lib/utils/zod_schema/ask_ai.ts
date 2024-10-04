import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';

const askAIPostQueryValidatorV2 = z.object({
  reason: z.enum(['help', 'certificate', 'voucher']),
});

export const helpValidator = z.object({
  content: z.string(),
});

export const certificateValidator = z.object({
  fileId: z.number(),
});

export const voucherValidator = z.object({
  certificateId: z.number(),
});

const askAIPostBodyValidatorV2 = z.object({});

export const askAIPostValidatorV2: IZodValidator<
  (typeof askAIPostQueryValidatorV2)['shape'],
  (typeof askAIPostBodyValidatorV2)['shape']
> = {
  query: askAIPostQueryValidatorV2,
  body: askAIPostBodyValidatorV2,
};
