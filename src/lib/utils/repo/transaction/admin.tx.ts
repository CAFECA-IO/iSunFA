import prisma from '@/client';
import { SortOrder } from '@/constants/sort';

export async function resetAdminCompanyOrder(userId: number) {
  await prisma.$transaction(async (tx) => {
    const adminList = await tx.admin.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: SortOrder.DESC,
      },
    });

    await Promise.all(
      adminList.map((admin, index) =>
        tx.admin.update({
          where: {
            id: admin.id,
          },
          data: {
            createdAt: adminList.length - index, // ToDo: (20241017 - Jacky) Should enum the order by, companyOrder
          },
        }))
    );
  });
}
