import prisma from '@/client';
import { Prisma, User } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';

export async function listUser(): Promise<User[]> {
  const userList = await prisma.user.findMany({
    where: {
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: 'asc',
    },
  });
  return userList;
}

export async function getUserById(userId: number): Promise<User | null> {
  let user = null;
  if (userId > 0) {
    user = await prisma.user.findUnique({
      where: {
        id: userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return user;
}

export async function getUserByCredential(credentialId: string): Promise<User | null> {
  let user = null;
  if (credentialId.trim() !== '') {
    user = await prisma.user.findUnique({
      where: {
        credentialId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return user;
}

export async function createUser(
  name: string,
  credentialId: string,
  publicKey: string,
  algorithm: string,
  imageUrl: string,
  fullName?: string,
  email?: string,
  phone?: string
): Promise<User> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const newUser: Prisma.UserCreateInput = {
    name,
    fullName,
    email,
    phone,
    credentialId,
    publicKey,
    algorithm,
    imageId: imageUrl, // ToDo: check the interface (20240516 - Luphia)
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  const createdUser = await prisma.user.create({
    data: newUser,
  });

  return createdUser;
}

export async function updateUserById(
  userId: number,
  name?: string,
  fullName?: string,
  email?: string,
  phone?: string,
  imageUrl?: string
): Promise<User> {
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
  });

  return user;
}

export async function deleteUserById(userId: number): Promise<User> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.UserWhereUniqueInput = {
    id: userId,
    deletedAt: null,
  };

  const data: Prisma.UserUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs: Prisma.UserUpdateArgs = {
    where,
    data,
  };

  const user = await prisma.user.update(updateArgs);
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
