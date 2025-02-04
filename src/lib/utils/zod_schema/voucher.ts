import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import {
  ILineItemBetaValidator,
  iLineItemBodyValidatorV2,
  iLineItemValidator,
} from '@/lib/utils/zod_schema/lineItem';
import {
  IVoucherDetailForFrontend,
  IVoucherBeta,
  IVoucherForSingleAccount,
} from '@/interfaces/voucher';
import {
  nullSchema,
  zodFilterSectionSortingOptions,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_END_DATE, DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { EventType, VoucherType } from '@/constants/account';
import { SortBy } from '@/constants/sort';
import { recurringEventForVoucherPostValidatorV2 } from '@/lib/utils/zod_schema/recurring_event';
import { JOURNAL_EVENT } from '@/constants/journal';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { partialCounterPartyEntityValidator } from '@/constants/counterparty';
import { userEntityValidator } from '@/lib/utils/zod_schema/user';
import { userVoucherEntityValidator } from '@/lib/utils/zod_schema/user_voucher';
import { IPaginatedData } from '@/interfaces/pagination';
import { eventTypeToVoucherType } from '@/lib/utils/common';
import { fileEntityValidator } from '@/lib/utils/zod_schema/file';
import { accountEntityValidator } from '@/lib/utils/zod_schema/account';
import {
  paginatedDataSchema,
  paginatedDataSchemaDataNotArray,
} from '@/lib/utils/zod_schema/pagination';
import { eventEntityValidator } from '@/lib/utils/zod_schema/event';
import { assetEntityValidator, IAssetDetailsValidator } from '@/lib/utils/zod_schema/asset';
import {
  certificateEntityValidator,
  ICertificateValidator,
} from '@/lib/utils/zod_schema/certificate';
import { invoiceEntityValidator } from '@/lib/utils/zod_schema/invoice';
import { accountingSettingEntityValidator } from '@/lib/utils/zod_schema/accounting_setting';
import { IReverseItemValidator, lineItemEntityValidator } from '@/lib/utils/zod_schema/line_item';
import { isUserReadCertificate } from '@/lib/utils/user_certificate';
import { userCertificateEntityValidator } from '@/lib/utils/zod_schema/user_certificate';
import { IAssociateLineItemEntitySchema } from '@/lib/utils/zod_schema/associate_line_item';
import { IAssociateVoucherEntitySchema } from '@/lib/utils/zod_schema/associate_voucher';
import { parseNoteData } from '@/lib/utils/parser/note_with_counterparty';

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
  originalEvents: z.array(z.any()),
  resultEvents: z.array(z.any()),
  lineItems: z.array(z.any()),
  aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
  certificates: z.array(z.any()),
  issuer: z.any().optional(),
  readByUsers: z.array(z.any()),
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
  unRead: z.boolean(),
  lineItemsInfo: z.object({
    sum: z.object({
      debit: z.boolean(),
      amount: z.number(),
    }),
    lineItems: z.array(ILineItemBetaValidator),
  }),
});

