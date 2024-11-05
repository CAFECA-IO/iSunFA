import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import { iLineItemBodyValidatorV2, iLineItemValidator } from '@/lib/utils/zod_schema/lineItem';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { EventType } from '@/constants/account';
import { SortBy, SortOrder } from '@/constants/sort';
import { recurringEventForVoucherPostValidatorV2 } from '@/lib/utils/zod_schema/recurring_event';
import { JOURNAL_EVENT } from '@/constants/journal';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { counterPartyEntityValidator } from '@/constants/counterparty';
import { userEntityValidator } from '@/lib/utils/zod_schema/user';
import { userVoucherEntityValidator } from '@/lib/utils/zod_schema/user_voucher';
import { IPaginatedData } from '@/interfaces/pagination';
import { IVoucherBeta } from '@/interfaces/voucher';
import { eventTypeToVoucherType } from '@/lib/utils/common';
import { fileEntityValidator } from '@/lib/utils/zod_schema/file';
import { accountEntityValidator } from '@/lib/utils/zod_schema/account';
import { paginatedDataSchemaDataNotArray } from '@/lib/utils/zod_schema/pagination';

/**
 * Info: (20241025 - Murky)
 * @description schema for init voucher entity or parsed prisma voucher
 * @todo originalEvents, resultEvents, lineItems, certificates, issuer, readByUsers need to be implement
 */
export const voucherEntityValidator = z.object({
  id: z.number(),
  issuerId: z.number(),
  counterPartyId: z.number(),
  companyId: z.number(),
  status: z.nativeEnum(JOURNAL_EVENT),
  editable: z.boolean(),
  no: z.string(),
  date: z.number(),
  type: z.nativeEnum(EventType),
  note: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  originalEvents: z.array(z.any()).optional(),
  resultEvents: z.array(z.any()).optional(),
  lineItems: z.array(z.any()).optional(),
  aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  certificates: z.array(z.any()).optional(),
  issuer: z.any().optional(),
  readByUsers: z.array(z.any()).optional(),
});

const iVoucherValidator = z.object({
  journalId: z.number(),
  lineItems: z.array(iLineItemValidator),
});

const voucherCreateQueryValidator = z.object({});
const voucherCreateBodyValidator = z.object({
  voucher: iVoucherValidator,
});

export const voucherCreateValidator: IZodValidator<
  (typeof voucherCreateQueryValidator)['shape'],
  (typeof voucherCreateBodyValidator)['shape']
> = {
  query: voucherCreateQueryValidator,
  body: voucherCreateBodyValidator,
};

const voucherUpdateQueryValidator = z.object({
  voucherId: zodStringToNumber,
});

export const voucherUpdateValidator: IZodValidator<
  (typeof voucherUpdateQueryValidator)['shape'],
  (typeof voucherCreateBodyValidator)['shape']
> = {
  query: voucherUpdateQueryValidator,
  body: voucherCreateBodyValidator,
};

export const voucherRequestValidatorsV1: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  POST: voucherCreateValidator,
  PUT: voucherUpdateValidator,
};

/**
 * ************************************************
 * Info: (20240927 - Murky)
 * V2 validator below
 * ************************************************
 */

/**
 * Info: (20241104 - Murky)
 * @description voucher list all filter section 可以用哪些值排序
 */
export type VoucherListAllSortOptions = z.infer<typeof voucherListAllSortOptions>;

const voucherListAllSortOptions = z.enum([
  SortBy.DATE,
  SortBy.CREDIT,
  SortBy.DEBIT,
  SortBy.PERIOD,
  SortBy.PAY_RECEIVE_TOTAL,
  SortBy.PAY_RECEIVE_ALREADY_HAPPENED,
  SortBy.PAY_RECEIVE_REMAIN,
]);

// Info: (20240927 - Murky) GET all v2 validator
// Info: (20241104 - Murky) 不需要status, 因為status和tab重複, 都是upcoming, uploaded
const voucherGetAllQueryValidatorV2 = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  type: z.nativeEnum(EventType).optional(),
  tab: z.nativeEnum(VoucherListTabV2),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(Infinity),
  searchQuery: z.string().optional(),
});

const voucherGetAllBodyValidatorV2 = z.object({
  sortOption: z
    .record(
      voucherListAllSortOptions,
      z.object({
        by: voucherListAllSortOptions,
        order: z.nativeEnum(SortOrder),
      })
    )
    .optional(),
});

const voucherGetAllOutputValidatorV2 = paginatedDataSchemaDataNotArray(
  z.object({
    vouchers: z.array(
      z.object({
        ...voucherEntityValidator.shape,
        counterParty: counterPartyEntityValidator,
        issuer: z.object({
          ...userEntityValidator.shape,
          imageFile: fileEntityValidator,
        }),
        readByUsers: z.array(userVoucherEntityValidator),
        lineItems: z.array(
          z.object({
            ...iLineItemBodyValidatorV2.shape,
            id: z.number(),
            account: accountEntityValidator,
          })
        ),
        sum: z.object({
          debit: z.boolean(),
          amount: z.number(),
        }),
      })
    ),
    unRead: z.object({
      uploadedVoucher: z.number(),
      upcomingEvents: z.number(),
    }),
  })
).transform((data) => {
  const parsedVouchers: IVoucherBeta[] = data.data.vouchers.map((voucher) => ({
    id: voucher.id,
    voucherDate: voucher.date,
    voucherNo: voucher.no,
    voucherType: eventTypeToVoucherType(voucher.type),
    note: voucher.note ?? '',
    counterParty: {
      companyId: z.number().parse(voucher.counterParty.id).toString(),
      name: voucher.counterParty.name,
    },
    issuer: {
      avatar: voucher.issuer.imageFile.url,
      name: voucher.issuer.name,
    },
    unRead: voucher.readByUsers.length === 0,
    lineItemsInfo: {
      lineItems: voucher.lineItems.map((lineItem) => ({
        id: lineItem.id,
        description: lineItem.description,
        debit: lineItem.debit,
        amount: lineItem.amount,
        account: {
          ...lineItem.account,
        },
      })),
      sum: {
        debit: z.boolean().parse(voucher.sum.debit),
        amount: z.number().parse(voucher.sum.amount),
      },
    },
  }));

  const parsedData: IPaginatedData<{
    unRead: {
      uploadedVoucher: number;
      upcomingEvents: number;
    };
    vouchers: IVoucherBeta[];
  }> = {
    page: data.page,
    totalPages: data.totalPages,
    totalCount: data.totalCount,
    pageSize: data.pageSize,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
    sort: data.sort,
    data: {
      unRead: data.data.unRead,
      vouchers: parsedVouchers,
    },
  };
  return parsedData;
});

