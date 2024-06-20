import prisma from '@/client';
import { ROLE_NAME, RoleName } from '@/constants/role_name';
import { IUser } from '@/interfaces/user';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { timestampInSeconds } from '@/lib/utils/common';
import { Admin, Company, Role, User } from '@prisma/client';

export async function listAdminByCompanyId(
  companyId: number
): Promise<(Admin & { company: Company; user: User; role: Role })[]> {
  const listedAdmin = await prisma.admin.findMany({
    where: {
      companyId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  return listedAdmin;
}

export async function getAdminById(
  adminId: number
): Promise<Admin & { company: Company; user: User; role: Role }> {
  const admin = await prisma.admin.findUnique({
    where: {
      id: adminId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function getAdminByUserId(
  userId: number
): Promise<Admin & { company: Company; user: User; role: Role }> {
  const admin = await prisma.admin.findFirst({
    where: {
      userId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function getAdminByCompanyIdAndUserId(
  companyId: number,
  userId: number
): Promise<Admin & { company: Company; user: User; role: Role }> {
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const admin = await prisma.admin.findFirst({
    where: {
      userId,
      companyId,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function getAdminByCompanyIdAndUserIdAndRoleName(
  companyId: number,
  userId: number,
  roleName: RoleName
): Promise<Admin & { company: Company; user: User; role: Role }> {
  if (typeof companyId !== 'number' || typeof userId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const admin = await prisma.admin.findFirst({
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
  });
  if (!admin) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return admin;
}

export async function createAdmin(
  userId: number,
  companyId: number,
  roleId: number
): Promise<Admin & { company: Company; user: User; role: Role }> {
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
          id: companyId,
        },
      },
      role: {
        connect: {
          id: roleId,
        },
      },
      email: '',
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
): Promise<Admin & { company: Company; user: User; role: Role }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updatedAdmin = await prisma.admin.update({
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
      updatedAt: nowTimestamp,
    },
    include: {
      user: true,
      company: true,
      role: true,
    },
  });
  return updatedAdmin;
}

export async function deleteAdminById(
  adminId: number
): Promise<Admin & { company: Company; user: User; role: Role }> {
  const deletedAdmin = await prisma.admin.delete({
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
): Promise<Array<{ company: Company; role: Role }>> {
  const listedCompanyRole: Array<{ company: Company; role: Role }> = await prisma.admin.findMany({
    where: {
      userId,
    },
    select: {
      company: true,
      role: true,
    },
  });
  return listedCompanyRole;
}

export async function createCompanyAndRole(
  user: IUser,
  code: string,
  name: string,
  regional: string
): Promise<{ company: Company; role: Role }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newCompanyRoleList: { company: Company; role: Role } = await prisma.admin.create({
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
