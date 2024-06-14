import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import { IAdmin } from '@/interfaces/admin';
import { RoleName } from '@/constants/role_name';
import { getSession } from '@/lib/utils/get_session';
import { getProjectById } from '@/lib/utils/repo/project.repo';
import { timestampInSeconds } from '@/lib/utils/common';
import { getInvitationByCode } from '@/lib/utils/repo/invitation.repo';
import {
  getAdminByCompanyIdAndUserId,
  getAdminByCompanyIdAndUserIdAndRoleName,
  getAdminById,
} from '@/lib/utils/repo/admin.repo';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';

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

export async function checkProjectCompanyMatch(projectId: number, companyId: number) {
  const project = await getProjectById(projectId);
  if (project.companyId !== companyId) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  return project;
}

export async function checkInvitation(invitationCode: string) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const invitation = await getInvitationByCode(invitationCode);
  if (!invitation) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  if (invitation.hasUsed) {
    throw new Error(STATUS_MESSAGE.INVITATION_HAS_USED);
  }
  if (invitation.expiredAt < nowTimestamp) {
    throw new Error(STATUS_MESSAGE.CONFLICT);
  }
  return invitation;
}
