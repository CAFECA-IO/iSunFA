import prisma from '@/client';
import { timestampInSeconds } from '@/lib/utils/common';
import { UserAgreement } from '@prisma/client';

export async function createUserAgreement(
  userId: number,
  agreementHash: string
): Promise<UserAgreement> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const createdUserAgreement = await prisma.userAgreement.create({
    data: {
      userId,
      agreementHash,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });

  return createdUserAgreement;
}

export async function deleteUserAgreementForTesting(
  userId: number,
  agreementHash: string
): Promise<UserAgreement> {
  const deletedUserAgreement = await prisma.userAgreement.delete({
    where: {
      userId_agreementHash: {
        userId,
        agreementHash,
      },
    },
  });

  return deletedUserAgreement;
}
