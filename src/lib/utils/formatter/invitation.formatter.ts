import { IInvitation } from '@/interfaces/invitation';
import { Invitation } from '@prisma/client';

// Assuming the Invitation model from schema.prisma looks similar to the IInvitation interface
export function formatInvitation(getInvitation: Invitation): IInvitation {
  const formattedInvitation: IInvitation = {
    ...getInvitation,
    phone: getInvitation.phone ?? '',
  };
  return formattedInvitation;
}

export function formatInvitationList(listedInvitations: Invitation[]): IInvitation[] {
  const formattedInvitationList: IInvitation[] = listedInvitations.map((invitation) => {
    const formattedInvitation = formatInvitation(invitation);
    return formattedInvitation;
  });
  return formattedInvitationList;
}
