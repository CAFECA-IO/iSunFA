import prisma from '@/client';
import { Prisma } from '@prisma/client';
import { IAssetExportRequestBody } from '@/interfaces/export_file';

export async function exportAssets(body: IAssetExportRequestBody, companyId: number) {
  const { filters, sort } = body;

  // 構建 Prisma where 條件
  const where: Prisma.AssetWhereInput = {
    companyId,
    deletedAt: null,
  };

  // 處理過濾條件
  if (filters) {
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      where.acquisitionDate = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    if (filters.searchQuery) {
      where.name = {
        contains: filters.searchQuery,
      };
    }
  }

  // 構建 Prisma orderBy 條件
  const orderBy: Prisma.AssetOrderByWithRelationInput[] = [];
  if (sort?.length) {
    sort.forEach((sortOption) => {
      orderBy.push({
        [sortOption.by]: sortOption.order,
      });
    });
  }

  // 從資料庫獲取資產資料
  const assets = await prisma.asset.findMany({
    where,
    orderBy: orderBy.length > 0 ? orderBy : undefined,
    select: {
      acquisitionDate: true,
      name: true,
      purchasePrice: true,
      accumulatedDepreciation: true,
      residualValue: true,
      remainingLife: true,
      type: true,
      status: true,
      number: true,
    },
  });

  return assets;
}
