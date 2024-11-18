import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import {
  zodFilterSectionSortingOptions,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { InvoiceTabs } from '@/constants/certificate'; // Info: (20241023 - tzuhan) @Murky, 這裡要改成 SORT_BY （已經定義好）
import { fileEntityValidator, IFileBetaValidator } from '@/lib/utils/zod_schema/file';
import { IInvoiceBetaValidator, invoiceEntityValidator } from '@/lib/utils/zod_schema/invoice';
import { InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { counterPartyEntityValidator } from '@/constants/counterparty';
import { paginatedDataSchemaDataNotArray } from '@/lib/utils/zod_schema/pagination';
import { userEntityValidator } from '@/lib/utils/zod_schema/user';
import { ICertificate } from '@/interfaces/certificate';
import { userCertificateEntityValidator } from './user_certificate';

const nullSchema = z.union([z.object({}), z.string()]);

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 ICertificate
 */
export const ICertificateValidator = z.object({
  id: z.number(),
  name: z.string().describe('Name of certificate, but get it from Invoice'),
  companyId: z.number(),
  unRead: z.boolean(),
  file: IFileBetaValidator, // Info: (20241105 - Murky) 使用已定義的 IFileUIBetaValidator
  invoice: IInvoiceBetaValidator, // Info: (20241105 - Murky) 使用已定義的 IInvoiceBetaValidator
  voucherNo: z.string().nullable(),
  aiResultId: z.string().optional(),
  aiStatus: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  uploader: z.string(),
});

/**
 * Info: (20241025 - Murky)
 * @description schema for init certificate entity or parsed prisma certificate
 * @todo file, invoice, company, vouchers should be implemented
 */
export const certificateEntityValidator = z.object({
  id: z.number(),
  companyId: z.number(),
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
  userCertificates: z.array(z.any()).optional(),
});

const certificateListQueryValidator = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  tab: z.nativeEnum(InvoiceTabs),
  type: z.nativeEnum(InvoiceType).optional(), // Info: (20241107 - Murky) @tzuhan, type 使用 InvoiceType, 如果要選擇全部可以填 undefined
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(Infinity),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
});

const certificateListBodyValidator = z.object({});

const certificateListFrontendSchema = paginatedDataSchemaDataNotArray(
  z.object({
    totalInvoicePrice: z.number(),
    unRead: z.object({
      withVoucher: z.number(),
      withoutVoucher: z.number(),
    }),
    currency: z.nativeEnum(CurrencyType),
    certificates: z.array(ICertificateValidator),
  })
).strict();

const certificateListOutputSchema = paginatedDataSchemaDataNotArray(
  z.object({
    totalInvoicePrice: z.number(),
    unRead: z.object({
      withVoucher: z.number(),
      withoutVoucher: z.number(),
    }),
    currency: z.nativeEnum(CurrencyType),
    certificates: z.array(
      z.object({
        ...certificateEntityValidator.shape,
        invoice: z.object({
          ...invoiceEntityValidator.shape,
          counterParty: counterPartyEntityValidator,
        }),
        file: fileEntityValidator,
        uploader: userEntityValidator,
        userCertificates: z.array(userCertificateEntityValidator),
      })
    ),
  })
).transform((item) => {
  const certificateListData: z.infer<typeof certificateListFrontendSchema> = {
    ...item,
    data: {
      ...item.data,
      certificates: item.data.certificates.map((certificate) => {
        const isRead = certificate.userCertificates.some(
          (userCertificate) => userCertificate.isRead
        );
        return {
          id: certificate.id,
          unRead: !isRead,
          companyId: certificate.companyId,
          voucherNo: null,
          name: 'certificate', // Info: (20241105 - Murky) certificate.invoice.name,
          uploader: certificate.uploader.name,
          aiStatus: certificate.aiStatus,
          invoice: {
            id: certificate.invoice.id,
            isComplete: true,
            inputOrOutput: certificate.invoice.inputOrOutput,
            date: certificate.invoice.date,
            no: certificate.invoice.no,
            currencyAlias: certificate.invoice.currencyAlias,
            priceBeforeTax: certificate.invoice.priceBeforeTax,
            taxType: certificate.invoice.taxType,
            taxRatio: certificate.invoice.taxRatio,
            taxPrice: certificate.invoice.taxPrice,
            totalPrice: certificate.invoice.totalPrice,
            type: certificate.invoice.type,
            deductible: certificate.invoice.deductible,
            counterPartyId: certificate.invoice.counterPartyId,
            createdAt: certificate.invoice.createdAt,
            updatedAt: certificate.invoice.updatedAt,
            name: 'InvoiceName', // ToDo: (20241105 - Murky) DB 沒有這個欄位, 等待db更新
            uploader: certificate.uploader.name,
            counterParty: {
              id: certificate.invoice.counterParty.id,
              companyId: certificate.invoice.counterParty.companyId,
              name: certificate.invoice.counterParty.name,
              taxId: certificate.invoice.counterParty.taxId,
              type: certificate.invoice.counterParty.type,
              note: certificate.invoice.counterParty.note,
              createdAt: certificate.invoice.counterParty.createdAt,
              updatedAt: certificate.invoice.counterParty.updatedAt,
            },
          },
          file: {
            id: certificate.file.id,
            name: certificate.file.name,
            url: certificate.file.url,
            size: certificate.file.size,
            existed: !!certificate.file,
          },
          createdAt: certificate.createdAt,
          updatedAt: certificate.updatedAt,
          deletedAt: certificate.deletedAt,
        };
      }),
    },
  };

  const certificateList = certificateListFrontendSchema.parse(certificateListData);
  return certificateList;
});

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

