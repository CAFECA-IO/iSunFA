import prisma from '@/client';
import { IUser } from '@/interfaces/user';
import { Prisma } from '@prisma/client';
import { timestampInSeconds } from '@/lib/utils/common';

export async function listUser(): Promise<IUser[]> {
  const userList = await prisma.user.findMany();
  return userList as IUser[];
}

export async function getUserById(userId: number): Promise<IUser> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  return user as IUser;
}

export async function getUserByCredential(credentialId: string): Promise<IUser> {
  const user = await prisma.user.findUnique({
    where: {
      credentialId,
    },
  });
  return user as IUser;
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
): Promise<IUser> {
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

  const createdUser: IUser = await prisma.user.create({
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
): Promise<IUser> {
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

  return user as IUser;
}

export async function deleteUserById(userId: number): Promise<IUser> {
  const user = await prisma.user.delete({
    where: {
      id: userId,
    },
  });
  return user as IUser;
}
