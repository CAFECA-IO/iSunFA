import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ISale } from '@/interfaces/project';

export async function listProjectSale(projectId: number) {
  const saleList: ISale[] = await prisma.sale.findMany({
    where: {
      projectId,
    },
  });
  if (!saleList) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return saleList;
}
