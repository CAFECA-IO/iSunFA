import { IInvitation } from '@/interfaces/invitation';
import { Invitation } from '@prisma/client';

// Assuming the Invitation model from schema.prisma looks similar to the IInvitation interface
export function formatPrismaInvitationToIInvitation(getInvitation: Invitation): IInvitation {
  const formattedInvitation: IInvitation = {
    ...getInvitation,
    phone: getInvitation.phone ?? '',
  };
  return formattedInvitation;
}
