import { IZodValidator } from '@/interfaces/zod_validator';
import { z } from 'zod';
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
  zodStringToBooleanOptional,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_END_DATE, DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { EventType, TransactionStatus, VoucherType } from '@/constants/account';
import { SortBy } from '@/constants/sort';
import { recurringEventForVoucherPostValidatorV2 } from '@/lib/utils/zod_schema/recurring_event';
import { JOURNAL_EVENT } from '@/constants/journal';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { partialCounterPartyEntityValidator } from '@/constants/counterparty';
import { userEntityValidator } from '@/lib/utils/zod_schema/user';
import { eventTypeToVoucherType } from '@/lib/utils/common';
import { fileEntityValidator } from '@/lib/utils/zod_schema/file';
import { accountEntityValidator } from '@/lib/utils/zod_schema/account';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { eventEntityValidator } from '@/lib/utils/zod_schema/event';
import { assetEntityValidator, IAssetDetailsValidator } from '@/lib/utils/zod_schema/asset';
import { InvoiceDirection as PrismaInvoiceDirection } from '@prisma/client';
import { IInvoiceRC2 } from '@/interfaces/invoice_rc2';
import {
  certificateEntityValidator,
  ICertificateValidator,
} from '@/lib/utils/zod_schema/certificate';
import { invoiceEntityValidator } from '@/lib/utils/zod_schema/invoice';
import { accountingSettingEntityValidator } from '@/lib/utils/zod_schema/accounting_setting';
import { IReverseItemValidator, lineItemEntityValidator } from '@/lib/utils/zod_schema/line_item';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { IAssociateLineItemEntitySchema } from '@/lib/utils/zod_schema/associate_line_item';
import { IAssociateVoucherEntitySchema } from '@/lib/utils/zod_schema/associate_voucher';
import { isCompleteVoucherBeta } from '@/lib/utils/voucher_common';
import {
  InvoiceDirection,
  InvoiceType,
  CurrencyCode,
  DeductionType,
  TaxType,
} from '@/constants/invoice_rc2';

// TODO: (20250606 - Tzuhan) 需要實作 InvoiceRC2List 轉換

const iVoucherValidator = z.object({
  journalId: z.number(),
  lineItems: z.array(iLineItemValidator),
});

const voucherCreateBodyValidator = z.object({
  voucher: iVoucherValidator,
});

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

/**
 * ************************************************
 * Info: (20240927 - Murky)
 * V2 validator below
 * ************************************************
 */

/**
 * Info: (20241025 - Murky)
 * @description schema for init voucher entity or parsed prisma voucher
 * @todo originalEvents, resultEvents, lineItems, certificates, issuer, need to be implement
 */
