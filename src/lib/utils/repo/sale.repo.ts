import prisma from '@/client';
import { ISale } from '@/interfaces/project';

export async function listProjectSale(projectId: number) {
  let saleList: ISale[] = [];
  if (projectId > 0) {
    saleList = await prisma.sale.findMany({
      where: {
        projectId,
      },
    });
  }
  return saleList;
}
