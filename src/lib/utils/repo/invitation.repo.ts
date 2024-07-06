import prisma from '@/client';
import { ONE_DAY_IN_S } from '@/constants/time';
import { timestampInSeconds } from '@/lib/utils/common';
import { Invitation } from '@prisma/client';

export async function getInvitationByCode(code: string): Promise<Invitation | null> {
  const invitation = await prisma.invitation.findUnique({
    where: {
      code,
    },
  });
  return invitation;
}

export async function createInvitation(
  roleId: number,
  companyId: number,
  userId: number,
  code: string,
  email: string,
  phone: string = ''
): Promise<Invitation> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invitation: Invitation = await prisma.invitation.create({
    data: {
      role: {
        connect: {
          id: roleId,
        },
      },
      company: {
        connect: {
          id: companyId,
        },
      },
      createdUser: {
        connect: {
          id: userId,
        },
      },
      code,
      email,
      phone,
      hasUsed: false,
      expiredAt: nowTimestamp + ONE_DAY_IN_S,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return invitation;
}

export async function deleteInvitation(id: number): Promise<Invitation> {
  const deletedInvitation = await prisma.invitation.delete({
    where: {
      id,
    },
  });
  return deletedInvitation;
}
