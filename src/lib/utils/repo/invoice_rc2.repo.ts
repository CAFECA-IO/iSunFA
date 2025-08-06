import prisma from '@/client';
import { InvoiceType as PrismaInvoiceType, Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  listInvoiceRC2QuerySchema,
  InvoiceRC2InputSchema,
  InvoiceRC2OutputSchema,
  createInvoiceRC2QuerySchema,
  createInvoiceRC2BodySchema,
  listInvoiceRC2Grouped,
} from '@/lib/utils/zod_schema/invoice_rc2';
import { CurrencyCode, InvoiceDirection, InvoiceTab, InvoiceType } from '@/constants/invoice_rc2';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { getTimestampNow } from '@/lib/utils/common';
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { getPusherInstance } from '@/lib/utils/pusher';
import { INVOICE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { SortBy, SortOrder } from '@/constants/sort';
import { checkStorageLimit } from '@/lib/utils/plan/check_plan_limit';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { IPaginatedData } from '@/interfaces/pagination';

export function getImageUrlFromFileIdV2(fileId: number, accountBookId: number): string {
  return `/api/v2/account_book/${accountBookId}/image/${fileId}`;
}

export const createOrderByList = (
  sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]
): Prisma.InvoiceRC2OrderByWithRelationInput[] => {
  return sortOptions
    .map(({ sortBy, sortOrder }) => {
      switch (sortBy) {
        case SortBy.DATE:
          return [{ issuedDate: sortOrder }];
        case SortBy.INVOICE_TYPE:
          return [{ type: sortOrder }];
        case SortBy.AMOUNT:
          return [{ totalAmount: sortOrder }];
        case SortBy.VOUCHER_NUMBER:
          return [{ voucher: { no: sortOrder } }];
        case SortBy.INVOICE_NUMBER:
          // Info: (20250513 - Tzuhan) sort by `no`, fallback to `otherCertificateNo` if `no` is null
          return [{ no: sortOrder }, { otherCertificateNo: sortOrder }];
        default:
          return [{ createdAt: SortOrder.DESC }];
      }
    })
    .flat();
};

export type InvoiceRC2WithFullRelations = Prisma.InvoiceRC2GetPayload<{
  include: {
    file: { include: { thumbnail: true } };
    uploader: true;
    voucher: true;
  };
}>;

type InvoiceRC2InputType = z.infer<typeof InvoiceRC2InputSchema>;
type InvoiceRC2OutputType = z.infer<typeof InvoiceRC2OutputSchema>;
type InvoiceRC2Type = InvoiceRC2InputType | InvoiceRC2OutputType;

export function isInvoiceRC2Complete(cert: InvoiceRC2Type): boolean {
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
  const requiredByType: Partial<Record<InvoiceType, (keyof InvoiceRC2Type)[]>> = {
    [InvoiceType.INPUT_21]: ['deductionType', 'salesName'],
    [InvoiceType.INPUT_22]: ['deductionType', 'salesName'],
    [InvoiceType.INPUT_23]: ['deductionType', 'salesName'],
    [InvoiceType.INPUT_24]: ['deductionType', 'salesName'],
    [InvoiceType.INPUT_25]: ['deductionType', 'salesName', 'isSharedAmount'],
    [InvoiceType.INPUT_26]: ['deductionType', 'salesName'],
    [InvoiceType.INPUT_27]: ['deductionType', 'salesName'],
    [InvoiceType.INPUT_28]: ['deductionType'],
    [InvoiceType.INPUT_29]: ['deductionType'],
    [InvoiceType.OUTPUT_31]: ['buyerName'],
    [InvoiceType.OUTPUT_32]: ['buyerName'],
    [InvoiceType.OUTPUT_35]: ['buyerName'],
    [InvoiceType.OUTPUT_36]: ['buyerName'],
  };
  const requiredFields = requiredByType[cert.type] || [];
  return requiredFields.every((key) => {
    const val = cert[key];
    if (typeof val === 'string') return val.trim().length > 0;
    return val !== undefined && val !== null;
  });
}

