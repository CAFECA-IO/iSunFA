import { IAdmin } from '@/interfaces/admin';
import { IInvitation } from '@/interfaces/invitation';
import prisma from '@/client';
import { ICompany } from '@/interfaces/company';
import { IRole } from '@/interfaces/role';
import { ROLE_NAME, RoleName } from '@/constants/role_name';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { timestampInSeconds } from '../common';

export async function listAdminByCompanyId(companyId: number): Promise<IAdmin[]> {
  const adminList: IAdmin[] = await prisma.admin.findMany({
    where: {
      companyId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  return adminList;
}

export async function getAdminById(adminId: number): Promise<IAdmin> {
  const admin: IAdmin = (await prisma.admin.findUnique({
    where: {
      id: adminId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  })) as IAdmin;
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function getAdminByUserId(userId: number): Promise<IAdmin> {
  const admin: IAdmin = (await prisma.admin.findFirst({
    where: {
      userId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  })) as IAdmin;
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function getAdminByCompanyIdAndUserId(
  companyId: number,
  userId: number
): Promise<IAdmin> {
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const admin: IAdmin = (await prisma.admin.findFirst({
    where: {
      userId,
      companyId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  })) as IAdmin;
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function getAdminByCompanyIdAndUserIdAndRoleName(
  companyId: number,
  userId: number,
  roleName: RoleName
): Promise<IAdmin> {
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const admin: IAdmin = (await prisma.admin.findFirst({
    where: {
      userId,
      companyId,
      role: {
        name: roleName,
      },
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  })) as IAdmin;
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function createAdmin(userId: number, invitation: IInvitation): Promise<IAdmin> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdAdmin = await prisma.admin.create({
    data: {
      user: {
        connect: {
          id: userId,
        },
      },
      company: {
        connect: {
          id: invitation.companyId,
        },
      },
      role: {
        connect: {
          id: invitation.roleId,
        },
      },
      email: invitation.email,
      status: true,
      startDate: nowTimestamp,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  return createdAdmin;
}

export async function updateAdminById(
  adminId: number,
  status: boolean,
  roleName: RoleName
): Promise<IAdmin> {
  const updatedAdmin: IAdmin = await prisma.admin.update({
    where: {
      id: adminId,
    },
    data: {
      status,
      role: {
        connect: {
          name: roleName,
        },
      },
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  return updatedAdmin;
}

export async function deleteAdminById(adminId: number): Promise<IAdmin> {
  const deletedAdmin: IAdmin = await prisma.admin.delete({
    where: {
      id: adminId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  return deletedAdmin;
}

export async function deleteAdminListByCompanyId(companyId: number): Promise<number> {
  const { count } = await prisma.admin.deleteMany({
    where: {
      companyId,
    },
  });
  return count;
}

export async function listCompanyAndRole(
  userId: number
): Promise<Array<{ company: ICompany; role: IRole }>> {
  const companyRoleList: Array<{ company: ICompany; role: IRole }> = await prisma.admin.findMany({
    where: {
      userId,
    },
    select: {
      company: true,
      role: true,
    },
  });
  return companyRoleList;
}

export async function createCompanyAndRole(
  user: IUser,
  code: string,
  name: string,
  regional: string
): Promise<{ company: ICompany; role: IRole }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newCompanyRoleList: { company: ICompany; role: IRole } = await prisma.admin.create({
    data: {
      user: {
        connect: {
          id: user.id,
        },
      },
      company: {
        create: {
          code,
          name,
          regional,
          kycStatus: false,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
          startDate: nowTimestamp,
        },
      },
      role: {
        connectOrCreate: {
          where: {
            name: ROLE_NAME.OWNER,
          },
          create: {
            name: ROLE_NAME.OWNER,
            // Todo: (20240517 - Jacky) Should enum the permissions
            permissions: ['read', 'write', 'delete', 'invite'],
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      email: user.email ?? '',
      status: true,
      startDate: nowTimestamp,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    select: {
      company: true,
      role: true,
    },
  });

  return newCompanyRoleList;
}
