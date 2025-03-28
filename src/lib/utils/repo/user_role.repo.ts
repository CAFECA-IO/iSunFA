import prisma from '@/client';
import { getTimestampNow } from '@/lib/utils/common';
import { RoleName, RoleType } from '@/constants/role';
import { IUserRole } from '@/interfaces/user_role';
import { SortOrder } from '@/constants/sort';

export const getUserRoleById = async (roleId: number): Promise<IUserRole | null> => {
  let result: IUserRole | null = null;
  if (roleId > 0) {
    const userRole = await prisma.userRole.findUnique({
      where: { id: roleId },
    });
    if (userRole) {
      result = {
        ...userRole,
        roleName: userRole.roleName as RoleName,
        type: userRole.type as RoleType,
        deletedAt: undefined,
      };
    }
  }
  return result;
};

// Info: (20250327 - Tzuhan) 取得指定使用者的所有角色清單
export const getUserRoleListByUserId = async (userId: number): Promise<IUserRole[]> => {
  const userRoleFromDB = await prisma.userRole.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: {
      lastLoginAt: SortOrder.DESC,
    },
  });
  return userRoleFromDB.map((userRole) => ({
    ...userRole,
    roleName: userRole.roleName as RoleName,
    type: userRole.type as RoleType,
    deletedAt: undefined,
  }));
};

// Info: (20250327 - Tzuhan) 建立使用者角色（若尚未存在）
export const createUserRoleIfNotExists = async (params: {
  userId: number;
  roleName: RoleName;
}): Promise<IUserRole | null> => {
  const { userId, roleName } = params;

  // Info: (20250327 - Tzuhan) 先檢查是否已存在此角色
  const existing = await prisma.userRole.findFirst({
    where: {
      userId,
      roleName,
      deletedAt: null,
    },
  });

  if (existing) return null;

  // Info: (20250327 - Tzuhan) 取得對應角色的 type（若有邏輯需要可補全）
  const roleType = RoleType.USER; // Info: (20250327 - Tzuhan) 或其他類型判斷邏輯

  const now = getTimestampNow();

  const createdUserRole = await prisma.userRole.create({
    data: {
      userId,
      roleName,
      type: roleType,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
  });
  return {
    ...createdUserRole,
    roleName,
    type: roleType,
    deletedAt: undefined,
  };
};

// Info: (20250327 - Tzuhan) 更新登入時間（選擇角色時觸發）
export const updateUserLastLoginAt = async (params: {
  userId: number;
  roleName: RoleName;
}): Promise<IUserRole | null> => {
  const { userId, roleName } = params;

  const now = getTimestampNow();

  const selectedUserRole = await prisma.userRole
    .updateMany({
      where: {
        userId,
        roleName,
        deletedAt: null,
      },
      data: {
        lastLoginAt: now,
        updatedAt: now,
      },
    })
    .then(async () => {
      return prisma.userRole.findFirst({
        where: {
          userId,
          roleName,
          deletedAt: null,
        },
      });
    });

  return selectedUserRole
    ? {
        ...selectedUserRole,
        roleName,
        type: selectedUserRole.type as RoleType,
        deletedAt: undefined,
      }
    : selectedUserRole;
};
