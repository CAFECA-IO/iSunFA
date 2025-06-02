import { z } from 'zod';
import { ILineItemBetaValidator, iLineItemBodyValidatorV2 } from '@/lib/utils/zod_schema/lineItem';

import {
  nullSchema,
  zodFilterSectionSortingOptions,
  zodStringToBooleanOptional,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_END_DATE, DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { EventType, TransactionStatus, VoucherType } from '@/constants/account';
import { recurringEventForVoucherPostValidatorV2 } from '@/lib/utils/zod_schema/recurring_event';
import { JOURNAL_EVENT } from '@/constants/journal';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { IAssetDetailsValidator } from '@/lib/utils/zod_schema/asset';

import { IReverseItemValidator } from '@/lib/utils/zod_schema/line_item';
import { InvoiceRC2Schema } from '@/lib/utils/zod_schema/invoice_rc2';
import { SortBy } from '@/constants/sort';

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
  originalEvents: z.array(z.any()),
  resultEvents: z.array(z.any()),
  lineItems: z.array(z.any()),
  aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  certificates: z.array(z.any()),
  issuer: z.any().optional(),
  asset: z.array(z.any()),
  isReverseRelated: z.boolean().optional(),
});

/**
 * Info: (20241105 - Murky)
 * @description IVoucherBeta is the component of get all voucher list
 */
export const IVoucherBetaValidator = z.object({
  id: z.number(),
  voucherDate: z.number(),
  voucherNo: z.string(),
  voucherType: z.nativeEnum(VoucherType),
  note: z.string(),
  counterParty: z.object({
    companyId: z.number(),
    name: z.string().optional(),
    taxId: z.string().optional(),
  }),
  issuer: z.object({
    avatar: z.string(),
    name: z.string(),
  }),
  incomplete: z.boolean(),
  unRead: z.boolean().default(false),
  lineItemsInfo: z.object({
    sum: z.object({
      debit: z.boolean(),
      amount: z.number(),
    }),
    lineItems: z.array(ILineItemBetaValidator),
  }),
  deletedAt: z.number().nullable(),
});

export const IVoucherForSingleAccountValidator = z.object({
  id: z.number(),
  date: z.number(),
  voucherNo: z.string(),
  voucherType: z.nativeEnum(VoucherType),
  note: z.string(),
  lineItems: z
    .array(
      z.object({
        id: z.number(),
        amount: z.number(),
        description: z.string(),
        debit: z.boolean(),
      })
    )
    .min(1),
  issuer: z.object({
    avatar: z.string(),
    name: z.string(),
  }),
});

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

// ============================
// Info: (20250529 - Tzuhan) 新增：Zod Schema 根據前端需要的介面調整
// ============================

// Info: (20250529 - Tzuhan) LIST BY ACCOUNT /account_book/:accountBookId/account/:accountId/voucher
export const voucherListByAccountQueryValidatorV2 = z.object({
  accountId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  type: z.preprocess(
    (input) => {
      if (typeof input === 'string' && input.toLowerCase() === 'all') {
        return undefined;
      }
      return input;
    },
    z.union([z.nativeEnum(EventType), z.nativeEnum(TransactionStatus)]).optional()
  ),
  tab: z.nativeEnum(VoucherListTabV2),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(DEFAULT_END_DATE),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
  hideReversedRelated: zodStringToBooleanOptional,
});

// Info: (20250529 - Tzuhan) POST /account_book/:accountBookId/voucher
export const voucherPostQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
});

export const voucherPostBodyValidatorV2 = z.object({
  voucherDate: z.number(), //
  type: z.nativeEnum(EventType), //
  note: z.string(), //
  counterPartyId: z.number().optional(), //
  lineItems: z.array(iLineItemBodyValidatorV2), //
  assetIds: z.array(z.number()), //
  certificateIds: z.array(z.number()), //
  recurringInfo: recurringEventForVoucherPostValidatorV2.optional(),
  actions: z.array(z.nativeEnum(VoucherV2Action)), //
  reverseVouchers: z.array(
    z.object({
      voucherId: z.number(),
      lineItemIdBeReversed: z.number(),
      lineItemIdReverseOther: z.number(),
      amount: z.number(),
    })
  ),
});

// Info: (20250529 - Tzuhan) PUT /account_book/:accountBookId/voucher/:voucherId
export const voucherPutQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
  voucherId: zodStringToNumber,
  isVoucherNo: z
    .string()
    .optional()
    .transform((data) => {
      // Info: (20241230 - Murky) @Tzuhan false, undefined: voucherId, true: voucherNo
      if (data === undefined) {
        return false;
      }
      return data === 'true';
    }),
});

export const voucherPutBodyValidatorV2 = voucherPostBodyValidatorV2;