export const voucherGetAllValidatorV2: IZodValidator<
  (typeof voucherGetAllQueryValidatorV2)['shape'],
  (typeof voucherGetAllBodyValidatorV2)['shape']
> = {
  query: voucherGetAllQueryValidatorV2,
  body: voucherGetAllBodyValidatorV2,
};

// Info: (20240927 - Murky) POST voucher v2 validator
const voucherPostQueryValidatorV2 = z.object({});
const voucherPostBodyValidatorV2 = z.object({
  actions: z.array(z.nativeEnum(VoucherV2Action)),
  certificateIds: z.array(z.number().int()),
  voucherDate: z.number().int(),
  type: z.nativeEnum(EventType),
  note: z.string(),
  lineItems: z.array(iLineItemBodyValidatorV2),
  recurringInfo: recurringEventForVoucherPostValidatorV2.optional(),
  assetIds: z.array(z.number().int()),
  counterPartyId: z.number().int().optional(),
  reverseVouchers: z.array(
    z.object({
      voucherId: z.number().int(),
      lineItemIdBeReversed: z.number().int(),
      lineItemIdReverseOther: z.number().int(),
      amount: z.number(),
    })
  ),
});

export const voucherPostValidatorV2: IZodValidator<
  (typeof voucherPostQueryValidatorV2)['shape'],
  (typeof voucherPostBodyValidatorV2)['shape']
> = {
  query: voucherPostQueryValidatorV2,
  body: voucherPostBodyValidatorV2,
};

// Info: (20240927 - Murky) Post vouchers have been read
const voucherWasReadQueryValidatorV2 = z.object({});
const voucherWasReadBodyValidatorV2 = z.object({
  voucherIds: z.array(z.number().int()),
});

export const voucherWasReadValidatorV2: IZodValidator<
  (typeof voucherWasReadQueryValidatorV2)['shape'],
  (typeof voucherWasReadBodyValidatorV2)['shape']
> = {
  query: voucherWasReadQueryValidatorV2,
  body: voucherWasReadBodyValidatorV2,
};

// Info: (20240927 - Murky) GET One Voucher v2

const voucherGetOneQueryValidatorV2 = z.object({
  voucherId: zodStringToNumber,
});

const voucherGetOneBodyValidatorV2 = z.object({});

export const voucherGetOneValidatorV2: IZodValidator<
  (typeof voucherGetOneQueryValidatorV2)['shape'],
  (typeof voucherGetOneBodyValidatorV2)['shape']
> = {
  query: voucherGetOneQueryValidatorV2,
  body: voucherGetOneBodyValidatorV2,
};

// Info: (20240927 - Murky) PUT voucher v2 (body validator is same as Post)
const voucherPutQueryValidatorV2 = z.object({
  voucherId: zodStringToNumber,
});

export const voucherPutValidatorV2: IZodValidator<
  (typeof voucherPutQueryValidatorV2)['shape'],
  (typeof voucherPostBodyValidatorV2)['shape']
> = {
  query: voucherPutQueryValidatorV2,
  body: voucherPostBodyValidatorV2,
};

// Info: (20240927 - Murky) DELETE voucher v2
const voucherDeleteQueryValidatorV2 = z.object({
  voucherId: zodStringToNumber,
});

const voucherDeleteBodyValidatorV2 = z.object({});

export const voucherDeleteValidatorV2: IZodValidator<
  (typeof voucherDeleteQueryValidatorV2)['shape'],
  (typeof voucherDeleteBodyValidatorV2)['shape']
> = {
  query: voucherDeleteQueryValidatorV2,
  body: voucherDeleteBodyValidatorV2,
};

export const voucherRequestValidatorsV2 = {
  GET_ONE: voucherGetOneValidatorV2,
  GET_LIST: voucherGetAllValidatorV2,
  PUT: voucherPutValidatorV2,
  POST: voucherPostValidatorV2,
  DELETE: voucherDeleteValidatorV2,
  WAS_READ: voucherWasReadValidatorV2,
};

// Info: (20241030 - Murky) Below is new version of middleware

const voucherNullSchema = z.union([z.object({}), z.string()]);

export const voucherPostSchema = {
  input: {
    querySchema: voucherPostQueryValidatorV2,
    bodySchema: voucherPostBodyValidatorV2,
  },
  outputSchema: voucherEntityValidator,
  frontend: voucherNullSchema,
};

export const voucherListSchema = {
  input: {
    querySchema: voucherGetAllQueryValidatorV2,
    bodySchema: voucherGetAllBodyValidatorV2,
  },
  outputSchema: voucherGetAllOutputValidatorV2,
  frontend: voucherNullSchema,
};
