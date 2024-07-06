import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { IAdmin } from '@/interfaces/admin';
import { RoleName } from '@/constants/role_name';
import { getSession } from '@/lib/utils/session';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { timestampInSeconds } from '@/lib/utils/common';
import {
  getAdminByCompanyIdAndUserId,
  getAdminByCompanyIdAndUserIdAndRoleName,
  getAdminById,
} from '@/lib/utils/repo/admin.repo';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';
import { Invitation } from '@prisma/client';

export async function checkUser(req: NextApiRequest, res: NextApiResponse) {
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

export async function checkAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { companyId, userId } = session;
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  if (!companyId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  if (!admin) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  return session;
}

export async function isUserAdmin(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

export async function checkRole(req: NextApiRequest, res: NextApiResponse, roleName: RoleName) {
  const session = await getSession(req, res);
  const { companyId, userId } = session;
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  if (!companyId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
  const admin = await getAdminByCompanyIdAndUserIdAndRoleName(companyId, userId, roleName);
  if (!admin) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  return session;
}

export async function checkCompanyAdminMatch(companyId: number, adminId: number): Promise<IAdmin> {
  const getAdmin = await getAdminById(adminId);
  if (getAdmin.companyId !== companyId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const admin = await formatAdmin(getAdmin);
  return admin;
}

export async function isProjectCompanyMatch(projectId: number, companyId: number) {
  const getProject = await getProjectById(projectId);
  const match = getProject !== null && getProject.companyId === companyId;
  return match;
}

export async function checkInvitation(invitation: Invitation): Promise<boolean> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const isValid = invitation && !invitation.hasUsed && invitation.expiredAt >= nowTimestamp;
  return isValid;
}
