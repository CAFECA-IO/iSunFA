import { checkAuthorization } from '@/lib/utils/auth_check';
import { createAdminByInvitation } from '@/lib/utils/repo/transaction/admin_invitation.tx';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { getInvitationByCode } from '@/lib/utils/repo/invitation.repo';
import { formatInvitation } from '@/lib/utils/formatter/invitation.formatter';
import { IAdmin } from '@/interfaces/admin';
import { AuthFunctionsKeys } from '@/interfaces/auth';

export async function useInvitation(
  invitationCode: string,
  userId: number
): Promise<IAdmin | null> {
  let admin = null;

  const invitation = await getInvitationByCode(invitationCode);
  if (invitation) {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.invitation], { invitation });
    if (isAuth) {
      const getAdmin = await getAdminByCompanyIdAndUserId(invitation.companyId, userId);
      if (!getAdmin) {
        const formattedInvitation = formatInvitation(invitation);
        admin = await createAdminByInvitation(userId, formattedInvitation);
      }
    }
  }
  return admin;
}
