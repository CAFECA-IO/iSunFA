import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import {
  zodFilterSectionSortingOptions,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_END_DATE, DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { InvoiceTabs } from '@/constants/invoice_rc2'; // Info: (20241023 - tzuhan) @Murky, 這裡要改成 SORT_BY （已經定義好）
import { IFileBetaValidator } from '@/lib/utils/zod_schema/file';
import {
  IInvoiceBetaValidator,
  IInvoiceBetaValidatorOptional,
} from '@/lib/utils/zod_schema/invoice';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { CounterpartyType } from '@/constants/counterparty';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

const nullSchema = z.union([z.object({}), z.string()]);

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 ICertificate
 */
export const createCertificateValidator = (isInvoiceOptional = false) =>
  z.object({
    id: z.number(),
    name: z.string().describe('Name of certificate, but get it from Invoice'),
    companyId: z.number(),
    incomplete: z.boolean(),
    unRead: z.boolean().default(false),
    file: IFileBetaValidator,
    invoice: isInvoiceOptional ? IInvoiceBetaValidatorOptional : IInvoiceBetaValidator,
    voucherNo: z.string().nullable(),
    voucherId: z.number().nullable(),
    aiResultId: z.string().optional(),
    aiStatus: z.string().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    uploader: z.string(),
    uploaderUrl: z.string(),
  });

export const ICertificateValidator = createCertificateValidator(false);
export const ICertificatePartialInvoiceValidator = createCertificateValidator(true);
/**
 * Info: (20241025 - Murky)
 * @description schema for init certificate entity or parsed prisma certificate
 * @todo file, invoice, company, vouchers should be implemented
 */
export const certificateEntityValidator = z.object({
  id: z.number(),
  accountBookId: z.number(),
  // voucherNo: z.string().nullable(),
  aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  file: z.any().optional(),
  invoice: z.any().optional(),
  company: z.any().optional(),
  vouchers: z.array(z.any()).optional(),
  uploader: z.any().optional(),
  uploaderUrl: z.any().optional(),
});

const certificateListQueryValidator = z.object({
  accountBookId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  tab: z.nativeEnum(InvoiceTabs).optional(),
  type: z
    .nativeEnum(InvoiceType)
    .optional()
    .transform((data) => {
      const result = data ? (data === InvoiceType.ALL ? undefined : data) : undefined;
      return result;
    }), // Info: (20241107 - Murky) @tzuhan, type 使用 InvoiceType, 如果要選擇全部可以填 undefined
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(DEFAULT_END_DATE),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
});

export const certificateRC2ListQueryValidator = paginatedDataQuerySchema.extend({
  accountBookId: zodStringToNumber,
  tab: z.nativeEnum(InvoiceTabs).optional(),
  type: z
    .nativeEnum(InvoiceType)
    .optional()
    .transform((data) => {
      const result = data ? (data === InvoiceType.ALL ? undefined : data) : undefined;
      return result;
    }), // Info: (20241107 - Murky) @tzuhan, type 使用 InvoiceType, 如果要選擇全部可以填 undefined
  isDeleted: z.boolean().default(false),
});

const certificateListBodyValidator = z.object({});

const paginatedCertificates = paginatedDataSchema(ICertificatePartialInvoiceValidator);

const certificateListFrontendSchema = paginatedCertificates;

const certificateListOutputSchema = paginatedCertificates;

export const certificateListValidator: IZodValidator<
  (typeof certificateListQueryValidator)['shape'],
  (typeof certificateListBodyValidator)['shape']
> = {
  query: certificateListQueryValidator,
  body: certificateListBodyValidator,
};

const certificateGetOneQueryValidator = z.object({
  certificateId: zodStringToNumber,
});

const certificateGetOneBodyValidator = z.object({});

const certificateGetOneOutputSchema = z.union([
  ICertificatePartialInvoiceValidator.passthrough(),
  z.null(),
]);

const certificateGetOneFrontendSchema = ICertificatePartialInvoiceValidator.passthrough();

export const certificateGetOneValidator: IZodValidator<
  (typeof certificateGetOneQueryValidator)['shape'],
  (typeof certificateGetOneBodyValidator)['shape']
> = {
  query: certificateGetOneQueryValidator,
  body: certificateGetOneBodyValidator,
};

const certificatePostQueryValidator = z.object({
  accountBookId: zodStringToNumber,
});

/**
 * Info: (20241107 - Murky)
 * @note company 從session取得
 */
const certificatePostBodyValidator = z.object({
  fileIds: z.array(z.number()),
});

const certificatePostOutputSchema = z.array(ICertificatePartialInvoiceValidator.passthrough());

const certificatePostFrontendSchema = z.array(ICertificatePartialInvoiceValidator.passthrough());

export const certificatePostValidator: IZodValidator<
  (typeof certificatePostQueryValidator)['shape'],
  (typeof certificatePostBodyValidator)['shape']
> = {
  query: certificatePostQueryValidator,
  body: certificatePostBodyValidator,
};

const certificatePutQueryValidator = z.object({
  certificateId: zodStringToNumber,
});

export const certificatePutValidator: IZodValidator<
  (typeof certificatePutQueryValidator)['shape'],
  (typeof certificatePostBodyValidator)['shape']
> = {
  query: certificatePutQueryValidator,
  body: certificatePostBodyValidator,
};

const certificateDeleteQueryValidator = z.object({
  accountBookId: zodStringToNumber,
});

const certificateDeleteBodyValidator = z.object({});

export const certificateDeleteValidator: IZodValidator<
  (typeof certificateDeleteQueryValidator)['shape'],
  (typeof certificateDeleteBodyValidator)['shape']
> = {
  query: certificateDeleteQueryValidator,
  body: certificateDeleteBodyValidator,
};

export const certificateRequestValidators: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  GET_ONE: certificateGetOneValidator,
  PUT: certificatePutValidator,
  POST: certificatePostValidator,
  DELETE: certificateDeleteValidator,
  GET_LIST: certificateListValidator,
};

