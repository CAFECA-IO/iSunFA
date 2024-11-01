import prisma from '@/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { File, Prisma, Role, User, UserRole } from '@prisma/client';

// Info: (20241015 - Jacky) Create
export async function createUserRole(
  userId: number,
  roleId: number
): Promise<UserRole & { user: User & { imageFile: File }; role: Role }> {
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
      user: {
        include: {
          imageFile: true,
        },
      },
    },
  });
  return newUserRole;
}

// Info: (20241015 - Jacky) List
export async function listUserRole(
  userId: number
): Promise<(UserRole & { user: User & { imageFile: File }; role: Role })[]> {
  const listedUserRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      role: true,
      user: {
        include: {
          imageFile: true,
        },
      },
    },
  });

  return listedUserRoles;
}

export async function getUserRoleByUserAndRoleId(
  userId: number,
  roleId: number
): Promise<(UserRole & { user: User & { imageFile: File }; role: Role }) | null> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      roleId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      role: true,
      user: {
        include: {
          imageFile: true,
        },
      },
    },
  });

  return userRole;
}

export async function updateUserRoleLoginAt(
  id: number
): Promise<UserRole & { user: User & { imageFile: File }; role: Role }> {
  const nowInSecond = getTimestampNow();

  const updatedUserRole = await prisma.userRole.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      updatedAt: nowInSecond,
      // ToDo: (20241030 - Jacky) SHOULD NOT UPDATE lastLoginAt in role
      role: {
        update: {
          lastLoginAt: nowInSecond,
        },
      },
    },
    include: {
      role: true,
      user: {
        include: {
          imageFile: true,
        },
      },
    },
  });
  return updatedUserRole;
}

export async function deleteUserRole(id: number): Promise<UserRole> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.UserRoleWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.UserRoleUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs: Prisma.UserRoleUpdateArgs = {
    where,
    data,
  };
  const deletedUserRole = await prisma.userRole.update(updateArgs);
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