const certificateGetOneOutputSchema = z
  .object({
    ...certificateEntityValidator.shape,
    invoice: z.object({
      ...invoiceEntityValidator.shape,
      counterParty: counterPartyEntityValidator,
    }),
    file: fileEntityValidator,
    uploader: userEntityValidator,
    userCertificates: z.array(userCertificateEntityValidator),
  })
  .transform((certificate) => {
    const isRead = certificate.userCertificates.some((userCertificate) => userCertificate.isRead);
    const certificateInstance: ICertificate = {
      id: certificate.id,
      unRead: !isRead,
      companyId: certificate.companyId,
      voucherNo: null, // certificate.voucherNo,
      name: 'certificate', // Info: (20241108 - Murky) certificate.invoice.name,
      uploader: certificate.uploader.name,
      aiStatus: certificate.aiStatus,
      invoice: {
        id: certificate.invoice.id,
        isComplete: true,
        inputOrOutput: certificate.invoice.inputOrOutput,
        date: certificate.invoice.date,
        no: certificate.invoice.no,
        currencyAlias: certificate.invoice.currencyAlias,
        priceBeforeTax: certificate.invoice.priceBeforeTax,
        taxType: certificate.invoice.taxType,
        taxRatio: certificate.invoice.taxRatio,
        taxPrice: certificate.invoice.taxPrice,
        totalPrice: certificate.invoice.totalPrice,
        type: certificate.invoice.type,
        deductible: certificate.invoice.deductible,
        createdAt: certificate.invoice.createdAt,
        updatedAt: certificate.invoice.updatedAt,
        // name: 'InvoiceName', // ToDo: (20241105 - Murky) DB 沒有這個欄位, 等待db更新
        // uploader: certificate.uploader.name,
        counterParty: {
          id: certificate.invoice.counterParty.id,
          companyId: certificate.invoice.counterParty.companyId,
          name: certificate.invoice.counterParty.name,
          taxId: certificate.invoice.counterParty.taxId,
          type: certificate.invoice.counterParty.type,
          note: certificate.invoice.counterParty.note,
          createdAt: certificate.invoice.counterParty.createdAt,
          updatedAt: certificate.invoice.counterParty.updatedAt,
        },
      },
      file: {
        id: certificate.file.id,
        name: certificate.file.name,
        url: certificate.file.url,
        size: certificate.file.size,
        existed: !!certificate.file,
      },
      createdAt: certificate.createdAt,
      updatedAt: certificate.updatedAt,
    };
    return certificateInstance;
  });

const certificateGetOneFrontendSchema = ICertificateValidator.strict();

export const certificateGetOneValidator: IZodValidator<
  (typeof certificateGetOneQueryValidator)['shape'],
  (typeof certificateGetOneBodyValidator)['shape']
> = {
  query: certificateGetOneQueryValidator,
  body: certificateGetOneBodyValidator,
};

const certificatePostQueryValidator = z.object({
  companyId: zodStringToNumber,
});

/**
 * Info: (20241107 - Murky)
 * @note company 從session取得
 */
const certificatePostBodyValidator = z.object({
  fileId: z.number(),
});

const certificatePostOutputSchema = z.object({
  ...certificateEntityValidator.shape,
  file: fileEntityValidator,
});

const certificatePostFrontendSchema = z.object({
  ...certificateEntityValidator.shape,
  file: fileEntityValidator,
});

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
  certificateId: zodStringToNumber,
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
