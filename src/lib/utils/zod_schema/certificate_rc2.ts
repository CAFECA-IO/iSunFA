import {
  CertificateDirection,
  CertificateType,
  CurrencyCode,
  DeductionType,
  CertificateTab,
  TaxType,
} from '@/constants/certificate';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { z } from 'zod';
import { zodStringToNumber, nullSchema } from '@/lib/utils/zod_schema/common';
import { ProgressStatus } from '@/constants/account';

const CertificateRC2BaseSchema = z.object({
  id: z.number(),
  accountBookId: z.number(),
  voucherId: z.number().nullable(),
  file: z.object({
    id: z.number(),
    name: z.string(),
    size: z.number().describe('Bytes of file'),
    url: z.string(),
    isEncrypted: z.boolean(),
  }),
  uploaderId: z.number(),
  direction: z.nativeEnum(CertificateDirection),
  aiResultId: z.string().optional().default('0'),
  aiStatus: z.string().optional().default(ProgressStatus.IN_PROGRESS),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),

  type: z.nativeEnum(CertificateType).nullable().optional(),
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

  totalOfSummarizedCertificates: z.number().nullable().optional(),
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

export const CertificateRC2InputSchema = CertificateRC2BaseSchema.extend({
  direction: z.literal(CertificateDirection.INPUT),
});

export const CertificateRC2OutputSchema = CertificateRC2BaseSchema.extend({
  direction: z.literal(CertificateDirection.OUTPUT),
});

export const listCertificateRC2QuerySchema = paginatedDataQuerySchema.extend({
  accountBookId: zodStringToNumber,
  isDeleted: z.boolean().optional().default(false),
  tab: z.nativeEnum(CertificateTab).optional(),
  type: z
    .nativeEnum(CertificateType)
    .optional()
    .transform((val) => (val === CertificateType.ALL ? undefined : val)),
});

export const listCertificateRC2Input = {
  input: {
    querySchema: listCertificateRC2QuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: z.array(CertificateRC2InputSchema),
  frontend: paginatedDataSchema(CertificateRC2InputSchema),
};

export const listCertificateRC2Output = {
  input: {
    querySchema: listCertificateRC2QuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: z.array(CertificateRC2OutputSchema),
  frontend: paginatedDataSchema(CertificateRC2InputSchema),
};

export const getCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, certificateId: zodStringToNumber }),
    bodySchema: nullSchema,
  },
  outputSchema: CertificateRC2InputSchema,
  frontend: CertificateRC2InputSchema,
};

export const getCertificateRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, certificateId: zodStringToNumber }),
    bodySchema: nullSchema,
  },
  outputSchema: CertificateRC2OutputSchema,
  frontend: CertificateRC2OutputSchema,
};

export const createCertificateRC2QuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

export const createCertificateRC2BodySchema = z.object({
  fileId: z.number(),
  direction: z.nativeEnum(CertificateDirection),
  isGenerated: z.boolean().optional().default(false),
  currencyCode: z.nativeEnum(CurrencyCode).optional().default(CurrencyCode.TWD),
});

export const createCertificateRC2Input = {
  input: {
    querySchema: createCertificateRC2QuerySchema,
    bodySchema: createCertificateRC2BodySchema,
  },
  outputSchema: CertificateRC2InputSchema,
  frontend: CertificateRC2InputSchema,
};

export const createCertificateRC2Output = {
  input: {
    querySchema: createCertificateRC2QuerySchema,
    bodySchema: createCertificateRC2BodySchema,
  },
  outputSchema: CertificateRC2OutputSchema,
  frontend: CertificateRC2OutputSchema,
};

export const updateCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, certificateId: zodStringToNumber }),
    bodySchema: CertificateRC2InputSchema.partial(),
  },
  outputSchema: CertificateRC2InputSchema,
  frontend: CertificateRC2InputSchema,
};

export const updateCertificateRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, certificateId: zodStringToNumber }),
    bodySchema: CertificateRC2OutputSchema.partial(),
  },
  outputSchema: CertificateRC2OutputSchema,
  frontend: CertificateRC2OutputSchema,
};

export const deleteCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber }),
    bodySchema: z.object({
      certificateIds: z.array(z.number()),
    }),
  },
  outputSchema: z.object({ success: z.boolean(), deletedIds: z.number() }),
  frontend: z.object({ success: z.boolean(), deletedIds: z.number() }),
};

export const deleteCertificateRC2Output = deleteCertificateRC2Input;

export function isCertificateRC2Input(
  cert: unknown
): cert is z.infer<typeof CertificateRC2InputSchema> {
  return z
    .object({ direction: z.literal(CertificateDirection.INPUT) })
    .safeParse({ direction: cert }).success;
}
export function isCertificateRC2Output(
  cert: unknown
): cert is z.infer<typeof CertificateRC2OutputSchema> {
  return z.object({ direction: z.literal(CertificateDirection.OUTPUT) }).safeParse(cert).success;
}
