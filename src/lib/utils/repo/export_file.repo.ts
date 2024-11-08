import prisma from '@/client';
import { Prisma } from '@prisma/client';
import { IAssetExportRequestBody } from '@/interfaces/export_file';

export async function exportAssets(body: IAssetExportRequestBody, companyId: number) {
  const { filters, sort } = body;

  const where: Prisma.AssetWhereInput = {
    companyId,
    deletedAt: null,
  };

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

  const orderBy: Prisma.AssetOrderByWithRelationInput[] = [];
  if (sort?.length) {
    sort.forEach((sortOption) => {
      orderBy.push({
        [sortOption.by]: sortOption.order,
      });
    });
  }

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
