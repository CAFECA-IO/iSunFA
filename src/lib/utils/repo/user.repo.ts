import prisma from '@/client';
import { Prisma, User, UserAgreement } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { SortOrder } from '@/constants/sort';

export async function listUser(): Promise<(User & { userAgreements: UserAgreement[] })[]> {
  const userList = await prisma.user.findMany({
    where: {
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: SortOrder.ASC,
    },
    include: {
      userAgreements: true,
    },
  });
  return userList;
}

export async function createUser({
  name,
  fullName,
  email,
  phone,
  imageUrl,
}: {
  name: string;
  fullName: string;
  email: string;
  phone: string;
  imageUrl: string;
}): Promise<User & { userAgreements: UserAgreement[] }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const createdUser: Prisma.UserCreateInput = {
    name,
    fullName,
    email,
    phone,
    imageId: imageUrl,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  const user = await prisma.user.create({
    data: createdUser,
    include: {
      userAgreements: true,
    },
  });

  return user;
}

export async function getUserById(
  userId: number
): Promise<(User & { userAgreements: UserAgreement[] }) | null> {
  let user = null;
  if (userId > 0) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        userAgreements: true,
      },
    });
  }
  return user;
}

export async function updateUserById(
  userId: number,
  name?: string,
  fullName?: string,
  email?: string,
  phone?: string,
  imageUrl?: string
): Promise<User & { userAgreements: UserAgreement[] }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const updatedUser: Prisma.UserUpdateInput = {
    name,
    fullName,
    email,
    phone,
    imageId: imageUrl,
    updatedAt: nowTimestamp,
  };

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: updatedUser,
    include: {
      userAgreements: true,
    },
  });

  return user;
}

export async function deleteUserById(
  userId: number
): Promise<User & { userAgreements: UserAgreement[] }> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.UserWhereUniqueInput = {
    id: userId,
    deletedAt: null,
  };

  const data: Prisma.UserUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const include: Prisma.UserInclude = {
    userAgreements: true,
  };

  const user = await prisma.user.update({
    where,
    data,
    include,
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
