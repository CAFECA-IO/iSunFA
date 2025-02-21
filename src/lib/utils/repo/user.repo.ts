import prisma from '@/client';
import { Prisma, User, UserAgreement, File } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { SortOrder } from '@/constants/sort';

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

  const fileConnect: Prisma.FileCreateNestedOneWithoutUserImageFileInput = {
    connect: {
      id: imageId,
    },
  };
  const createdUser: Prisma.UserCreateInput = {
    name,
    email,
    imageFile: fileConnect,
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

export async function deleteUserById(
  userId: number
): Promise<User & { userAgreements: UserAgreement[]; imageFile: File | null }> {
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
    imageFile: true,
  };

  const user = await prisma.user.update({
    where,
    data,
    include,
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
