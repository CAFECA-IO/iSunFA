import {
  InvoiceDirection,
  InvoiceType,
  CurrencyCode,
  DeductionType,
  InvoiceTab,
  TaxType,
} from '@/constants/invoice_rc2';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { z } from 'zod';
import { zodStringToNumber, nullSchema } from '@/lib/utils/zod_schema/common';
import { ProgressStatus } from '@/constants/account';

const InvoiceRC2BaseSchema = z.object({
  id: z.number(),
  accountBookId: z.number(),
  voucherId: z.number().nullable(),
  file: z.object({
    id: z.number(),
    name: z.string(),
    size: z.number().describe('Bytes of file'),
    url: z.string(),
    thumbnail: z
      .object({
        id: z.number(),
        name: z.string(),
        size: z.number().describe('Bytes of thumbnail file'),
        url: z.string(),
      })
      .nullable()
      .optional(),
  }),
  uploaderId: z.number(),
  direction: z.nativeEnum(InvoiceDirection),
  aiResultId: z.string().optional().default('0'),
  aiStatus: z.string().optional().default(ProgressStatus.IN_PROGRESS),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),

  type: z.nativeEnum(InvoiceType).nullable().optional(),
  issuedDate: z.number().nullable().optional(),
  no: z.string().nullable().optional(),
  currencyCode: z.nativeEnum(CurrencyCode),
  taxType: z.nativeEnum(TaxType).nullable().optional(),
  taxRate: z.number().nullable().optional(),
  netAmount: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  totalAmount: z.number().nullable().optional(),

  isGenerated: z.boolean().optional().default(false),
  incomplete: z.boolean(),
  description: z.string().nullable().optional(),
  note: z.record(z.any()).nullable().optional(),

  totalOfSummarizedInvoices: z.number().nullable().optional(),
  carrierSerialNumber: z.string().nullable().optional(),
  otherCertificateNo: z.string().nullable().optional(),

  deductionType: z.nativeEnum(DeductionType).nullable().optional(),
  salesName: z.string().nullable().optional(),
  salesIdNumber: z.string().nullable().optional(),
  isSharedAmount: z.boolean().nullable().optional(),

  buyerName: z.string().nullable().optional(),
  buyerIdNumber: z.string().nullable().optional(),
  isReturnOrAllowance: z.boolean().nullable().optional(),

  uploaderName: z.string(),
  voucherNo: z.string().nullable(),
});

export const InvoiceRC2InputSchema = InvoiceRC2BaseSchema.extend({
  direction: z.literal(InvoiceDirection.INPUT),
});

export const InvoiceRC2OutputSchema = InvoiceRC2BaseSchema.extend({
  direction: z.literal(InvoiceDirection.OUTPUT),
});

export const listInvoiceRC2QuerySchema = paginatedDataQuerySchema.extend({
  accountBookId: zodStringToNumber,
  isDeleted: z.boolean().optional().default(false),
  tab: z.nativeEnum(InvoiceTab).optional(),
  type: z
    .nativeEnum(InvoiceType)
    .optional()
    .transform((val) => (val === InvoiceType.ALL ? undefined : val)),
});

export const listInvoiceRC2Grouped = {
  input: {
    querySchema: listInvoiceRC2QuerySchema.extend({
      direction: z.nativeEnum(InvoiceDirection).optional(),
    }),
    bodySchema: nullSchema,
  },
  outputSchema: paginatedDataSchema(z.union([InvoiceRC2OutputSchema, InvoiceRC2InputSchema])),
  frontend: paginatedDataSchema(z.union([InvoiceRC2OutputSchema, InvoiceRC2InputSchema])),
};

export const listInvoiceRC2Input = {
  input: {
    querySchema: listInvoiceRC2QuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: paginatedDataSchema(InvoiceRC2InputSchema),
  frontend: paginatedDataSchema(InvoiceRC2InputSchema),
};

export const listInvoiceRC2Output = {
  input: {
    querySchema: listInvoiceRC2QuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: paginatedDataSchema(InvoiceRC2OutputSchema),
  frontend: paginatedDataSchema(InvoiceRC2OutputSchema),
};

export const getInvoiceRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, invoiceId: zodStringToNumber }),
    bodySchema: nullSchema,
  },
  outputSchema: InvoiceRC2InputSchema,
  frontend: InvoiceRC2InputSchema,
};

export const getInvoiceRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, invoiceId: zodStringToNumber }),
    bodySchema: nullSchema,
  },
  outputSchema: InvoiceRC2OutputSchema,
  frontend: InvoiceRC2OutputSchema,
};

export const createInvoiceRC2QuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

export const createInvoiceRC2BodySchema = z.object({
  fileId: z.number(),
  direction: z.nativeEnum(InvoiceDirection),
  isGenerated: z.boolean().optional().default(false),
  currencyCode: z.nativeEnum(CurrencyCode).optional().default(CurrencyCode.TWD),
});

export const createInvoiceRC2Input = {
  input: {
    querySchema: createInvoiceRC2QuerySchema,
    bodySchema: createInvoiceRC2BodySchema,
  },
  outputSchema: InvoiceRC2InputSchema,
  frontend: InvoiceRC2InputSchema,
};

export const createInvoiceRC2Output = {
  input: {
    querySchema: createInvoiceRC2QuerySchema,
    bodySchema: createInvoiceRC2BodySchema,
  },
  outputSchema: InvoiceRC2OutputSchema,
  frontend: InvoiceRC2OutputSchema,
};

export const updateInvoiceRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, invoiceId: zodStringToNumber }),
    bodySchema: InvoiceRC2InputSchema.partial(),
  },
  outputSchema: InvoiceRC2InputSchema,
  frontend: InvoiceRC2InputSchema,
};

export const updateInvoiceRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, invoiceId: zodStringToNumber }),
    bodySchema: InvoiceRC2OutputSchema.partial(),
  },
  outputSchema: InvoiceRC2OutputSchema,
  frontend: InvoiceRC2OutputSchema,
};

export const deleteInvoiceRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber }),
    bodySchema: z.object({
      invoiceIds: z.array(z.number()),
    }),
  },
  outputSchema: z.object({ success: z.boolean(), deletedIds: z.array(z.number()) }),
  frontend: z.object({ success: z.boolean(), deletedIds: z.array(z.number()) }),
};

export const deleteInvoiceRC2Output = deleteInvoiceRC2Input;

export function isInvoiceRC2Input(cert: unknown): cert is z.infer<typeof InvoiceRC2InputSchema> {
  return z.object({ direction: z.literal(InvoiceDirection.INPUT) }).safeParse({ direction: cert })
    .success;
}
export function isInvoiceRC2Output(cert: unknown): cert is z.infer<typeof InvoiceRC2OutputSchema> {
  return z.object({ direction: z.literal(InvoiceDirection.OUTPUT) }).safeParse(cert).success;
}
