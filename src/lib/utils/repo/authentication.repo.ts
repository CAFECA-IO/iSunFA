import prisma from '@/client';
import { Authentication, User, UserAgreement } from '@prisma/client';
import { timestampInSeconds } from '@/lib/utils/common';

export async function getUserByCredential(
  credentialId: string
): Promise<(Authentication & { user: User & { userAgreements: UserAgreement[] } }) | null> {
  let user: (Authentication & { user: User & { userAgreements: UserAgreement[] } }) | null = null;
  if (credentialId.trim() !== '') {
    user = await prisma.authentication.findUnique({
      where: {
        credentialId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        user: {
          include: {
            userAgreements: true,
          },
        },
      },
    });
  }
  return user;
}

export async function createUserByAuth({
  name,
  credentialId,
  method,
  provider,
  authData,
  imageUrl,
  fullName,
  email,
  phone,
}: {
  name: string;
  credentialId: string;
  method: string;
  provider: string;
  authData: object;
  imageUrl: string;
  fullName?: string;
  email?: string;
  phone?: string;
}): Promise<Authentication & { user: User & { userAgreements: UserAgreement[] } }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  // publicKey: string,
  // algorithm: string,

  const createdAuthentication = await prisma.authentication.create({
    data: {
      user: {
        create: {
          name,
          fullName,
          email,
          phone,
          imageId: imageUrl,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
      },
      method,
      provider,
      credentialId,
      authData,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      user: {
        include: {
          userAgreements: true,
        },
      },
    },
  });

  return createdAuthentication;
}
