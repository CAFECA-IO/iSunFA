import prisma from '@/client';
import { ROLE_NAME } from '@/constants/role_name';

export async function transferOwnership(
  currentOwnerId: number,
  companyId: number,
  newOwnerId: number
) {
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

      if (currentOwner && newOwner) {
        const ownerRole = await tx.role.findUnique({
          where: { name: ROLE_NAME.OWNER },
        });

        if (ownerRole) {
          const updatedNewOwnerAdmin = await tx.admin.update({
            where: { id: newOwner.id },
            data: { roleId: ownerRole.id },
            include: {
              user: true,
              company: true,
              role: true,
            },
          });

          const updatedCurrentOwner = await tx.admin.update({
            where: { id: currentOwner.id },
            data: {
              role: {
                connect: {
                  name: ROLE_NAME.ADMIN,
                },
              },
            },
            include: {
              user: true,
              company: true,
              role: true,
            },
          });

          updatedAdmins.push(updatedNewOwnerAdmin);
          updatedAdmins.push(updatedCurrentOwner);
        }
      }
    }

    return updatedAdmins;
  });

  return result;
}
