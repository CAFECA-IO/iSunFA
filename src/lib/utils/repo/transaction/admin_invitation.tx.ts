import prisma from '@/client';
import { IInvitation } from '@/interfaces/invitation';
import { IAdmin } from '@/interfaces/admin';
import { timestampInSeconds } from '@/lib/utils/common';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';

export async function createAdminByInvitation(userId: number, invitation: IInvitation) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const admin = await prisma.$transaction(async (tx) => {
    const createdAdmin = await tx.admin.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        company: {
          connect: {
            id: invitation.companyId,
          },
        },
        role: {
          connect: {
            id: invitation.roleId,
          },
        },
        email: invitation.email,
        status: true,
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
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
    await tx.invitation.update({
      where: {
        code: invitation.code,
      },
      data: {
        hasUsed: true,
        updatedAt: nowTimestamp,
      },
    });
    const formattedAdmin: IAdmin = await formatAdmin(createdAdmin);
    return formattedAdmin;
  });
  return admin;
}