export function transformInput(
  cert: InvoiceRC2WithFullRelations
): z.infer<typeof InvoiceRC2InputSchema> {
  const fileWithThumbnail = {
    ...cert.file,
    url: getImageUrlFromFileIdV2(cert.file.id, cert.accountBookId),
    ...(cert.file.thumbnail && {
      thumbnail: {
        id: cert.file.thumbnail.id,
        name: cert.file.thumbnail.name,
        size: cert.file.thumbnail.size,
        url: getImageUrlFromFileIdV2(cert.file.thumbnail.id, cert.accountBookId),
      },
    }),
  };

  const invoiceRC2Input = InvoiceRC2InputSchema.parse({
    ...cert,
    file: fileWithThumbnail,
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
  invoiceRC2Input.incomplete = !isInvoiceRC2Complete(invoiceRC2Input);
  return invoiceRC2Input;
}

export function transformOutput(
  cert: InvoiceRC2WithFullRelations
): z.infer<typeof InvoiceRC2OutputSchema> {
  const fileWithThumbnail = {
    ...cert.file,
    url: getImageUrlFromFileIdV2(cert.file.id, cert.accountBookId),
    ...(cert.file.thumbnail && {
      thumbnail: {
        id: cert.file.thumbnail.id,
        name: cert.file.thumbnail.name,
        size: cert.file.thumbnail.size,
        url: getImageUrlFromFileIdV2(cert.file.thumbnail.id, cert.accountBookId),
      },
    }),
  };

  const invoiceRC2Output = InvoiceRC2OutputSchema.parse({
    ...cert,
    file: fileWithThumbnail,
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
  invoiceRC2Output.incomplete = !isInvoiceRC2Complete(invoiceRC2Output);
  return invoiceRC2Output;
}

export async function findInvoiceRC2ById(data: {
  userId: number;
  accountBookId: number;
  invoiceId: number;
}) {
  const { userId, accountBookId, invoiceId } = data;
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_CERTIFICATE,
  });
  const cert = await prisma.invoiceRC2.findUnique({
    where: { id: invoiceId, deletedAt: null },
    include: {
      file: {
        include: {
          thumbnail: true,
        },
      },
      voucher: true,
      uploader: true,
    },
  });
  if (!cert) return null;
  return cert.direction === InvoiceDirection.INPUT ? transformInput(cert) : transformOutput(cert);
}

type InvoiceRC2MappedOutput<T extends InvoiceDirection> = T extends InvoiceDirection.INPUT
  ? z.infer<typeof InvoiceRC2InputSchema>
  : z.infer<typeof InvoiceRC2OutputSchema>;

export async function listInvoiceRC2ByDirection<
  T extends InvoiceDirection.INPUT | InvoiceDirection.OUTPUT,
>(
  userId: number,
  query: z.infer<typeof listInvoiceRC2QuerySchema>,
  direction: T
): Promise<IPaginatedData<InvoiceRC2MappedOutput<T>[]>> {
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

  const whereClause: Prisma.InvoiceRC2WhereInput = {
    accountBookId,
    direction,
    deletedAt: isDeleted === true ? { not: null } : isDeleted === false ? null : undefined,
    voucherId:
      tab === InvoiceTab.WITHOUT_VOUCHER
        ? null
        : tab === InvoiceTab.WITH_VOUCHER
          ? { not: null }
          : undefined,
    type: type ?? undefined,
    issuedDate: {
      gte: startDate || undefined,
      lte: endDate || undefined,
    },
    OR: searchQuery
      ? [
          ...(direction === InvoiceDirection.INPUT
            ? [
                { salesName: { contains: searchQuery, mode: 'insensitive' as const } },
                { salesIdNumber: { contains: searchQuery, mode: 'insensitive' as const } },
              ]
            : [
                { buyerName: { contains: searchQuery, mode: 'insensitive' as const } },
                { buyerIdNumber: { contains: searchQuery, mode: 'insensitive' as const } },
              ]),
          { no: { contains: searchQuery, mode: 'insensitive' as const } },
        ]
      : undefined,
  };

  const [totalCount, invoices, totalPrice] = await Promise.all([
    prisma.invoiceRC2.count({ where: whereClause }),
    prisma.invoiceRC2.findMany({
      where: whereClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: createOrderByList(sortOption || []),
      include: {
        file: { include: { thumbnail: true } },
        voucher: true,
        uploader: true,
      },
    }),
    prisma.invoiceRC2.aggregate({
      where: {
        accountBookId,
        direction,
        deletedAt: isDeleted === true ? { not: null } : isDeleted === false ? null : undefined,
        voucherId:
          tab === InvoiceTab.WITHOUT_VOUCHER
            ? null
            : tab === InvoiceTab.WITH_VOUCHER
              ? { not: null }
              : undefined,
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const transformer = direction === InvoiceDirection.INPUT ? transformInput : transformOutput;

  const transformed: InvoiceRC2MappedOutput<T>[] = invoices.map(
    (cert) => transformer(cert) as InvoiceRC2MappedOutput<T>
  );
  const accountSetting: PrismaAccountingSetting | null =
    await getAccountingSettingByCompanyId(accountBookId);
  const currency = (accountSetting?.currency as CurrencyCode) || CurrencyCode.TWD;

  let extraStats: Record<string, unknown> = {};

  const [withVoucher, withoutVoucher] = await Promise.all([
    prisma.invoiceRC2.count({
      where: {
        accountBookId,
        direction,
        voucherId: { not: null },
        deletedAt: null,
      },
    }),
    prisma.invoiceRC2.count({
      where: {
        accountBookId,
        direction,
        voucherId: null,
        deletedAt: null,
      },
    }),
  ]);
  extraStats = { count: { withVoucher, withoutVoucher } };

  return toPaginatedData<InvoiceRC2MappedOutput<T>[]>({
    ...query,
    totalCount,
    data: transformed,
    note: JSON.stringify({
      totalPrice,
      currency,
      ...extraStats,
    }),
  });
}

export const listInvoiceRC2Input = (
  userId: number,
  query: z.infer<typeof listInvoiceRC2QuerySchema>
) => listInvoiceRC2ByDirection(userId, query, InvoiceDirection.INPUT);

export const listInvoiceRC2Output = (
  userId: number,
  query: z.infer<typeof listInvoiceRC2QuerySchema>
) => listInvoiceRC2ByDirection(userId, query, InvoiceDirection.OUTPUT);

export async function listInvoiceRC2GroupedByDirection(
  userId: number,
  query: z.infer<typeof listInvoiceRC2Grouped.input.querySchema>
): Promise<
  IPaginatedData<(z.infer<typeof InvoiceRC2InputSchema> | z.infer<typeof InvoiceRC2OutputSchema>)[]>
> {
  const { direction } = query;

  if (direction === InvoiceDirection.INPUT) {
    const input = await listInvoiceRC2ByDirection(userId, query, InvoiceDirection.INPUT);
    return input;
  }

  if (direction === InvoiceDirection.OUTPUT) {
    const output = await listInvoiceRC2ByDirection(userId, query, InvoiceDirection.OUTPUT);
    return output;
  }
  const [inputPaginated, outputPaginated] = await Promise.all([
    listInvoiceRC2ByDirection(userId, query, InvoiceDirection.INPUT),
    listInvoiceRC2ByDirection(userId, query, InvoiceDirection.OUTPUT),
  ]);

  return toPaginatedData({
    data: [...inputPaginated.data, ...outputPaginated.data],
  });
}

export async function createInvoiceRC2(
  userId: number,
  query: z.infer<typeof createInvoiceRC2QuerySchema>,
  body: z.infer<typeof createInvoiceRC2BodySchema>
) {
  const can = await assertUserCanByAccountBook({
    userId,
    accountBookId: query.accountBookId,
    action: TeamPermissionAction.CREATE_CERTIFICATE,
  });

  const file = await prisma.file.findUnique({
    where: { id: body.fileId },
  });
  if (!file) {
    const error = new Error(STATUS_MESSAGE.FILE_NOT_FOUND);
    error.name = STATUS_CODE.LIMIT_EXCEEDED_STORAGE;
    throw error;
  }

  await checkStorageLimit(can.teamId, file?.size ?? 0);

  const now = getTimestampNow();

  const invoiceRC2 = await prisma.invoiceRC2.create({
    data: {
      ...body,
      accountBookId: query.accountBookId,
      uploaderId: userId,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      file: {
        include: {
          thumbnail: true,
        },
      },
      voucher: true,
      uploader: true,
    },
  });
  const invoice =
    body.direction === InvoiceDirection.INPUT
      ? transformInput(invoiceRC2)
      : transformOutput(invoiceRC2);

  const pusher = getPusherInstance();

  pusher.trigger(`${PRIVATE_CHANNEL.INVOICE}-${query.accountBookId}`, INVOICE_EVENT.CREATE, {
    message: JSON.stringify(invoice),
  });

  return invoice;
}

export async function updateInvoiceRC2Input(
  userId: number,
  accountBookId: number,
  invoiceId: number,
  data: Partial<z.infer<typeof InvoiceRC2InputSchema>>
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.UPDATE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const { id, createdAt, file, uploaderName, voucherNo, ...rest } = data;

  const certForCheck: InvoiceRC2Type = {
    ...rest,
    direction: InvoiceDirection.INPUT,
    uploaderId: userId,
    uploaderName: uploaderName ?? '',
    voucherId: rest.voucherId ?? null,
    voucherNo: voucherNo ?? null,
    file,
    note: rest.note ?? {},
  } as InvoiceRC2InputType;

  const incomplete = !isInvoiceRC2Complete(certForCheck);

  const updated = await prisma.invoiceRC2.update({
    where: { id: invoiceId },
    data: {
      ...rest,
      note: JSON.stringify(data.note ?? {}) ?? null,
      type: data.type as PrismaInvoiceType,
      incomplete,
      updatedAt: now,
    },
    include: {
      file: {
        include: {
          thumbnail: true,
        },
      },
      voucher: true,
      uploader: true,
    },
  });
  return transformInput(updated);
}

export async function updateInvoiceRC2Output(
  userId: number,
  accountBookId: number,
  invoiceId: number,
  data: Partial<z.infer<typeof InvoiceRC2OutputSchema>>
) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.UPDATE_CERTIFICATE,
  });
  const now = getTimestampNow();
  const { id, createdAt, file, uploaderName, voucherNo, ...rest } = data;

  const certForCheck: InvoiceRC2Type = {
    ...rest,
    direction: InvoiceDirection.OUTPUT,
    uploaderId: userId,
    uploaderName: uploaderName ?? '',
    voucherId: rest.voucherId ?? null,
    voucherNo: voucherNo ?? null,
    file,
    note: rest.note ?? {},
  } as InvoiceRC2OutputType;

  const incomplete = !isInvoiceRC2Complete(certForCheck);

  const updated = await prisma.invoiceRC2.update({
    where: { id: invoiceId },
    data: {
      ...rest,
      note: JSON.stringify(data.note ?? {}) ?? null,
      type: data.type as PrismaInvoiceType,
      incomplete,
      updatedAt: now,
    },
    include: {
      file: {
        include: {
          thumbnail: true,
        },
      },
      voucher: true,
      uploader: true,
    },
  });
  return transformOutput(updated);
}

export async function deleteInvoiceRC2(userId: number, accountBookId: number, invoiceds: number[]) {
  await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.DELETE_CERTIFICATE,
  });
  const now = getTimestampNow();

  const deleted = await prisma.invoiceRC2.updateMany({
    where: {
      id: { in: invoiceds },
      accountBookId, // Info: (20250509 - Tzuhan) 保險：避免誤刪其他帳本的資料
      deletedAt: null,
    },
    data: { deletedAt: now },
  });

  return {
    success: deleted.count > 0,
    deletedIds: deleted.count > 0 ? invoiceds : [],
  };
}
