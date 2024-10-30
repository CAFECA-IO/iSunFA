import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import { zodTimestampInSecondsNoDefault } from '@/lib/utils/zod_schema/common';
import { FinancialReportTypesKey } from '@/interfaces/report_type';

const reportGetQueryValidatorV2 = z.object({
  startDate: zodTimestampInSecondsNoDefault(),
  endDate: zodTimestampInSecondsNoDefault(),
  language: z.string(),
  reportType: z.nativeEnum(FinancialReportTypesKey),
});

const reportGetBodyValidatorV2 = z.object({});

export const reportGetValidatorV2: IZodValidator<
  (typeof reportGetQueryValidatorV2)['shape'],
  (typeof reportGetBodyValidatorV2)['shape']
> = {
  query: reportGetQueryValidatorV2,
  body: reportGetBodyValidatorV2,
};

export const reportRequestValidatorsV2: {
  [method: string]: IZodValidator<z.ZodRawShape, z.ZodRawShape>;
} = {
  GET_ONE: reportGetValidatorV2,
};
