import { NextApiRequest } from 'next';
import { getSession, setSession } from '@/lib/utils/session';
import { createUserByAuth, getUserByCredential } from '@/lib/utils/repo/authentication.repo';
import { AdapterUser } from 'next-auth/adapters';
import { Account, User } from 'next-auth';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder, PUBLIC_IMAGE_ID } from '@/constants/file';
import { APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { DefaultValue } from '@/constants/default_value';
import { createDefaultTeamForUser } from '@/lib/utils/repo/team.repo';
import { handleInviteTeamMember } from '@/lib/utils/repo/user.repo';
import { getUserTeams } from '@/lib/utils/repo/team_member.repo';
import { createExternalUser } from '@/lib/utils/repo/external_user.repo';

export const fetchImageInfo = async (
  imageUrl: string
): Promise<{
  iconUrl: string;
  mimeType: string;
  size: number;
}> => {
  let mimeType = 'image/jpeg'; // Info: (20240902 - Murky) Default image type is jpeg
  let size = 0;

  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      mimeType = blob.type;
      size = blob.size;
    }
  } catch {
    // Info: (20240902 - Murky) Do nothing
  }

  return {
    iconUrl: imageUrl,
    mimeType,
    size,
  };
};

export const handleSignInSession = async (
  req: NextApiRequest,
  user: User | AdapterUser,
  account:
    | Account
    | {
        provider: string;
        providerAccountId: string;
        type: string;
      }
) => {
  let session = await getSession(req);
  // Info: (20240829 - Anna) 邀請碼後續會使用，目前先註解
  // let Dbuser;
  // const { invitation } = (account?.params || {}) as { invitation: string };
  const existingUser = await getUserByCredential(account.providerAccountId || user.id);
  if (!existingUser) {
    // Info: (20241127 - tzuhan) 如果用戶不存在，創建用戶
    let userImage = {
      iconUrl: user.image ?? '',
      mimeType: 'image/jpeg',
      size: 0,
    };

    if (user.image) {
      userImage = await fetchImageInfo(user.image);
    } else {
      userImage = await generateIcon(user.name ?? '');
    }

    const imageName = `${user.name || 'user'}_icon`;
    const file = await createFile({
      name: imageName,
      size: userImage.size,
      mimeType: userImage.mimeType,
      type: FileFolder.TMP,
      url: userImage.iconUrl,
      isEncrypted: false,
      encryptedSymmetricKey: '',
    });

    const createdUser = await createUserByAuth({
      name: user.name || '',
      email: user.email || '',
      provider: account.provider,
      credentialId: account.providerAccountId,
      method: account.type,
      authData: account,
      imageId: file?.id ?? PUBLIC_IMAGE_ID,
    });

    await createDefaultTeamForUser(createdUser.user.id, createdUser.user.name);
    await handleInviteTeamMember(createdUser.user.id, createdUser.user.email ?? '');

    // Info: (20250324 - Shirley) 獲取用戶所屬的所有團隊及其角色
    const userTeams = await getUserTeams(createdUser.user.id);

    session = await setSession(session, {
      userId: createdUser.user.id,
      teams: userTeams,
    });

    // Info: (20240829 - Anna) 與邀請碼相關，目前先註解
    // Dbuser = createdUser;
  } else {
    // Info: (20240829 - Anna) 與邀請碼相關，目前先註解
    // Dbuser = getUser;
    // ToDo: (20241121 - Jacky) Delete User from DB if deletedAt + 7 days is less than current date

    // Info: (20250324 - Shirley) 獲取用戶所屬的所有團隊及其角色
    const userTeams = await getUserTeams(existingUser.user.id);

    session = await setSession(session, {
      userId: existingUser.user.id,
      teams: userTeams,
    });
  }

  // Info: (20250630 - Luphia) 若 Session 存在 External User，於資料庫內登記外部用戶綁定
  if (session.external && session.userId) {
    const externalUser = {
      userId: session.userId,
      externalId: session.external.uid,
      externalProvider: session.external.provider,
    };
    await createExternalUser(externalUser);
  }

  const log = {
    sessionId: session.isunfa,
    userId: session.userId || DefaultValue.USER_ID.UNKNOWN,
    actionType: UserActionLogActionType.LOGIN,
    actionDescription: UserActionLogActionType.LOGIN,
    ipAddress: req.headers['x-forwarded-for'] as string,
    userAgent: req.headers['user-agent'] as string,
    apiEndpoint: req.url || APIPath.SIGN_IN,
    httpMethod: req.method || '',
    requestPayload: req.body,
    statusMessage: STATUS_MESSAGE.SUCCESS,
  };
  await createUserActionLog(log);
  /* Info: (20240829 - Anna) 邀請碼後續會使用，目前先註解
  if (invitationCode) {
    const getInvitation = await getInvitationByCode(invitationCode);
    if (getInvitation) {
      const isValid = await isInvitationValid(getInvitation);
      if (isValid) {
        await useInvitation(getInvitation, Dbuser?.id ?? 0);
        // ToDo: (20240829 - Jacky) Add error handling with logger
        // statusMessage = admin
        //   ? STATUS_MESSAGE.CREATED_INVITATION
        //   : STATUS_MESSAGE.INVITATION_CONFLICT;
      }
    }
  }
  */
  return session;
};
