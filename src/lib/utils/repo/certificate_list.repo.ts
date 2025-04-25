import { z } from 'zod';
import prisma from '@/client';
import { ISessionData } from '@/interfaces/session';
import { InvoiceTransactionDirection, InvoiceTaxType, InputInvoiceType, OutputInvoiceType } from '@/constants/invoice';
import { ICertificateInput, ICertificateOutput } from '@/interfaces/certificate';
import { IPaginatedData } from '@/interfaces/pagination';
import {
  CertificateRC2,
  InvoiceRC2,
  VoucherCertificateRC2,
  Voucher,
  File,
  User,
  Prisma,
} from '@prisma/client';
import { isCertificateIncompleteByType } from '@/lib/utils/certificate';
import { certificateRC2ListQueryValidator } from '@/lib/utils/zod_schema/certificate';
import { InvoiceTabs } from '@/constants/certificate';
import { SortOrder } from '@/constants/sort';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { certificateAPIPostUtils } from '@/pages/api/v2/company/[companyId]/certificate/route_utils';
import { IFileBeta } from '@/interfaces/file';
import { CurrencyType } from '@/constants/currency';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';

function getVoucherCertificateFilter(tab?: InvoiceTabs) {
  if (!tab) return undefined;
  if (tab === InvoiceTabs.WITH_VOUCHER) {
    return {
      some: { deletedAt: null },
    };
  }
  if (tab === InvoiceTabs.WITHOUT_VOUCHER) {
    return {
      none: {},
    };
  }
  return undefined;
}

async function getFilteredCertificateListByType(
  query: z.infer<typeof certificateRC2ListQueryValidator>,
  type: InvoiceTransactionDirection
) {
  const where: Prisma.CertificateRC2WhereInput = {
    accountbookId: query.accountbookId,
    deletedAt: query.isDeleted ? { not: null } : query.isDeleted === false ? null : undefined,
    inputOrOutput: type,
    invoice: {
      some: {
        deletedAt: null,
        ...(query.type ? { type: query.type } : {}),
      },
    },
    ...(query.tab ? { voucherCertificates: getVoucherCertificateFilter(query.tab) } : {}),
    ...(query.searchQuery
      ? {
          OR: [
            {
              file: {
                name: { contains: query.searchQuery },
              },
            },
            {
              invoice: {
                some: {
                  no: { contains: query.searchQuery },
                },
              },
            },
          ],
        }
      : {}),
  };

  const certificates = await prisma.certificateRC2.findMany({
    where,
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    orderBy: [{ createdAt: SortOrder.DESC }],
    include: {
      invoice: true,
      file: true,
      uploader: { include: { imageFile: true } },
      voucherCertificates: { include: { voucher: true } },
    },
  });

  const totalCount = await prisma.certificateRC2.count({ where });
  return { data: certificates, totalCount };
}

async function getCertificateSummaryByType(companyId: number, type: InvoiceTransactionDirection) {
  const totalInvoicePrice = await prisma.invoiceRC2.aggregate({
    where: {
      inputOrOutput: type,
      deletedAt: null,
      certificate: { accountbookId: companyId, deletedAt: null },
    },
    _sum: { totalPrice: true },
  });

  const incompleteCount = await prisma.invoiceRC2.count({
    where: {
      inputOrOutput: type,
      deletedAt: null,
      certificate: { accountbookId: companyId, deletedAt: null },
    },
  });

  return {
    // eslint-disable-next-line no-underscore-dangle
    totalInvoicePrice: totalInvoicePrice._sum.totalPrice || 0,
    incomplete: { count: incompleteCount },
    unRead: { withVoucher: 0, withoutVoucher: 0 },
    currency: 'TWD',
  };
}

function transformCertificateByType(
  cert: CertificateRC2 & {
    invoice: InvoiceRC2[];
    voucherCertificates: (VoucherCertificateRC2 & { voucher: Voucher })[];
    uploader: User & { imageFile: File };
    file: File;
  },
  type: InvoiceTransactionDirection
): ICertificateInput | ICertificateOutput {
  const invoice = cert.invoice[0];
  const voucher = cert.voucherCertificates[0]?.voucher;
  const fileEntity = parsePrismaFileToFileEntity(cert.file);
  const fileURL = certificateAPIPostUtils.transformFileURL(fileEntity);

  const file: IFileBeta = {
    id: fileEntity.id,
    name: fileEntity.name,
    size: fileEntity.size,
    url: fileURL,
    existed: true,
  };

  const base = {
    id: cert.id,
    name: cert.file.name,
    accountbookId: cert.accountbookId,
    incomplete: false,
    uploader: cert.uploader.name,
    uploaderUrl: cert.uploader.imageFile?.url || '',
    createdAt: cert.createdAt,
    updatedAt: cert.updatedAt,
    aiResultId: cert.aiResultId,
    aiStatus: cert.aiStatus,
    file,
    invoice: invoice
      ? {
          ...invoice,
          taxType: invoice.taxType as InvoiceTaxType,
          currencyAlias: invoice.currencyAlias as CurrencyType,
          type: invoice.type as InputInvoiceType | OutputInvoiceType,
          inputOrOutput: invoice.inputOrOutput as InvoiceTransactionDirection,
        }
      : {},
    voucherNo: voucher?.no || null,
    voucherId: voucher?.id || null,
  };

  const completeBase = {
    ...base,
    inputOrOutput: type,
  } as ICertificateInput | ICertificateOutput;

  base.incomplete = isCertificateIncompleteByType(completeBase, type);

  return type === InvoiceTransactionDirection.INPUT
    ? { ...base, inputOrOutput: InvoiceTransactionDirection.INPUT }
    : { ...base, inputOrOutput: InvoiceTransactionDirection.OUTPUT };
}

async function checkUserHasCompanyAccess(session: ISessionData, companyId: number) {
  const { teams } = session;
  const company = await getCompanyById(companyId);
  if (!company) {
    const error = new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    error.name = STATUS_CODE.RESOURCE_NOT_FOUND;
    throw error;
  }

  const { teamId: companyTeamId } = company;
  if (!companyTeamId) {
    const error = new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    error.name = STATUS_CODE.RESOURCE_NOT_FOUND;
    throw error;
  }

  const userTeam = teams?.find((team) => team.id === companyTeamId);
  if (!userTeam) {
    const error = new Error(STATUS_MESSAGE.FORBIDDEN);
    error.name = STATUS_CODE.FORBIDDEN;
    throw error;
  }

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam?.role as TeamRole,
    canDo: TeamPermissionAction.VIEW_CERTIFICATE,
  });
  if (!assertResult.can) {
    const error = new Error(STATUS_MESSAGE.FORBIDDEN);
    error.name = STATUS_CODE.FORBIDDEN;
    throw error;
  }
}

export const getPaginatedCertificateListByType = async (
  query: z.infer<typeof certificateRC2ListQueryValidator>,
  session: ISessionData,
  type: InvoiceTransactionDirection
): Promise<IPaginatedData<(ICertificateInput | ICertificateOutput)[]> | null> => {
  await checkUserHasCompanyAccess(session, query.accountbookId);

  const { data, totalCount } = await getFilteredCertificateListByType(query, type);
  const transformedData = data.map((certificate) => transformCertificateByType(certificate, type));
  const summary = await getCertificateSummaryByType(query.accountbookId, type);

  return {
    page: query.page,
    pageSize: query.pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / query.pageSize),
    hasNextPage: query.page * query.pageSize < totalCount,
    hasPreviousPage: query.page > 1,
    sort: query.sortOption ?? [],
    data: transformedData,
    note: JSON.stringify(summary),
  };
};
