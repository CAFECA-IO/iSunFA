import prisma from '@/client';
import { CertificateRC2, CertificateType as PrismaCertificateType } from '@prisma/client';
import { z } from 'zod';
import {
  listCertificateRC2QuerySchema,
  CertificateRC2InputSchema,
  CertificateRC2OutputSchema,
  createCertificateRC2QuerySchema,
  createCertificateRC2BodySchema,
} from '@/lib/utils/zod_schema/certificate_rc2';
import { CertificateDirection, CertificateTab } from '@/constants/certificate';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { createOrderByList } from '@/lib/utils/sort';
import { getTimestampNow } from '@/lib/utils/common';
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';

type CertificateRC2WithFile = CertificateRC2 & {
  file: {
    id: number;
    name: string;
    url: string;
    size: number;
  };
};

function transformInput(cert: CertificateRC2WithFile): z.infer<typeof CertificateRC2InputSchema> {
  return CertificateRC2InputSchema.parse({
    ...cert,
    file: cert.file,
    taxRate: cert?.taxRate ?? null,
    deductionType: cert?.deductionType ?? null,
    salesName: cert?.salesName ?? '',
    salesIdNumber: cert?.salesIdNumber ?? '',
    isSharedAmount: cert?.isSharedAmount ?? false,
    buyerName: undefined,
    buyerIdNumber: undefined,
    isReturnOrAllowance: undefined,
  });
}

function transformOutput(cert: CertificateRC2WithFile): z.infer<typeof CertificateRC2OutputSchema> {
  return CertificateRC2OutputSchema.parse({
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
  });
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
    include: { file: true },
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

  const certificates = await prisma.certificateRC2.findMany({
    where: {
      accountBookId,
      direction: CertificateDirection.INPUT,
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
            { salesName: { contains: searchQuery, mode: 'insensitive' } },
            { salesIdNumber: { contains: searchQuery, mode: 'insensitive' } },
            { no: { contains: searchQuery, mode: 'insensitive' } },
          ]
        : undefined,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption || []),
    include: { file: true },
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
    include: { file: true },
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
    include: { file: true },
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
      type: data.type as PrismaCertificateType,
      updatedAt: now,
    },
    include: { file: true },
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
      type: data.type as PrismaCertificateType,
      updatedAt: now,
    },
    include: { file: true },
  });
  return transformOutput(updated);
}

export async function deleteCertificateRC2Input(
  userId: number,
  accountBookId: number,
  certificateId: number
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.DELETE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const deleted = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: { deletedAt: now },
  });
  return { success: !!deleted };
}

export async function deleteCertificateRC2Output(
  userId: number,
  accountBookId: number,
  certificateId: number
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.DELETE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const deleted = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: { deletedAt: now },
  });
  return { success: !!deleted };
}
