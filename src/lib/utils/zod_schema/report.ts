import { z } from 'zod';
import { IZodValidator } from '@/interfaces/zod_validator';
import {
  nullSchema,
  zodStringToNumber,
  zodTimestampInSecondsNoDefault,
} from '@/lib/utils/zod_schema/common';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { ReportSheetType, ReportType } from '@/constants/report';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { getTimestampNow, getTimestampOfLastSecondOfDate } from '@/lib/utils/common';

const reportGetQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
  startDate: zodTimestampInSecondsNoDefault(),
  endDate: zodTimestampInSecondsNoDefault(),
  language: z.string(),
  reportType: z.nativeEnum(FinancialReportTypesKey),
});

const reportPostQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
});

const reportGetBodyValidatorV2 = z.object({});

export const reportGetValidatorV2: IZodValidator<
  (typeof reportGetQueryValidatorV2)['shape'],
  (typeof reportGetBodyValidatorV2)['shape']
> = {
  query: reportGetQueryValidatorV2,
  body: reportGetBodyValidatorV2,
};

/**
 * Info: (20250502 - Shirley) New schema format for report GET endpoint
 * Following the standard schema structure with input, outputSchema, and frontend
 */
export const reportGetSchemaV2 = {
  input: {
    querySchema: reportGetQueryValidatorV2,
    bodySchema: nullSchema,
  },
  outputSchema: z.object({}).passthrough(), // Using passthrough as the report structure is complex
  frontend: z.object({}).passthrough(),
};

export const reportRequestValidatorsV2: {
  [method: string]: IZodValidator<z.ZodRawShape, z.ZodRawShape>;
} = {
  GET_ONE: reportGetValidatorV2,
};

const generatePublicReportBodySchemaV2 = z.object({
  projectId: z
    .number()
    .optional()
    .transform((val) => {
      if (!val) {
        return null;
      }
      return val;
    }),
  type: z
    .nativeEnum(ReportSheetType)
    .optional()
    .transform((val) => {
      return val || ReportSheetType.BALANCE_SHEET;
    }),

  reportLanguage: z
    .nativeEnum(ReportLanguagesKey)
    .optional()
    .transform((val) => {
      if (!val) {
        return ReportLanguagesKey.tw;
      }
      return val;
    }),
  from: z
    .number()
    .optional()
    .transform((val) => {
      if (!val) {
        return 0;
      }
      return val;
    }),
  to: z
    .number()
    .optional()
    .transform((val) => {
      if (!val) {
        return getTimestampOfLastSecondOfDate(getTimestampNow());
      }
      return val;
    }),
  reportType: z.nativeEnum(ReportType),
});

export const generatePublicReportSchemaV2 = {
  input: {
    querySchema: reportPostQueryValidatorV2,
    bodySchema: generatePublicReportBodySchemaV2,
  },
  outputSchema: z.number().nullable(),
  frontend: z.number().nullable(),
};

const getPublicReportQuerySchemaV2 = z.object({
  reportId: zodStringToNumber,
});

export const getPublicReportSchemaV2 = {
  input: {
    querySchema: getPublicReportQuerySchemaV2,
    bodySchema: nullSchema,
  },
  outputSchema: z.any(),
  frontend: z.any(),
};