export const voucherEntityValidator = z.object({
  id: z.number(),
  issuerId: z.number(),
  counterPartyId: z.number().int().nullable().optional(),
  accountBookId: z.number(),
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
  accountBookId: z.number(),
  voucherDate: z.number(),
  voucherNo: z.string(),
  voucherType: z.nativeEnum(VoucherType),
  note: z.string(),
  counterParty: z
    .object({
      id: z.number().optional(),
      accountBookId: z.number().optional(),
      name: z.string().optional(),
      taxId: z.string().optional(),
      type: z.string().optional(),
      note: z.string().optional(),
      createdAt: z.number().optional(),
      updatedAt: z.number().optional(),
    })
    .nullable(),
  issuer: z.object({
    avatar: z.string(),
    name: z.string(),
  }),
  incomplete: z.boolean(),
  unRead: z.boolean().default(false),
  lineItemsInfo: z.object({
    sum: z.object({
      debit: z.boolean(),
      amount: z.string(),
    }),
    lineItems: z.array(ILineItemBetaValidator),
  }),
  deletedAt: z.number().nullable(),
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
        amount: z.string().describe('line item amount'),
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
  accountBookId: zodStringToNumber,
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

const voucherGetAllBodyValidatorV2 = z.object({});

export const voucherGetAllOutputValidatorV2 = paginatedDataSchema(
  z.object({
    ...voucherEntityValidator.shape,
    counterParty: partialCounterPartyEntityValidator,
    issuer: z.object({
      ...userEntityValidator.shape,
      imageFile: fileEntityValidator,
    }),
    lineItems: z.array(
      z.object({
        ...iLineItemBodyValidatorV2.shape,
        id: z.number(),
        account: accountEntityValidator,
      })
    ),
    sum: z.object({
      debit: z.boolean(),
      amount: z.string(),
    }),
    payableInfo: z.object({
      total: z.string(),
      alreadyHappened: z.string(),
      remain: z.string(),
    }),
    receivingInfo: z.object({
      total: z.string(),
      alreadyHappened: z.string(),
      remain: z.string(),
    }),
    originalEvents: z.array(eventEntityValidator),
    resultEvents: z.array(eventEntityValidator),
    isReverseRelated: z.boolean().optional(),
  })
).transform((data) => {
  const parsedVouchers: IVoucherBeta[] = data.data.map((voucher) => {
    const reverseVouchers = voucher.originalEvents.flatMap((event) =>
      (event.associateVouchers || []).map((av) => ({
        id: av.resultVoucher.id,
        voucherNo: av.resultVoucher.no,
      }))
    );

    const deletedReverseVouchers = voucher.resultEvents.flatMap((event) =>
      (event.associateVouchers || [])
        .filter((av) => av.originalVoucher)
        .map((av) => ({
          id: av.originalVoucher.id,
          voucherNo: av.originalVoucher.no,
        }))
    );

    const parsedVoucher = {
      id: voucher.id,
      accountBookId: voucher.accountBookId,
      status: voucher.status,
      voucherDate: voucher.date,
      voucherNo: voucher.no,
      voucherType: eventTypeToVoucherType(voucher.type),
      note: voucher.note ?? '',
      counterParty: voucher.counterParty
        ? {
            accountBookId: voucher.counterParty.accountBookId ?? 0,
            name: voucher.counterParty.name ?? '',
            taxId: voucher.counterParty.taxId ?? '',
          }
        : null,
      issuer: {
        avatar: voucher.issuer.imageFile.url,
        name: voucher.issuer.name,
      },
      incomplete: false,
      unRead: false,
      lineItemsInfo: {
        lineItems: voucher.lineItems.map((lineItem) => ({
          id: lineItem.id,
          description: lineItem.description,
          debit: lineItem.debit,
          amount: DecimalOperations.toExactString(lineItem.amount),
          account: {
            ...lineItem.account,
            note: lineItem.account.note ?? null,
          },
        })),
        sum: voucher.sum,
      },
      payableInfo: voucher.payableInfo,
      receivingInfo: voucher.receivingInfo,
      reverseVouchers,
      deletedReverseVouchers,
      isReverseRelated: !!voucher.isReverseRelated,
      deletedAt: voucher.deletedAt,
    };

    parsedVoucher.incomplete = isCompleteVoucherBeta(parsedVoucher);
    return parsedVoucher;
  });

  return {
    ...data,
    data: parsedVouchers,
  };
});

export const voucherGetAllFrontendValidatorV2 = paginatedDataSchema(IVoucherBetaValidator);

export const voucherGetAllValidatorV2: IZodValidator<
  (typeof voucherGetAllQueryValidatorV2)['shape'],
  (typeof voucherGetAllBodyValidatorV2)['shape']
> = {
  query: voucherGetAllQueryValidatorV2,
  body: voucherGetAllBodyValidatorV2,
};

// Info: (20240927 - Murky) POST voucher v2 validator
const voucherPostQueryValidatorV2 = z.object({
  accountBookId: zodStringToNumber,
});
const voucherPostBodyValidatorV2 = z.object({
  actions: z.array(z.nativeEnum(VoucherV2Action)), // Info: (20241025 - Murky) [VoucherV2Action.ADD_ASSET, VoucherV2Action.REVERT]
  certificateIds: z.array(z.number().int()),
  invoiceRC2Ids: z.array(z.number().int()).default([]),
  voucherDate: z.number().int(), // Info: (20241105 - Murky) timestamp in Second
  type: z.nativeEnum(EventType),
  note: z.string(),
  lineItems: z.array(iLineItemBodyValidatorV2),
  recurringInfo: recurringEventForVoucherPostValidatorV2.optional(),
  assetIds: z.array(z.number().int()), // Info: (20241105 - Murky) 沒有的話寫 []
  counterPartyId: z.number().int().nullable().optional(),
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
        amount: z.string(),
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

const voucherGetOneBodyValidatorV2 = z.object({});

export const InvoiceRC2WithFullRelationsValidator = z.object({
  id: z.number(),
  accountBookId: z.number(),
  voucherId: z.number().optional(),
  file: z.object({
    id: z.number(),
    name: z.string(),
    size: z.number(),
    url: z.string().optional(), // Info: (20250606 - Tzuhan) prisma 不會有 url，要 transform 時再補上
    thumbnail: z
      .object({
        id: z.number(),
        name: z.string(),
        size: z.number(),
        url: z.string().optional(),
      })
      .nullable()
      .optional(),
  }),
  uploader: z.object({
    id: z.number(),
    name: z.string(),
  }),
  voucher: z.object({
    id: z.number(),
    no: z.string(),
  }),
  direction: z.nativeEnum(InvoiceDirection),
  type: z.nativeEnum(InvoiceType).nullable().optional(),
  no: z.string().nullable().optional(),
  issuedDate: z.number().nullable().optional(),
  taxType: z.nativeEnum(TaxType).nullable().optional(),
  currencyCode: z.nativeEnum(CurrencyCode),
  netAmount: z.string().nullable().optional(),
  taxAmount: z.string().nullable().optional(),
  totalAmount: z.string().nullable().optional(),
  taxRate: z.number().nullable().optional(),
  note: z.union([z.record(z.any()), z.string(), z.null()]).optional(),
  aiResultId: z.string(),
  aiStatus: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),

  // Info: (20250606 - Tzuhan) Input fields
  deductionType: z.nativeEnum(DeductionType).nullable().optional(),

  salesName: z.string().nullable().optional(),
  salesIdNumber: z.string().nullable().optional(),
  isSharedAmount: z.boolean().optional(),

  // Info: (20250606 - Tzuhan) Output fields
  buyerName: z.string().nullable().optional(),
  buyerIdNumber: z.string().nullable().optional(),
  isReturnOrAllowance: z.boolean().optional(),

  isGenerated: z.boolean(),
  incomplete: z.boolean(),
  description: z.string().nullable().optional(),

  totalOfSummarizedInvoices: z.string().nullable().optional(),
  carrierSerialNumber: z.string().nullable().optional(),
  otherCertificateNo: z.string().nullable().optional(),
});

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
      })
    ),
    invoiceRC2List: z.array(InvoiceRC2WithFullRelationsValidator).optional().default([]),
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
    let reverseVoucherIds = Array.from(
      new Map(
        [
          ...(data.originalEvents
            ?.filter((event) => event.eventType === 'revert' || event.eventType === 'delete')
            ?.flatMap(
              (event) =>
                event.associateVouchers
                  ?.filter((associateVoucher) => associateVoucher.resultVoucher)
                  .map((associateVoucher) => ({
                    id: associateVoucher.resultVoucher.id,
                    voucherNo: associateVoucher.resultVoucher.no,
                    type: event.eventType === 'delete' ? 'reverse' : 'settlement',
                  })) ?? []
            ) ?? []),

          // Info: (20250213 - Tzuhan)  **3. 沖銷傳票 -> 立賬傳票**
          ...(data.resultEvents
            ?.filter((event) => event.eventType === 'revert') // Info: (20250213 - Tzuhan)  只篩選 eventType === 'revert'
            ?.flatMap(
              (event) =>
                event.associateVouchers
                  ?.filter((associateVoucher) => associateVoucher.originalVoucher)
                  .map((associateVoucher) => ({
                    id: associateVoucher.originalVoucher.id,
                    voucherNo: associateVoucher.originalVoucher.no,
                    type: 'original',
                  })) ?? []
            ) ?? []),
        ].map((item) => [item.id, item]) // Info: (20250213 - Tzuhan)  使用 Map 去重複
      ).values()
    );

    let deletedReverseVoucherIds =
      data.resultEvents
        ?.filter((event) => event.eventType === 'delete')
        ?.flatMap(
          (event) =>
            event.associateVouchers
              ?.filter((associateVoucher) => associateVoucher.originalVoucher)
              .map((associateVoucher) => ({
                id: associateVoucher.originalVoucher.id,
                voucherNo: associateVoucher.originalVoucher.no,
              })) ?? []
        ) ?? [];

    //  Info: (20250212 - Tzuhan) 過濾掉 `undefined`
    reverseVoucherIds = reverseVoucherIds.filter((voucher) => voucher.id && voucher.voucherNo);
    deletedReverseVoucherIds = deletedReverseVoucherIds.filter(
      (voucher) => voucher.id && voucher.voucherNo
    );
    const voucherDetail: IVoucherDetailForFrontend = {
      id: data.id,
      voucherDate: data.date,
      type: data.type,
      note: data.note ?? '',
      counterParty: {
        companyId: data.accountBookId,
        name: data.counterParty?.name,
        taxId: data.counterParty?.taxId,
      },
      // Info: (20241105 - Murky) Recurring info 不需要，所以都會是 空值
      recurringInfo: {
        type: '',
        startDate: 0,
        endDate: 0,
        daysOfWeek: [],
        monthsOfYear: [],
      },
      payableInfo: data.payableInfo ? {
        total: DecimalOperations.toExactString(data.payableInfo.total),
        alreadyHappened: DecimalOperations.toExactString(data.payableInfo.alreadyHappened),
        remain: DecimalOperations.toExactString(data.payableInfo.remain),
      } : undefined,
      receivingInfo: data.receivingInfo ? {
        total: DecimalOperations.toExactString(data.receivingInfo.total),
        alreadyHappened: DecimalOperations.toExactString(data.receivingInfo.alreadyHappened),
        remain: DecimalOperations.toExactString(data.receivingInfo.remain),
      } : undefined,
      reverseVoucherIds,
      deletedReverseVoucherIds,
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
        const certificateInstance = {
          id: certificate.id,
          name: 'Invoice-' + String(certificate.invoice.no).padStart(8, '0'),
          companyId: certificate.accountBookId,
          voucherNo: data.no,
          voucherId: data.id ?? null,
          uploaderUrl: data.issuer.imageFile?.url || '',
          incomplete: false,
          unRead: false,
          uploader: data.issuer.name,
          invoice: {
            id: certificate.invoice.id,
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
              id: data.counterParty?.id,
              accountBookId: data.counterParty?.accountBookId,
              name: data.counterParty?.name,
              taxId: data.counterParty?.taxId,
              type: data.counterParty?.type,
              note: data.counterParty?.note,
              createdAt: data.counterParty?.createdAt,
              updatedAt: data.counterParty?.updatedAt,
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
      // TODO: (20250606 - Tzuhan) 需要實作 InvoiceRC2List 轉換
      // invoiceRC2List: (data.invoiceRC2List ?? []).map((inv): IInvoiceRC2 => {
      //   return inv.direction === InvoiceDirection.INPUT
      //     ? transformInput(inv)
      //     : transformOutput(inv);
      // }),
      invoiceRC2List: data.invoiceRC2List.map((invoice) => {
        const base = {
          id: invoice.id,
          accountBookId: invoice.accountBookId,
          voucherId: invoice.voucherId,
          fileId: invoice.file.id,
          file: {
            id: invoice.file.id,
            name: invoice.file.name,
            size: invoice.file.size,
            url: invoice.file.url ?? '',
            thumbnail: invoice.file.name
              ? {
                  id: invoice.file.id,
                  name: '',
                  size: 0,
                  url: '',
                }
              : undefined,
          },
          uploaderId: invoice.uploader.id,
          uploaderName: invoice.uploader.name,
          direction: invoice.direction,
          aiResultId: invoice.aiResultId ?? '0',
          aiStatus: invoice.aiStatus ?? 'READY',
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
          deletedAt: invoice.deletedAt ?? undefined,

          type: (invoice.type ?? undefined) as InvoiceType | undefined,
          issuedDate: invoice.issuedDate ?? undefined,
          no: invoice.no ?? '',
          currencyCode: invoice.currencyCode,
          taxType: invoice.taxType ?? undefined,
          taxRate: invoice.taxRate ?? undefined,
          netAmount: (invoice.netAmount ?? 0).toString(),
          taxAmount: (invoice.taxAmount ?? 0).toString(),
          totalAmount: (invoice.totalAmount ?? 0).toString(),

          isGenerated: invoice.isGenerated,
          incomplete: invoice.incomplete,
          description: invoice.description ?? undefined,
          note: invoice.note ?? undefined,

          totalOfSummarizedInvoices: (invoice.totalOfSummarizedInvoices ?? 0).toString(),
          carrierSerialNumber: invoice.carrierSerialNumber ?? undefined,
          otherCertificateNo: invoice.otherCertificateNo ?? undefined,

          voucherNo: invoice.voucher?.no ?? null,
        };

        if (invoice.direction === PrismaInvoiceDirection.INPUT) {
          return {
            ...base,
            direction: PrismaInvoiceDirection.INPUT as InvoiceDirection.INPUT,
            deductionType: (invoice.deductionType ?? undefined) as DeductionType | undefined,
            salesName: invoice.salesName ?? undefined,
            salesIdNumber: invoice.salesIdNumber ?? undefined,
            isSharedAmount: invoice.isSharedAmount ?? false,
          } as IInvoiceRC2;
        }

        return {
          ...base,
          direction: PrismaInvoiceDirection.OUTPUT as InvoiceDirection,
          buyerName: invoice.buyerName ?? undefined,
          buyerIdNumber: invoice.buyerIdNumber ?? undefined,
          isReturnOrAllowance: invoice.isReturnOrAllowance ?? false,
        } as IInvoiceRC2;
      }),
      lineItems: data.lineItems.map((lineItem) => ({
        id: lineItem.id,
        description: lineItem.description,
        debit: lineItem.debit,
        amount: DecimalOperations.toExactString(lineItem.amount),
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
    id: z.number().optional(),
    accountBookId: z.number().optional(),
    name: z.string().optional(),
    taxId: z.string().optional(),
    type: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
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
      total: z.string(),
      alreadyHappened: z.string(),
      remain: z.string(),
    })
    .optional(),
  receivingInfo: z
    .object({
      total: z.string(),
      alreadyHappened: z.string(),
      remain: z.string(),
    })
    .optional(),
  reverseVoucherIds: z.array(
    z.object({
      id: z.number(),
      voucherNo: z.string(),
    })
  ),
  deletedReverseVoucherIds: z.array(
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

export const voucherPutValidatorV2: IZodValidator<
  (typeof voucherPutQueryValidatorV2)['shape'],
  (typeof voucherPostBodyValidatorV2)['shape']
> = {
  query: voucherPutQueryValidatorV2,
  body: voucherPostBodyValidatorV2,
};

// Info: (20240927 - Murky) DELETE voucher v2
const voucherDeleteQueryValidatorV2 = z.object({
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
      amount: DecimalOperations.toExactString(lineItem.amount),
      description: lineItem.description,
      debit: lineItem.debit,
    }));
    const voucherForSingleAccount: IVoucherForSingleAccount = {
      id: voucher.id,
      voucherNo: voucher.no,
      date: voucher.date,
      note: voucher.note ?? '',
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

// Info: (20250218 - Shirley) Restore voucher schema
export const voucherRestoreSchema = {
  input: {
    querySchema: z.object({
      accountBookId: zodStringToNumber,
      voucherId: zodStringToNumber,
    }),
    bodySchema: nullSchema,
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
