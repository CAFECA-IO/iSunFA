import prisma from '@/client';
import { CertificateRC2, File, CertificateType as PrismaCertificateType } from '@prisma/client';
import { z } from 'zod';
import {
  listCertificateRC2QuerySchema,
  CertificateRC2InputSchema,
  CertificateRC2OutputSchema,
  createCertificateRC2QuerySchema,
  createCertificateRC2BodySchema,
} from '@/lib/utils/zod_schema/certificate_rc2';
import { CertificateDirection, CertificateTab, CertificateType } from '@/constants/certificate';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { createOrderByList } from '@/lib/utils/sort';
import { getTimestampNow } from '@/lib/utils/common';
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';
import loggerBack from '@/lib/utils/logger_back';

type CertificateRC2WithFullRelations = CertificateRC2 & {
  file: File;
  uploader: { id: number; name: string };
  voucher: { id: number; no: string } | null;
};

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

function transformInput(
  cert: CertificateRC2WithFullRelations
): z.infer<typeof CertificateRC2InputSchema> {
  const certificateRC2Input = CertificateRC2InputSchema.parse({
    ...cert,
    file: cert.file,
    taxRate: cert.taxRate ?? null,
    deductionType: cert.deductionType ?? null,
    salesName: cert.salesName ?? '',
    salesIdNumber: cert.salesIdNumber ?? '',
    isSharedAmount: cert.isSharedAmount ?? false,
    incomplete: cert.incomplete ?? true,
    buyerName: undefined,
    buyerIdNumber: undefined,
    isReturnOrAllowance: undefined,
    isGenerated: cert.isGenerated ?? false,
    uploaderId: cert.uploader.id,
    uploaderName: cert.uploader.name,
    voucherId: cert.voucher?.id ?? null,
    voucherNo: cert.voucher?.no ?? null,
    note: typeof cert.note === 'string' ? JSON.parse(cert.note) : (cert.note ?? {}),
  });
  certificateRC2Input.incomplete = !isCertificateRC2Complete(certificateRC2Input);
  return certificateRC2Input;
}

function transformOutput(
  cert: CertificateRC2WithFullRelations
): z.infer<typeof CertificateRC2OutputSchema> {
  const certificateRC2Output = CertificateRC2OutputSchema.parse({
    ...cert,
    file: cert.file,
    taxRate: cert?.taxRate ?? null,
    buyerName: cert?.buyerName ?? '',
    buyerIdNumber: cert?.buyerIdNumber ?? '',
    isReturnOrAllowance: cert?.isReturnOrAllowance ?? null,
    deductionType: undefined,
    salesName: undefined,
    salesIdNumber: undefined,
    isSharedAmount: undefined,
    isGenerated: cert.isGenerated ?? false,
    uploaderId: cert.uploader.id,
    uploaderName: cert.uploader.name,
    voucherId: cert.voucher?.id ?? null,
    voucherNo: cert.voucher?.no ?? null,
    note: typeof cert.note === 'string' ? JSON.parse(cert.note) : (cert.note ?? {}),
  });
  certificateRC2Output.incomplete = !isCertificateRC2Complete(certificateRC2Output);
  return certificateRC2Output;
}

export async function findCertificateRC2ById(data: {
  userId: number;
  accountBookId: number;
  certificateId: number;
}) {
  const { userId, accountBookId, certificateId } = data;
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_CERTIFICATE,
  });
  const cert = await prisma.certificateRC2.findUnique({
    where: { id: certificateId, deletedAt: null },
    include: { file: true, voucher: true, uploader: true },
  });
  if (!cert) return null;
  return cert.direction === CertificateDirection.INPUT
    ? transformInput(cert)
    : transformOutput(cert);
}

