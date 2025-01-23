import prisma from '@/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma, Role, UserRole } from '@prisma/client';

// Info: (20241015 - Jacky) Create
export async function createUserRole(
  userId: number,
  roleId: number
): Promise<UserRole & { role: Role }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newUserRole = await prisma.userRole.create({
    data: {
      userId,
      roleId,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      role: true,
    },
  });
  return newUserRole;
}

// Info: (20241015 - Jacky) List
export async function listUserRole(userId: number): Promise<(UserRole & { role: Role })[]> {
  const listedUserRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      role: true,
    },
  });

  return listedUserRoles;
}

export async function getUserRoleByUserAndRoleId(
  userId: number,
  roleId: number
): Promise<(UserRole & { role: Role }) | null> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      role: true,
    },
  });

  return userRole;
}

export async function updateUserRoleLoginAt(id: number): Promise<UserRole & { role: Role }> {
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
    include: {
      role: true,
    },
  });
  return updatedUserRole;
}

export async function deleteUserRole(id: number): Promise<UserRole & { role: Role }> {
  const nowInSecond = getTimestampNow();

  const deletedUserRole = await prisma.userRole.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      updatedAt: nowInSecond,
      deletedAt: nowInSecond,
    },
    include: {
      role: true,
    },
  });

  return deletedUserRole;
}

// Info: (20241015 - Jacky) Real delete for testing
export async function deleteUserRoleForTesting(id: number): Promise<UserRole> {
  const where: Prisma.UserRoleWhereUniqueInput = {
    id,
  };

  const deletedUserRole = await prisma.userRole.delete({
    where,
  });

  return deletedUserRole;
}
