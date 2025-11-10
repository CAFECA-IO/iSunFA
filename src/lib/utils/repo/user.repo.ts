import prisma from '@/client';
import { Prisma, User, UserAgreement, File, InviteStatus, TeamRole } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { SortOrder } from '@/constants/sort';
import loggerBack from '@/lib/utils/logger_back';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';

export async function listUser(): Promise<
  (User & { userAgreements: UserAgreement[]; imageFile: File | null })[]
> {
  const userList = await prisma.user.findMany({
    orderBy: {
      id: SortOrder.ASC,
    },
    include: {
      userAgreements: true,
      imageFile: true,
    },
  });
  return userList;
}

/**
 * Info: (20250318 - Tzuhan)
 * 根據 email 查找並處理 `inviteTeamMember` 相關邀請
 * @param userId 剛註冊成功的用戶 ID
 * @param email 用戶的 email
 */
export async function handleInviteTeamMember(userId: number, email: string): Promise<void> {
  if (!email) return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Info: (20250318 - Tzuhan) 查找所有 `inviteTeamMember` 還未處理的邀請
    const invitedTeams = await tx.inviteTeamMember.findMany({
      where: { email, status: InviteStatus.PENDING },
      select: { teamId: true },
    });

    loggerBack.info(`invitedTeams [${invitedTeams.length}]: ${JSON.stringify(invitedTeams)}`);

    if (invitedTeams.length > 0) {
      const nowTimestamp = Math.floor(Date.now() / 1000);

      // Info: (20250318 - Tzuhan) 批量將用戶加入 `teamMember`
      await tx.teamMember.createMany({
        data: invitedTeams.map((invite: { teamId: number }) => ({
          teamId: invite.teamId,
          userId,
          role: TeamRole.EDITOR, // Info: (20250318 - Tzuhan) 預設角色
          joinedAt: nowTimestamp,
        })),
        skipDuplicates: true,
      });

      // Info: (20250318 - Tzuhan) 更新 `inviteTeamMember` 為 `COMPLETED`
      await tx.inviteTeamMember.updateMany({
        where: {
          email,
          teamId: { in: invitedTeams.map((invite: { teamId: number }) => invite.teamId) },
        },
        data: {
          status: InviteStatus.COMPLETED,
          completedAt: nowTimestamp,
        },
      });
    }
  });
}

export async function createUser({
  name,
  email,
  imageId,
}: {
  name: string;
  email: string;
  imageId: number;
}): Promise<User & { userAgreements: UserAgreement[] }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Info: (20250317 - Tzuhan) Step 1: 查找是否有邀請
      const invitedTeams = await tx.inviteTeamMember.findMany({
        where: { email, status: InviteStatus.PENDING },
        select: { teamId: true },
      });

      // Info: (20250317 - Tzuhan) Step 2: 嘗試連結或創建 `File`
      const existingFile = await tx.file.findUnique({
        where: { id: imageId },
      });

      const fileConnect: Prisma.FileCreateNestedOneWithoutUserImageFileInput = existingFile
        ? { connect: { id: imageId } }
        : {};

      // Info: (20250317 - Tzuhan) Step 3: 創建 User
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          imageFile: fileConnect,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        include: {
          userAgreements: true,
        },
      });

      loggerBack.info(`invitedTeams [${invitedTeams.length}]: ${JSON.stringify(invitedTeams)}`);

      if (invitedTeams.length > 0) {
        // Info: (20250317 - Tzuhan) Step 1: 批量創建 `teamMember`
        const newTeamMembers = invitedTeams.map((invite: { teamId: number }) => ({
          teamId: invite.teamId,
          userId: createdUser.id,
          role: TeamRole.EDITOR, // Info: (20250317 - Tzuhan) 預設角色
          joinedAt: nowTimestamp,
        }));

        await tx.teamMember.createMany({
          data: newTeamMembers,
          skipDuplicates: true,
        });

        // Info: (20250317 - Tzuhan) Step 2: 批量更新 `inviteTeamMember` 為 `COMPLETED`
        const teamIds = invitedTeams.map((invite: { teamId: number }) => invite.teamId); // Info: (20250317 - Tzuhan) 取出所有 teamId

        await tx.inviteTeamMember.updateMany({
          where: {
            email,
            teamId: { in: teamIds }, // Info: (20250317 - Tzuhan) 只更新成功轉換為 `teamMember` 的記錄
          },
          data: {
            status: InviteStatus.COMPLETED,
            completedAt: nowTimestamp,
          },
        });
      }

      return createdUser;
    });
  } catch (error) {
    (error as Error).message = STATUS_MESSAGE.CREATE_USER_FAILED;
    (error as Error).name = STATUS_CODE.CREATE_USER_FAILED;
    throw error;
  }
}

export async function getUserById(
  userId: number
): Promise<(User & { userAgreements: UserAgreement[]; imageFile: File | null }) | null> {
  let user = null;
  if (userId > 0) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        userAgreements: true,
        imageFile: true,
      },
    });
  }
  return user;
}

export async function updateUserById(
  userId: number,
  name?: string,
  email?: string,
  imageId?: number
): Promise<User & { userAgreements: UserAgreement[]; imageFile: File | null }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name,
      email,
      updatedAt: nowTimestamp,
      imageFileId: imageId,
    },
    include: {
      userAgreements: true,
      imageFile: true,
    },
  });

  return user;
}

export async function cancelDeleteUserById(
  userId: number
): Promise<User & { userAgreements: UserAgreement[]; imageFile: File | null }> {
  const nowInSecond = getTimestampNow();
  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      updatedAt: nowInSecond,
      deletedAt: null,
    },
    include: {
      userAgreements: true,
      imageFile: true,
    },
  });

  return user;
}

// Info: (20240723 - Murky) Real delete for testing
export async function deleteUserByIdForTesting(userId: number): Promise<User> {
  const where: Prisma.UserWhereUniqueInput = {
    id: userId,
  };

  const deletedUser = await prisma.user.delete({
    where,
  });

  return deletedUser;
}
