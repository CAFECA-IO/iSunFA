import prisma from '@/client';
import { ROLE_NAME } from '@/constants/role_name';
import { timestampInSeconds } from '@/lib/utils/common';

export async function transferOwnership(
  currentOwnerId: number,
  companyId: number,
  newOwnerId: number
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const result = await prisma.$transaction(async (tx) => {
    const updatedAdmins = [];

    if (currentOwnerId > 0 && companyId > 0 && newOwnerId > 0) {
      const currentOwner = await tx.admin.findFirst({
        where: {
          userId: currentOwnerId,
          companyId,
          role: {
            name: ROLE_NAME.OWNER,
          },
        },
      });

      const newOwner = await tx.admin.findFirst({
        where: {
          userId: newOwnerId,
          companyId,
        },
      });

      if (currentOwner) {
        const updatedCurrentOwner = await tx.admin.update({
          where: { id: currentOwner.id },
          data: {
            role: {
              connect: {
                name: ROLE_NAME.ADMIN,
              },
            },
            updatedAt: nowTimestamp,
            // Todo (20240722 - Jacky) should add a deleteAt
          },
          include: {
            user: true,
            company: true,
            role: true,
          },
        });

        updatedAdmins.push(updatedCurrentOwner);
        if (newOwner) {
          const updatedNewOwnerAdmin = await tx.admin.update({
            where: { id: newOwner.id },
            data: {
              role: {
                connect: {
                  name: ROLE_NAME.ADMIN,
                },
              },
              updatedAt: nowTimestamp,
            },
            include: {
              user: true,
              company: true,
              role: true,
            },
          });

          updatedAdmins.push(updatedNewOwnerAdmin);
        } else {
          const newOwnerAdmin = await tx.admin.create({
            data: {
              userId: newOwnerId,
              companyId,
              roleId: currentOwner.roleId,
              email: '',
              status: true,
              startDate: nowTimestamp,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp,
            },
            include: {
              user: true,
              company: true,
              role: true,
            },
          });

          updatedAdmins.push(newOwnerAdmin);
        }
      }
    }

    return updatedAdmins;
  });

  return result;
}
