import { createAdminByInvitation } from '@/lib/utils/repo/transaction/admin_invitation.tx';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { formatInvitation } from '@/lib/utils/formatter/invitation.formatter';
import { IAdmin } from '@/interfaces/admin';
import { Invitation } from '@prisma/client';
import { timestampInSeconds } from './common';

export async function useInvitation(
  invitation: Invitation,
  userId: number
): Promise<IAdmin | null> {
  let admin = null;
  if (userId > 0) {
    const getAdmin = await getAdminByCompanyIdAndUserId(invitation.companyId, userId);
    if (!getAdmin) {
      const formattedInvitation = formatInvitation(invitation);
      admin = await createAdminByInvitation(userId, formattedInvitation);
    }
  }
  return admin;
}

export async function isInvitationValid(invitation: Invitation): Promise<boolean> {
  let isValid = false;

  if (invitation) {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    isValid = !invitation.hasUsed && invitation.expiredAt >= nowTimestamp;
  }

  return isValid;
}