// Info: (20241107 - Murky) Below is Schema for zod_schema_ai

export const certificateListSchema = {
  input: {
    querySchema: certificateListQueryValidator,
    bodySchema: nullSchema,
  },
  outputSchema: certificateListOutputSchema,
  frontend: certificateListFrontendSchema,
};

export const certificatePostSchema = {
  input: {
    querySchema: certificatePostQueryValidator,
    bodySchema: certificatePostBodyValidator,
  },
  outputSchema: certificatePostOutputSchema,
  frontend: certificatePostFrontendSchema,
};

export const certificateGetOneSchema = {
  input: {
    querySchema: certificateGetOneQueryValidator,
    bodySchema: nullSchema,
  },
  outputSchema: certificateGetOneOutputSchema,
  frontend: certificateGetOneFrontendSchema,
};

export const certificateMultiDeleteSchema = {
  input: {
    querySchema: certificateDeleteQueryValidator,
    bodySchema: z.object({
      certificateIds: z.array(z.number()),
    }),
  },
  outputSchema: z.array(z.number()),
  frontend: z.array(z.number()),
};

/**
 * Info: (20241125 - Murky)
 * @note 因為放在invoice 會有dependency cycle, 所以放在這裡
 */
const invoicePutV2QuerySchema = z.object({
  invoiceId: zodStringToNumber,
  certificateId: zodStringToNumber,
});

const invoicePutV2BodySchema = z.object({
  // Info: (20241220 - Murky) 如果沒有id 的話，就會自動創一個新的counterParty
  counterParty: z
    .object({
      id: z.number().optional(),
      name: z.string(),
      taxId: z
        .string()
        .optional()
        .transform((data) => {
          const result = data || '';
          return result;
        }),
      note: z.string().optional(),
      type: z
        .nativeEnum(CounterpartyType)
        .optional()
        .transform((type) => {
          const result = type || CounterpartyType.SUPPLIER;
          return result;
        }),
    })
    .optional(),
  inputOrOutput: z.nativeEnum(InvoiceTransactionDirection).optional(),
  date: z.number().optional(),
  no: z.string().optional(),
  currencyAlias: z.nativeEnum(CurrencyType).optional(),
  priceBeforeTax: z.number().optional(),
  taxType: z.nativeEnum(InvoiceTaxType).optional(),
  taxRatio: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  taxPrice: z.number().optional(),
  totalPrice: z.number().optional(),
  type: z.nativeEnum(InvoiceType).optional(),
  deductible: z.boolean().optional(),
});

export const invoicePutV2Schema = {
  input: {
    querySchema: invoicePutV2QuerySchema,
    bodySchema: invoicePutV2BodySchema,
  },
  outputSchema: ICertificateValidator.strip(),
  frontend: ICertificateValidator,
};

const invoicePostV2QuerySchema = z.object({
  certificateId: zodStringToNumber,
});

export const invoicePostV2BodySchema = z.object({
  counterParty: z.object({
    id: z.number().optional(),
    name: z.string(),
    taxId: z
      .string()
      .optional()
      .transform((data) => {
        const result = data || '';
        return result;
      }),
    note: z.string().optional(),
    type: z
      .nativeEnum(CounterpartyType)
      .optional()
      .transform((type) => {
        const result = type || CounterpartyType.SUPPLIER;
        return result;
      }),
  }),
  inputOrOutput: z.nativeEnum(InvoiceTransactionDirection),
  date: z.number(),
  no: z
    .string()
    .optional()
    .transform((data) => data || ''),
  // currencyAlias: z.nativeEnum(CurrencyType),
  priceBeforeTax: z.number(),
  // taxType: z.nativeEnum(InvoiceTaxType),
  taxRatio: z
    .number()
    .nullable()
    .optional()
    .transform((v) => v ?? 0),
  taxPrice: z.number(),
  totalPrice: z.number(),
  type: z.nativeEnum(InvoiceType),
  deductible: z
    .boolean()
    .optional()
    .transform((data) => !!data),
});

export const invoicePostV2Schema = {
  input: {
    querySchema: invoicePostV2QuerySchema,
    bodySchema: invoicePostV2BodySchema,
  },
  outputSchema: ICertificateValidator.strip(),
  frontend: ICertificateValidator,
};
