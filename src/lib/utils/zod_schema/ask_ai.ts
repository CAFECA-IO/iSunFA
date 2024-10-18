import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

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

const askAIPostBodyValidatorV2 = z.object({
  content: z.string().optional(),
  fileId: z.number().optional(),
  certificateId: z.number().optional(),
});

export const askAIPostValidatorV2: IZodValidator<
  (typeof askAIPostQueryValidatorV2)['shape'],
  (typeof askAIPostBodyValidatorV2)['shape']
> = {
  query: askAIPostQueryValidatorV2,
  body: askAIPostBodyValidatorV2,
};

const askAIGetResultQueryValidatorV2 = z.object({
  resultId: zodStringToNumber,
  reason: z.enum(['help', 'certificate', 'voucher']),
});

const askAIGetResultBodyValidatorV2 = z.object({});

export const askAIGetResultValidatorV2: IZodValidator<
  (typeof askAIGetResultQueryValidatorV2)['shape'],
  (typeof askAIGetResultBodyValidatorV2)['shape']
> = {
  query: askAIGetResultQueryValidatorV2,
  body: askAIGetResultBodyValidatorV2,
};
