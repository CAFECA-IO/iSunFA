import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { getSession } from './get_session';

export async function checkUserSession(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { userId } = session;
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const user: IUser = (await prisma.user.findUnique({
    where: {
      id: userId,
    },
  })) as IUser;
  if (!user) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return session;
}

export async function checkCompanySession(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { companyId, userId } = session;
  if (!companyId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const companyUser = await prisma.admin.findFirst({
    where: {
      userId,
      companyId,
    },
  });
  if (!companyUser) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  return session;
}