// Info: (20250529 - Tzuhan) GET /account_book/:accountBookId/voucher/:voucherId
export const voucherGetOneQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
  voucherId: zodStringToNumber,
  isVoucherNo: z
    .string()
    .optional()
    .transform((data) => {
      // Info: (20241230 - Murky) @Tzuhan false, undefined: voucherId, true: voucherNo
      if (data === undefined) {
        return false;
      }
      return data === 'true';
    }),
});

// Info: (20250529 - Tzuhan) DELETE /account_book/:accountBookId/voucher/:voucherId
export const voucherDeleteQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
  voucherId: zodStringToNumber,
  isVoucherNo: z
    .string()
    .optional()
    .transform((data) => {
      // Info: (20241230 - Murky) @Tzuhan false, undefined: voucherId, true: voucherNo
      if (data === undefined) {
        return false;
      }
      return data === 'true';
    }),
});

// Info: (20250529 - Tzuhan) RESTORE /account_book/:accountBookId/voucher/:voucherId/restore
export const voucherRestoreQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
  voucherId: zodStringToNumber,
});

// Info: (20250529 - Tzuhan) LIST /account_book/:accountBookId/voucher
export const voucherListQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  type: z.nativeEnum(EventType).optional(),
  tab: z.nativeEnum(VoucherListTabV2),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(DEFAULT_END_DATE),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
  hideReversedRelated: zodStringToBooleanOptional,
});

export const IVoucherDetailForFrontendValidator = z.object({
  id: z.number(),
  voucherDate: z.number(),
  type: z.nativeEnum(EventType),
  note: z.string(),
  counterParty: z.object({
    id: z.number().optional(),
    companyId: z.number().optional(),
    name: z.string().optional(),
    taxId: z.string().optional(),
    type: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
  }),
  recurringInfo: z.object({
    type: z.string(),
    startDate: z.number(),
    endDate: z.number(),
    daysOfWeek: z.array(z.number()),
    monthsOfYear: z.array(z.number()),
  }),
  payableInfo: z
    .object({
      total: z.number(),
      alreadyHappened: z.number(),
      remain: z.number(),
    })
    .optional(),
  receivingInfo: z
    .object({
      total: z.number(),
      alreadyHappened: z.number(),
      remain: z.number(),
    })
    .optional(),
  reverseVoucherIds: z.array(
    z.object({
      id: z.number(),
      voucherNo: z.string(),
      type: z.string(),
    })
  ),
  deletedReverseVoucherIds: z.array(
    z.object({
      id: z.number(),
      voucherNo: z.string(),
    })
  ),
  assets: z.array(IAssetDetailsValidator),
  certificates: z.array(InvoiceRC2Schema),
  lineItems: z.array(
    z.object({
      ...ILineItemBetaValidator.shape,
      reverseList: z.array(IReverseItemValidator),
    })
  ),
  isReverseRelated: z.boolean().optional(),
});

// ============================
// Info: (20250529 - Tzuhan) 匯總給 zod_schema 統一管理用
// ============================

export const voucherRequestValidatorsV2 = {
  create: {
    input: {
      querySchema: voucherPostQueryValidatorV2,
      bodySchema: voucherPostBodyValidatorV2,
    },
    outputSchema: IVoucherBetaValidator,
    frontend: IVoucherBetaValidator,
  },
  update: {
    input: {
      querySchema: voucherPutQueryValidatorV2,
      bodySchema: voucherPutBodyValidatorV2,
    },
    outputSchema: IVoucherBetaValidator,
    frontend: IVoucherBetaValidator,
  },
  getById: {
    input: {
      querySchema: voucherGetOneQueryValidatorV2,
      bodySchema: nullSchema,
    },
    outputSchema: IVoucherDetailForFrontendValidator,
    frontend: IVoucherDetailForFrontendValidator,
  },
  delete: {
    input: {
      querySchema: voucherDeleteQueryValidatorV2,
      bodySchema: nullSchema,
    },
    outputSchema: z.union([z.number(), z.null()]),
    frontend: z.number(),
  },
  restore: {
    input: {
      querySchema: voucherRestoreQueryValidatorV2,
      bodySchema: nullSchema,
    },
    outputSchema: z.union([z.number(), z.null()]),
    frontend: z.number(),
  },
  list: {
    input: {
      querySchema: voucherListQueryValidatorV2,
      bodySchema: nullSchema,
    },
    outputSchema: paginatedDataSchema(IVoucherBetaValidator),
    frontend: paginatedDataSchema(IVoucherBetaValidator),
  },
  listByAccount: {
    input: {
      querySchema: voucherListByAccountQueryValidatorV2,
      bodySchema: nullSchema,
    },
    outputSchema: paginatedDataSchema(IVoucherForSingleAccountValidator),
    frontend: paginatedDataSchema(IVoucherForSingleAccountValidator),
  },
};