export const IVoucherForSingleAccountValidator = z.object({
  id: z.number().describe('voucher id'),
  date: z.number().describe('voucher date, selected by user'),
  voucherNo: z.string().describe('voucher 流水號'),
  voucherType: z.nativeEnum(VoucherType).describe('RECEIVE, TRANSFER, EXPENSE'),
  note: z.string().describe('voucher note'),
  lineItems: z
    .array(
      z.object({
        id: z.number().describe('line item id'),
        amount: z.number().describe('line item amount'),
        description: z.string().describe('line item description (for `particular`)'),
        debit: z.boolean().describe('line item debit or credit'),
      })
    )
    .min(1)
    .describe('particulars and amount for display'),
  issuer: z.object({
    avatar: z.string().describe('issuer avatar url'),
    name: z.string().describe('issuer name'),
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

// Info: (20240927 - Murky) GET all v2 validator
// Info: (20241104 - Murky) 不需要status, 因為status和tab重複, 都是upcoming, uploaded
const voucherGetAllQueryValidatorV2 = z.object({
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  type: z.preprocess((input) => {
    const result = typeof input === 'string' && input.toLowerCase() === 'all' ? undefined : input;
    return result;
  }, z.nativeEnum(EventType).optional()),
  tab: z.nativeEnum(VoucherListTabV2),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(DEFAULT_END_DATE),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
});

const voucherGetAllBodyValidatorV2 = z.object({});

const voucherGetAllOutputValidatorV2 = paginatedDataSchemaDataNotArray(
  z.object({
    vouchers: z.array(
      z.object({
        ...voucherEntityValidator.shape,
        counterParty: partialCounterPartyEntityValidator,
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
        payableInfo: z.object({
          total: z.number(),
          alreadyHappened: z.number(),
          remain: z.number(),
        }),
        receivingInfo: z.object({
          total: z.number(),
          alreadyHappened: z.number(),
          remain: z.number(),
        }),
        originalEvents: z.array(eventEntityValidator),
        isReverseRelated: z.boolean().optional(),
      })
    ),
    unRead: z.object({
      uploadedVoucher: z.number(),
      upcomingEvents: z.number(),
      paymentVoucher: z.number(),
      receivingVoucher: z.number(),
    }),
  })
).transform((data) => {
  const parsedVouchers: IVoucherBeta[] = data.data.vouchers.map((voucher) => {
    const noteData = parseNoteData(voucher.note ?? '');
    return {
      id: voucher.id,
      voucherDate: voucher.date,
      voucherNo: voucher.no,
      voucherType: eventTypeToVoucherType(voucher.type),
      note: noteData.note ?? '',
      counterParty: {
        companyId: z.number().parse(voucher.counterParty.id),
        name: voucher.counterParty.name || noteData.name,
        taxId: voucher.counterParty.taxId || noteData.taxId,
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
            note: lineItem.account.note ?? null,
          },
        })),
        sum: {
          debit: z.boolean().parse(voucher.sum.debit),
          amount: z.number().parse(voucher.sum.amount),
        },
      },
      payableInfo: voucher.payableInfo,
      receivingInfo: voucher.receivingInfo,
      reverseVouchers: voucher.originalEvents.reduce(
        (acc, event) => {
          if (event.associateVouchers) {
            event.associateVouchers.forEach((associateVoucher) => {
              acc.push({
                id: associateVoucher.resultVoucher.id,
                voucherNo: associateVoucher.resultVoucher.no,
              });
            });
          }
          return acc;
        },
        [] as { id: number; voucherNo: string }[]
      ),
      isReverseRelated: !!voucher.isReverseRelated,
    };
  });

  const parsedData: IPaginatedData<{
    unRead: {
      uploadedVoucher: number;
      upcomingEvents: number;
      paymentVoucher: number;
      receivingVoucher: number;
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

const voucherGetAllFrontendDataValidatorV2 = z.object({
  vouchers: z.array(IVoucherBetaValidator),
  unRead: z.object({
    uploadedVoucher: z.number(),
    upcomingEvents: z.number(),
  }),
});

const voucherGetAllFrontendValidatorV2 = paginatedDataSchemaDataNotArray(
  voucherGetAllFrontendDataValidatorV2
);

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
  actions: z.array(z.nativeEnum(VoucherV2Action)), // Info: (20241025 - Murky) [VoucherV2Action.ADD_ASSET, VoucherV2Action.REVERT]
  certificateIds: z.array(z.number().int()),
  voucherDate: z.number().int(), // Info: (20241105 - Murky) timestamp in Second
  type: z.nativeEnum(EventType),
  note: z.string(),
  lineItems: z.array(iLineItemBodyValidatorV2),
  recurringInfo: recurringEventForVoucherPostValidatorV2.optional(),
  assetIds: z.array(z.number().int()), // Info: (20241105 - Murky) 沒有的話寫 []
  counterPartyId: z.number().int().optional(),
  /**
   * Info: (20241105 - Murky)
   * @Julian Post Voucher的時候 reverseVouchers[0].lineItemIdBeReversed 填寫 REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2 取得的id,
   * reverseVouchers[0].lineItemIdReverseOther 放的則是要被Reverse的lineItem 在 Post lineItem array中的id
   * @example
   * ```
   *  [{
   *    voucherId: 1,
   *    lineItemIdBeReversed: 1, // 白色藍底的lineItem的id
   *    lineItemIdReverseOther: 2, // 藍色白底的lineItem 的編號，這邊不是只在database中的id, 而是post 中在 lineItems array中的index
   *    amount: 1000
   *  },]
   * ```

   */
  reverseVouchers: z
    .array(
      z.object({
        voucherId: z.number().int(),
        lineItemIdBeReversed: z.number().int(),
        lineItemIdReverseOther: z.number().int(),
        amount: z.number(),
      })
    )
    .optional()
    .transform((data) => {
      const result = data || [];
      return result;
    }),
});

const voucherPostOutputValidatorV2 = voucherEntityValidator.nullable().transform((data) => {
  if (data === null) {
    return null;
  }
  return data.id;
});
const voucherPostFrontendValidatorV2 = z.number();

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

const voucherGetOneBodyValidatorV2 = z.object({});

const voucherGetOneOutputValidatorV2 = z
  .object({
    ...voucherEntityValidator.shape,
    issuer: userEntityValidator,
    accountSetting: accountingSettingEntityValidator,
    counterParty: partialCounterPartyEntityValidator,
    originalEvents: z.array(eventEntityValidator),
    resultEvents: z.array(eventEntityValidator),
    asset: z.array(assetEntityValidator),
    certificates: z.array(
      z.object({
        ...certificateEntityValidator.shape,
        invoice: invoiceEntityValidator,
        file: fileEntityValidator,
        userCertificates: z.array(userCertificateEntityValidator),
      })
    ),
    lineItems: z.array(
      z.object({
        ...iLineItemBodyValidatorV2.shape,
        id: z.number(),
        account: accountEntityValidator,
        resultLineItems: z.array(
          z.object({
            ...IAssociateLineItemEntitySchema.shape,
            associateVoucher: z.object({
              ...IAssociateVoucherEntitySchema.shape,
              originalVoucher: voucherEntityValidator,
            }),
            originalLineItem: z.object({
              ...iLineItemBodyValidatorV2.shape,
              id: z.number(),
              account: accountEntityValidator,
            }),
          })
        ),
      })
    ),
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
    isReverseRelated: z.boolean().optional(),
  })
  .nullable()
  .transform((data) => {
    if (data === null) {
      // Info: (20241223 - Murky) 如果輸入為 null，直接返回 null
      return null;
    }
    const noteData = parseNoteData(data.note ?? '');
    const voucherDetail: IVoucherDetailForFrontend = {
      id: data.id,
      voucherDate: data.date,
      type: data.type,
      note: noteData.note ?? '',
      counterParty: data.counterParty || {
        companyId: data.companyId,
        name: noteData.name ?? '',
        taxId: noteData.taxId ?? '',
      },
      // Info: (20241105 - Murky) Recurring info 不需要，所以都會是 空值
      recurringInfo: {
        type: '',
        startDate: 0,
        endDate: 0,
        daysOfWeek: [],
        monthsOfYear: [],
      },
      payableInfo: data.payableInfo,
      receivingInfo: data.receivingInfo,
      reverseVoucherIds:
        data.originalEvents[0]?.associateVouchers?.map((associateVoucher) => ({
          id: associateVoucher.resultVoucher.id,
          voucherNo: associateVoucher.resultVoucher.no,
        })) ?? [],
      assets: data.asset.map((asset) => ({
        id: asset.id,
        currencyAlias: data.accountSetting.currency,
        acquisitionDate: asset.acquisitionDate,
        assetType: asset.type,
        assetNumber: asset.number,
        assetName: asset.name,
        purchasePrice: asset.purchasePrice,
        accumulatedDepreciation: asset.accumulatedDepreciation,
        residualValue: asset.residualValue,
        remainingLife: asset.remainingLife,
        assetStatus: asset.status,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        deletedAt: asset.deletedAt,
        depreciationStart: asset.depreciationStart,
        depreciationMethod: asset.depreciationMethod,
        usefulLife: asset.usefulLife,
        relatedVouchers: [],
        note: asset.note,
      })),
      certificates: data.certificates.map((certificate) => {
        const isRead = isUserReadCertificate(certificate.userCertificates);
        const certificateInstance = {
          id: certificate.id,
          name: 'Invoice-' + String(certificate.invoice.no).padStart(8, '0'),
          companyId: certificate.companyId,
          voucherNo: data.no,
          unRead: !isRead,
          uploader: data.issuer.name,
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
            name: 'InvoiceName',
            counterParty: {
              id: data.counterParty.id,
              companyId: data.counterParty.companyId,
              name: data.counterParty.name,
              taxId: data.counterParty.taxId,
              type: data.counterParty.type,
              note: data.counterParty.note,
              createdAt: data.counterParty.createdAt,
              updatedAt: data.counterParty.updatedAt,
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
      }),
      lineItems: data.lineItems.map((lineItem) => ({
        id: lineItem.id,
        description: lineItem.description,
        debit: lineItem.debit,
        amount: lineItem.amount,
        account: {
          ...lineItem.account,
          note: lineItem.account.note ?? null,
        },
        reverseList: lineItem.resultLineItems.map((resultLineItem) => ({
          voucherId: resultLineItem.associateVoucher.originalVoucherId,
          amount: resultLineItem.amount,
          description: resultLineItem.originalLineItem.description,
          debit: resultLineItem.debit,
          account: {
            ...resultLineItem.originalLineItem.account,
            note: resultLineItem.originalLineItem.account.note ?? null,
          },
          voucherNo: resultLineItem.associateVoucher.originalVoucher.no,
          lineItemBeReversedId: resultLineItem.originalLineItemId,
        })),
      })),
      isReverseRelated: data.isReverseRelated,
    };

    return voucherDetail;
  });

const IVoucherDetailForFrontendValidator = z.object({
  id: z.number(),
  voucherDate: z.number(),
  type: z.nativeEnum(EventType),
  note: z.string(),
  counterParty: z.object({
    id: z.number(),
    companyId: z.number(),
    name: z.string(),
    taxId: z.string(),
    type: z.string(),
    note: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  recurringInfo: z.object({
    // Deprecated: (20241105 - Murky)
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
    })
  ),
  assets: z.array(IAssetDetailsValidator),
  certificates: z.array(ICertificateValidator),
  lineItems: z.array(
    z.object({
      ...ILineItemBetaValidator.shape,
      reverseList: z.array(IReverseItemValidator),
    })
  ),
  isReverseRelated: z.boolean().optional(),
});

export const voucherGetOneFrontendValidatorV2 = IVoucherDetailForFrontendValidator;

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

// Info: (20241106 - Murky) api/v2/account/[accountId]/voucher.ts
const voucherGetByAccountQueryValidatorV2 = z.object({
  accountId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  // type: z.nativeEnum(EventType).optional(),
  // tab: z.nativeEnum(),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(DEFAULT_END_DATE),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
});

const voucherGetByAccountOutputValidatorV2 = paginatedDataSchema(
  z.object({
    ...voucherEntityValidator.shape,
    lineItems: z
      .array(
        z.object({
          ...lineItemEntityValidator.shape,
          id: z.number(),
          account: accountEntityValidator,
        })
      )
      .min(0),
    issuer: z.object({
      ...userEntityValidator.shape,
      imageFile: fileEntityValidator,
    }),
  })
).transform((data) => {
  const vouchers = data.data.map((voucher) => {
    const lineItems = voucher.lineItems.map((lineItem) => ({
      id: lineItem.id,
      amount: lineItem.amount,
      description: lineItem.description,
      debit: lineItem.debit,
    }));
    const voucherForSingleAccount: IVoucherForSingleAccount = {
      id: voucher.id,
      voucherNo: voucher.no,
      date: voucher.date,
      note: parseNoteData(voucher.note ?? '').note ?? '',
      voucherType: eventTypeToVoucherType(voucher.type),
      lineItems,
      issuer: {
        avatar: voucher.issuer.imageFile.url,
        name: voucher.issuer.name,
      },
    };

    return voucherForSingleAccount;
  });
  const reverseItemsPagination: z.infer<typeof voucherGetByAccountFrontendValidatorV2> = {
    page: data.page,
    totalPages: data.totalPages,
    totalCount: data.totalCount,
    pageSize: data.pageSize,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
    sort: data.sort,
    data: vouchers,
  };

  return reverseItemsPagination;
});

const voucherGetByAccountFrontendValidatorV2 = paginatedDataSchema(
  IVoucherForSingleAccountValidator
);

// Info: (20241030 - Murky) Below is new version of middleware

const voucherNullSchema = z.union([z.object({}), z.string()]);

export const voucherPostSchema = {
  input: {
    querySchema: voucherPostQueryValidatorV2,
    bodySchema: voucherPostBodyValidatorV2,
  },
  outputSchema: voucherPostOutputValidatorV2,
  frontend: voucherPostFrontendValidatorV2,
};

export const voucherListSchema = {
  input: {
    querySchema: voucherGetAllQueryValidatorV2,
    bodySchema: nullSchema,
  },
  outputSchema: voucherGetAllOutputValidatorV2,
  frontend: voucherGetAllFrontendValidatorV2,
};

export const voucherGetOneSchema = {
  input: {
    querySchema: voucherGetOneQueryValidatorV2,
    bodySchema: nullSchema,
  },
  outputSchema: voucherGetOneOutputValidatorV2,
  frontend: voucherGetOneFrontendValidatorV2,
};

export const voucherPutSchema = {
  input: {
    querySchema: voucherPutQueryValidatorV2,
    bodySchema: voucherPostBodyValidatorV2,
  },
  outputSchema: z
    .number()
    .nullable()
    .transform((data) => {
      if (data === null) {
        return null;
      }
      return data;
    }),
  frontend: voucherNullSchema,
};

export const voucherDeleteSchema = {
  input: {
    querySchema: voucherDeleteQueryValidatorV2,
    bodySchema: voucherNullSchema,
  },
  outputSchema: z.union([z.number(), z.null()]),
  frontend: z.number(),
};

export const voucherGetByAccountSchema = {
  input: {
    querySchema: voucherGetByAccountQueryValidatorV2,
    bodySchema: voucherNullSchema,
  },
  outputSchema: voucherGetByAccountOutputValidatorV2,
  frontend: voucherGetByAccountFrontendValidatorV2,
};
