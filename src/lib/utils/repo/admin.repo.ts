import { IAdmin } from '@/interfaces/admin';
import { IInvitation } from '@/interfaces/invitation';
import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';

export async function createAdmin(userId: number, invitation: IInvitation): Promise<IAdmin> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdAdmin = await prisma.admin.create({
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
      user: true,
      company: true,
      role: true,
    },
  });
  return createdAdmin;
}
