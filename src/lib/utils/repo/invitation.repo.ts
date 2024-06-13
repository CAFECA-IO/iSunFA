import prisma from '@/client';
import { ONE_DAY_IN_S } from '@/constants/time';
import { IInvitation } from '@/interfaces/invitation';
import { timestampInSeconds } from '../common';

export async function getInvitationByCode(code: string): Promise<IInvitation> {
  const invitation = (await prisma.invitation.findUnique({
    where: {
      code,
    },
  })) as IInvitation;
  return invitation;
}

export async function createInvitation(
  roleId: number,
  companyId: number,
  userId: number,
  code: string,
  email: string,
  phone: string = ''
): Promise<IInvitation> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invitation: IInvitation = (await prisma.invitation.create({
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
  })) as IInvitation;
  return invitation;
}
