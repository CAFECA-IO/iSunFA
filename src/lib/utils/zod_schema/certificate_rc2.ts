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

const CertificateRC2BaseSchema = z.object({
  id: z.number(),
  accountBookId: z.number(),
  fileId: z.number(),
  uploaderId: z.number(),
  direction: z.nativeEnum(CertificateDirection),
  aiResultId: z.string(),
  aiStatus: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable().optional(),

  type: z.nativeEnum(CertificateType),
  issuedDate: z.number(),
  no: z.string(),
  currencyCode: z.nativeEnum(CurrencyCode),
  taxType: z.nativeEnum(TaxType),
  taxRate: z.number().nullable().optional(),
  netAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),

  isGenerated: z.boolean(),

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
});

export const CertificateRC2InputSchema = CertificateRC2BaseSchema.extend({
  direction: z.literal(CertificateDirection.INPUT),
});

export const CertificateRC2OutputSchema = CertificateRC2BaseSchema.extend({
  direction: z.literal(CertificateDirection.OUTPUT),
});

export const listCertificateRC2QuerySchema = paginatedDataQuerySchema.extend({
  accountBookId: z.number(),
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
    bodySchema: z.null(),
  },
  outputSchema: z.array(CertificateRC2InputSchema),
  frontend: paginatedDataSchema(CertificateRC2InputSchema),
};

export const listCertificateRC2Output = {
  input: {
    querySchema: listCertificateRC2QuerySchema,
    bodySchema: z.null(),
  },
  outputSchema: z.array(CertificateRC2OutputSchema),
  frontend: paginatedDataSchema(CertificateRC2InputSchema),
};

export const getCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: z.null(),
  },
  outputSchema: CertificateRC2InputSchema,
  frontend: CertificateRC2InputSchema,
};

export const getCertificateRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: z.null(),
  },
  outputSchema: CertificateRC2OutputSchema,
  frontend: CertificateRC2OutputSchema,
};

export const createCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: CertificateRC2InputSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    }),
  },
  outputSchema: CertificateRC2InputSchema,
  frontend: CertificateRC2InputSchema,
};

export const createCertificateRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: CertificateRC2OutputSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    }),
  },
  outputSchema: CertificateRC2OutputSchema,
  frontend: CertificateRC2OutputSchema,
};

export const updateCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: CertificateRC2InputSchema.partial(),
  },
  outputSchema: CertificateRC2InputSchema,
  frontend: CertificateRC2InputSchema,
};

export const updateCertificateRC2Output = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: CertificateRC2OutputSchema.partial(),
  },
  outputSchema: CertificateRC2OutputSchema,
  frontend: CertificateRC2OutputSchema,
};

export const deleteCertificateRC2Input = {
  input: {
    querySchema: z.object({ accountBookId: z.number(), certificateId: z.number() }),
    bodySchema: z.null(),
  },
  outputSchema: z.object({ success: z.boolean() }),
  frontend: z.object({ success: z.boolean() }),
};

export const deleteCertificateRC2Output = deleteCertificateRC2Input;

export function isCertificateRC2Input(
  cert: unknown
): cert is z.infer<typeof CertificateRC2InputSchema> {
  return z.object({ direction: z.literal(CertificateDirection.INPUT) }).safeParse(cert).success;
}

export function isCertificateRC2Output(
  cert: unknown
): cert is z.infer<typeof CertificateRC2OutputSchema> {
  return z.object({ direction: z.literal(CertificateDirection.OUTPUT) }).safeParse(cert).success;
}

type CertificateRC2InputType = z.infer<typeof CertificateRC2InputSchema>;
type CertificateRC2OutputType = z.infer<typeof CertificateRC2OutputSchema>;
type CertificateRC2Type = CertificateRC2InputType | CertificateRC2OutputType;

export function isCertificateRC2Complete(cert: CertificateRC2Type): boolean {
  if (
    !cert.type ||
    !cert.issuedDate ||
    !cert.no ||
    !cert.currencyCode ||
    !cert.taxType ||
    cert.netAmount == null ||
    cert.taxAmount == null ||
    cert.totalAmount == null
  ) {
    return false;
  }
  const requiredByType: Partial<Record<CertificateType, (keyof CertificateRC2Type)[]>> = {
    [CertificateType.INPUT_21]: ['deductionType', 'salesName'],
    [CertificateType.INPUT_22]: ['deductionType', 'salesName'],
    [CertificateType.INPUT_23]: ['deductionType', 'salesName'],
    [CertificateType.INPUT_24]: ['deductionType', 'salesName'],
    [CertificateType.INPUT_25]: ['deductionType', 'salesName', 'isSharedAmount'],
    [CertificateType.INPUT_26]: ['deductionType', 'salesName'],
    [CertificateType.INPUT_27]: ['deductionType', 'salesName'],
    [CertificateType.INPUT_28]: ['deductionType'],
    [CertificateType.INPUT_29]: ['deductionType'],
    [CertificateType.OUTPUT_31]: ['buyerName'],
    [CertificateType.OUTPUT_32]: ['buyerName'],
    [CertificateType.OUTPUT_35]: ['buyerName'],
    [CertificateType.OUTPUT_36]: ['buyerName'],
  };
  const requiredFields = requiredByType[cert.type] || [];
  return requiredFields.every((key) => {
    const val = cert[key];
    if (typeof val === 'string') return val.trim().length > 0;
    return val !== undefined && val !== null;
  });
}
