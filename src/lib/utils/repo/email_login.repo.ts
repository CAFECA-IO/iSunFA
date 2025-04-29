import prisma from '@/client';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { getTimestampNow, randomCode } from '@/lib/utils/common';
import { IEmailLogin } from '@/interfaces/email';
import { FIVE_MINUTES_IN_S, ONE_HOUR_IN_S } from '@/constants/time';
import { STATUS_MESSAGE } from '@/constants/status_code';

export const createEmailLogin = async (
  email: string,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IEmailLogin> => {
  const nowInSecond = getTimestampNow();
  const code = randomCode();
  const hash = createHash('md5').update(code).digest('hex');
  const emailLoginData: IEmailLogin = {
    email,
    code,
    hash,
    used: false,
    expiredAt: nowInSecond + FIVE_MINUTES_IN_S,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };
  const emailLogin = await tx.emailLogin.create({
    data: emailLoginData,
  });
  if (!emailLogin) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  return emailLogin;
};

// Info: (20250424 - Luphia) 只能驗證一次，驗證成功後即更新為已使用
export const verifyEmailLogin = async (
  email: string,
  hash: string,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<boolean> => {
  const nowInSecond = getTimestampNow();
  const emailLogin = await tx.emailLogin.updateMany({
    where: {
      email,
      hash,
      used: false,
      expiredAt: {
        gte: nowInSecond,
      },
    },
    data: {
      used: true,
      updatedAt: nowInSecond,
    },
  });
  const result = emailLogin.count > 0;
  return result;
};

// Info: (20250424 - Luphia) 刪除過期超過一小時的 login code
export const deleteEmailLogin = async (): Promise<void> => {
  const nowInSecond = getTimestampNow();
  const oneHourExpired = nowInSecond - ONE_HOUR_IN_S;
  await prisma.emailLogin.deleteMany({
    where: {
      expiredAt: {
        lt: oneHourExpired,
      },
    },
  });
};
