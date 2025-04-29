import { CertificateRC2 } from '@prisma/client';
import prisma from '@/client';

import { z } from 'zod';
import {
  CertificateDirection,
  CurrencyCode,
  DeductionType,
  TaxType,
} from '@/constants/certificate';
import {
  CertificateRC2InputSchema,
  CertificateRC2OutputSchema,
} from '@/lib/utils/zod_schema/certificate_rc2';

export function transformCertificateRC2(
  cert: CertificateRC2
): z.infer<typeof CertificateRC2InputSchema> | z.infer<typeof CertificateRC2OutputSchema> {
  const base = {
    id: cert.id,
    accountBookId: cert.accountBookId,
    fileId: cert.fileId,
    uploaderId: cert.uploaderId,
    direction: cert.direction,
    aiResultId: cert.aiResultId,
    aiStatus: cert.aiStatus,
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
    deletedAt: cert.deletedAt ?? null,
    type: cert.type,
    issuedDate: cert.issuedDate,
    no: cert.no,
    currencyCode: cert.currencyCode as CurrencyCode,
    taxType: cert.taxType as TaxType,
    taxRate: cert.taxRate,
    netAmount: cert.netAmount,
    taxAmount: cert.taxAmount,
    totalAmount: cert.totalAmount,
    isGenerated: cert.isGenerated,
    totalOfSummarizedCertificates: cert.totalOfSummarizedCertificates,
    carrierSerialNumber: cert.carrierSerialNumber,
    otherCertificateNo: cert.otherCertificateNo,
  };

  if (cert.direction === CertificateDirection.INPUT) {
    const input = {
      ...base,
      deductionType: cert.deductionType as DeductionType,
      salesName: cert.salesName ?? '',
      salesIdNumber: cert.salesIdNumber ?? '',
      isSharedAmount: cert.isSharedAmount ?? false,
      buyerName: undefined,
      buyerIdNumber: undefined,
      isReturnOrAllowance: undefined,
    } as unknown as z.infer<typeof CertificateRC2InputSchema>;
    return input;
  } else {
    const output = {
      ...base,
      buyerName: cert.buyerName ?? '',
      buyerIdNumber: cert.buyerIdNumber ?? '',
      isReturnOrAllowance: cert.isReturnOrAllowance ?? false,
      deductionType: undefined,
      salesName: undefined,
      salesIdNumber: undefined,
    } as unknown as z.infer<typeof CertificateRC2OutputSchema>;
    return output;
  }
}

export async function findCertificateRC2ById(certificateId: number) {
  const certificate = await prisma.certificateRC2.findUnique({
    where: { id: certificateId, deletedAt: null },
  });
  if (!certificate) return null;
  return transformCertificateRC2(certificate);
}

export async function listCertificateRC2Input(accountBookId: number) {
  const certificates = await prisma.certificateRC2.findMany({
    where: {
      accountBookId,
      direction: CertificateDirection.INPUT,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
  return certificates
    .map(transformCertificateRC2)
    .filter(
      (c): c is z.infer<typeof CertificateRC2InputSchema> =>
        c.direction === CertificateDirection.INPUT
    );
}

export async function listCertificateRC2Output(accountBookId: number) {
  const certificates = await prisma.certificateRC2.findMany({
    where: {
      accountBookId,
      direction: CertificateDirection.OUTPUT,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });
  return certificates
    .map(transformCertificateRC2)
    .filter(
      (c): c is z.infer<typeof CertificateRC2OutputSchema> =>
        c.direction === CertificateDirection.OUTPUT
    );
}

export async function createCertificateRC2Input(
  data: Omit<
    z.infer<typeof CertificateRC2InputSchema>,
    'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >
) {
  const created = await prisma.certificateRC2.create({
    data: {
      ...data,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      direction: CertificateDirection.INPUT,
    },
  });
  return transformCertificateRC2(created);
}

export async function createCertificateRC2Output(
  data: Omit<
    z.infer<typeof CertificateRC2OutputSchema>,
    'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >
) {
  const created = await prisma.certificateRC2.create({
    data: {
      ...data,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      direction: CertificateDirection.OUTPUT,
    },
  });
  return transformCertificateRC2(created);
}

export async function updateCertificateRC2Input(
  certificateId: number,
  data: Partial<z.infer<typeof CertificateRC2InputSchema>>
) {
  const updated = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: {
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    },
  });
  return transformCertificateRC2(updated);
}

export async function updateCertificateRC2Output(
  certificateId: number,
  data: Partial<z.infer<typeof CertificateRC2OutputSchema>>
) {
  const updated = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: {
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    },
  });
  return transformCertificateRC2(updated);
}

export async function deleteCertificateRC2Input(certificateId: number) {
  const deleted = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: { deletedAt: Math.floor(Date.now() / 1000) },
  });
  return { success: !!deleted };
}

export async function deleteCertificateRC2Output(certificateId: number) {
  const deleted = await prisma.certificateRC2.update({
    where: { id: certificateId },
    data: { deletedAt: Math.floor(Date.now() / 1000) },
  });
  return { success: !!deleted };
}
