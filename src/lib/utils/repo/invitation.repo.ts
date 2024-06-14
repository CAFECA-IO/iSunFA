import prisma from '@/client';
import { IInvitation } from '@/interfaces/invitation';

export async function getInvitationByCode(code: string): Promise<IInvitation> {
  const invitation = (await prisma.invitation.findUnique({
    where: {
      code,
    },
  })) as IInvitation;
  return invitation;
}
