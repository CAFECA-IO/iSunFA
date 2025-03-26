import prisma from '@/client';
import { RoleName as prismaRoleName, UserRole } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { RoleName } from '@/constants/role';

export const createUserRole = async (
  data: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'lastLoginAt'>
): Promise<UserRole> => {
  const nowInSecond = getTimestampNow();
  return prisma.userRole.create({
    data: {
      ...data,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
      lastLoginAt: nowInSecond,
    },
  });
};

export const getUserRoleById = async (roleId: number, userId: number): Promise<UserRole | null> => {
  let result: UserRole | null = null;
  if (roleId > 0) {
    result = await prisma.userRole.findUnique({
      where: { id: roleId, userId },
    });
  }
  return result;
};

export const getUserRoleByName = async (name: RoleName): Promise<UserRole | null> => {
  let result: UserRole | null = null;
  if (name) {
    result = await prisma.userRole.findFirst({
      where: { roleName: name as unknown as prismaRoleName },
    });
  }
  return result;
};

export const listUserRole = async (userId: number): Promise<UserRole[]> => {
  return prisma.userRole.findMany({
    where: {
      userId,
    },
  });
};

export const updateUserRole = async (
  id: number,
  data: Partial<Omit<UserRole, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>
): Promise<UserRole | null> => {
  let result: UserRole | null = null;
  if (id > 0) {
    const nowInSecond = getTimestampNow();
    result = await prisma.userRole.update({
      where: { id },
      data: {
        ...data,
        updatedAt: nowInSecond,
      },
    });
  }
  return result;
};

export const deleteUserRole = async (id: number): Promise<UserRole | null> => {
  let result: UserRole | null = null;
  if (id > 0) {
    const nowInSecond = getTimestampNow();
    result = await prisma.userRole.update({
      where: { id },
      data: {
        deletedAt: nowInSecond,
      },
    });
  }
  return result;
};

export async function updateUserRoleLoginAt(id: number): Promise<UserRole> {
  const nowInSecond = getTimestampNow();

  const updatedUserRole = await prisma.userRole.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      updatedAt: nowInSecond,
      lastLoginAt: nowInSecond,
    },
  });
  return updatedUserRole;
}
