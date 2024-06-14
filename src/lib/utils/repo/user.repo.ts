import prisma from '@/client';
import { Prisma, User } from '@prisma/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';

export async function listUser(): Promise<User[]> {
  const userList = await prisma.user.findMany();
  return userList;
}

export async function getUserById(userId: number): Promise<User> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return user;
}

export async function getUserByCredential(credentialId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: {
      credentialId,
    },
  });
  if (!user) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
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
  const user = await prisma.user.delete({
    where: {
      id: userId,
    },
  });
  return user;
}
