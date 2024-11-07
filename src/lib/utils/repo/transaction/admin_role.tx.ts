import prisma from '@/client';
import { CompanyRoleName } from '@/constants/role';
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
            name: CompanyRoleName.OWNER,
          },
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
        },
      });

      const newOwner = await tx.admin.findFirst({
        where: {
          userId: newOwnerId,
          companyId,
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
        },
      });

      if (currentOwner) {
        const updatedCurrentOwner = await tx.admin.update({
          where: { id: currentOwner.id },
          data: {
            updatedAt: nowTimestamp,
            deletedAt: nowTimestamp,
            endDate: nowTimestamp,
          },
          include: {
            user: {
              include: {
                userAgreements: true,
                imageFile: true,
              },
            },
            company: {
              include: {
                imageFile: true,
              },
            },
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
                  name: CompanyRoleName.OWNER,
                },
              },
              updatedAt: nowTimestamp,
            },
            include: {
              user: {
                include: {
                  imageFile: true,
                  userAgreements: true,
                },
              },
              company: {
                include: {
                  imageFile: true,
                },
              },
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
              user: {
                include: {
                  imageFile: true,
                  userAgreements: true,
                },
              },
              company: {
                include: {
                  imageFile: true,
                },
              },
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