export async function listCertificateRC2Input(
  userId: number,
  query: z.infer<typeof listCertificateRC2QuerySchema>
) {
  const {
    accountBookId,
    isDeleted,
    tab,
    type,
    page,
    pageSize,
    startDate,
    endDate,
    searchQuery,
    sortOption,
  } = query;

  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_CERTIFICATE,
  });

  const whereClause = {
    accountBookId,
    direction: CertificateDirection.INPUT,
    deletedAt: isDeleted === true ? { not: null } : isDeleted === false ? null : undefined,
    voucherId:
      tab === CertificateTab.WITHOUT_VOUCHER
        ? null
        : tab === CertificateTab.WITH_VOUCHER
          ? { not: null }
          : undefined,
    type: type ?? undefined,
    issuedDate: {
      gte: startDate || undefined,
      lte: endDate || undefined,
    },
    OR: searchQuery
      ? [
          { salesName: { contains: searchQuery, mode: 'insensitive' as const } },
          { salesIdNumber: { contains: searchQuery, mode: 'insensitive' as const } },
          { no: { contains: searchQuery, mode: 'insensitive' as const } },
        ]
      : undefined,
  };

  loggerBack.info(`listCertificateRC2Input - whereClause: ${JSON.stringify(whereClause)}`);

  const certificates = await prisma.certificateRC2.findMany({
    where: whereClause,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption || []),
    include: { file: true, voucher: true, uploader: true },
  });

  return certificates.map(transformInput);
}

export async function listCertificateRC2Output(
  userId: number,
  query: z.infer<typeof listCertificateRC2QuerySchema>
) {
  const {
    accountBookId,
    isDeleted,
    tab,
    type,
    page,
    pageSize,
    startDate,
    endDate,
    searchQuery,
    sortOption,
  } = query;

  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_CERTIFICATE,
  });

  const certificates = await prisma.certificateRC2.findMany({
    where: {
      accountBookId,
      direction: CertificateDirection.OUTPUT,
      deletedAt: isDeleted ? { not: null } : null,
      voucherId:
        tab === CertificateTab.WITHOUT_VOUCHER
          ? null
          : tab === CertificateTab.WITH_VOUCHER
            ? { not: null }
            : undefined,
      type: type ?? undefined,
      issuedDate: {
        gte: startDate || undefined,
        lte: endDate || undefined,
      },
      OR: searchQuery
        ? [
            { buyerName: { contains: searchQuery, mode: 'insensitive' } },
            { buyerIdNumber: { contains: searchQuery, mode: 'insensitive' } },
            { no: { contains: searchQuery, mode: 'insensitive' } },
          ]
        : undefined,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption || []),
    include: { file: true, voucher: true, uploader: true },
  });

  return certificates.map(transformOutput);
}

export async function createCertificateRC2(
  userId: number,
  query: z.infer<typeof createCertificateRC2QuerySchema>,
  body: z.infer<typeof createCertificateRC2BodySchema>
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId: query.accountBookId,
    action: TeamPermissionAction.CREATE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const cert = await prisma.certificateRC2.create({
    data: {
      ...body,
      accountBookId: query.accountBookId,
      uploaderId: userId,
      createdAt: now,
      updatedAt: now,
    },
    include: { file: true, voucher: true, uploader: true },
  });
  return body.direction === CertificateDirection.INPUT
    ? transformInput(cert)
    : transformOutput(cert);
}

export async function updateCertificateRC2Input(
  userId: number,
  accountBookId: number,
  certificateId: number,
  data: Partial<z.infer<typeof CertificateRC2InputSchema>>
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.UPDATE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const { id, createdAt, file, ...rest } = data;
  const updated = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: {
      ...rest,
      note: JSON.stringify(data.note) ?? null,
      type: data.type as PrismaCertificateType,
      updatedAt: now,
    },
    include: { file: true, voucher: true, uploader: true },
  });
  return transformInput(updated);
}

export async function updateCertificateRC2Output(
  userId: number,
  accountBookId: number,
  certificateId: number,
  data: Partial<z.infer<typeof CertificateRC2OutputSchema>>
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.UPDATE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const { id, createdAt, file, ...rest } = data;
  const updated = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: {
      ...rest,
      note: JSON.stringify(data.note) ?? null,
      type: data.type as PrismaCertificateType,
      updatedAt: now,
    },
    include: { file: true, voucher: true, uploader: true },
  });
  return transformOutput(updated);
}

export async function deleteCertificateRC2(
  userId: number,
  accountBookId: number,
  certificateIds: number[]
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.DELETE_CERTIFICATE,
  });
  const now = getTimestampNow();

  const deleted = await prisma.certificateRC2.updateMany({
    where: {
      id: { in: certificateIds },
      accountBookId, // 保險：避免誤刪其他帳本的資料
      deletedAt: null,
    },
    data: { deletedAt: now },
  });

  return {
    success: deleted.count > 0,
    deletedIds: deleted.count > 0 ? certificateIds : [],
  };
}
