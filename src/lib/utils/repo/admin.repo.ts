import prisma from '@/client';
import { ROLE_NAME, RoleName } from '@/constants/role_name';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Admin, Company, CompanyKYC, Prisma, Role, User, UserAgreement } from '@prisma/client';

export async function listAdminByCompanyId(
  companyId: number
): Promise<
  (Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role })[]
> {
  const listedAdmin = await prisma.admin.findMany({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: 'asc',
    },
    include: {
      user: {
        include: {
          userAgreements: true,
        },
      },
      company: true,
      role: true,
    },
  });
  return listedAdmin;
}

export async function getAdminById(
  adminId: number
): Promise<
  | (Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role })
  | null
> {
  let admin = null;
  if (adminId > 0) {
    admin = await prisma.admin.findUnique({
      where: {
        id: adminId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        user: {
          include: {
            userAgreements: true,
          },
        },
        company: true,
        role: true,
      },
    });
  }
  return admin;
}

export async function getOwnerByCompanyId(
  companyId: number
): Promise<
  | (Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role })
  | null
> {
  const owner = await prisma.admin.findFirst({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
      role: {
        name: ROLE_NAME.OWNER,
      },
    },
    include: {
      user: {
        include: {
          userAgreements: true,
        },
      },
      company: true,
      role: true,
    },
  });

  return owner;
}

export async function getAdminByCompanyIdAndUserId(
  companyId: number,
  userId: number
): Promise<
  | (Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role })
  | null
> {
  let admin = null;
  if (companyId > 0 && userId > 0) {
    admin = await prisma.admin.findFirst({
      where: {
        userId,
        companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        user: {
          include: {
            userAgreements: true,
          },
        },
        company: true,
        role: true,
      },
    });
  }
  return admin;
}

export async function getAdminByCompanyIdAndUserIdAndRoleName(
  companyId: number,
  userId: number,
  roleName: RoleName
): Promise<
  | (Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role })
  | null
> {
  let admin:
    | (Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role })
    | null = null;
  if (companyId > 0 && userId > 0) {
    admin = await prisma.admin.findFirst({
      where: {
        userId,
        companyId,
        role: {
          name: roleName,
        },
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        user: {
          include: {
            userAgreements: true,
          },
        },
        company: true,
        role: true,
      },
    });
  }
  return admin;
}

export async function createAdmin(
  userId: number,
  companyId: number,
  roleId: number
): Promise<
  Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role }
> {
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
      user: {
        include: {
          userAgreements: true,
        },
      },
      company: true,
      role: true,
    },
  });
  return createdAdmin;
}

export async function updateAdminById(
  adminId: number,
  status?: boolean,
  roleId?: number
): Promise<
  Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role }
> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updatedAdmin = await prisma.admin.update({
    where: {
      id: adminId,
    },
    data: {
      status,
      roleId: roleId ?? undefined,
      updatedAt: nowTimestamp,
    },
    include: {
      user: {
        include: {
          userAgreements: true,
        },
      },
      company: true,
      role: true,
    },
  });
  return updatedAdmin;
}

export async function deleteAdminById(
  adminId: number
): Promise<
  Admin & { company: Company; user: User & { userAgreements: UserAgreement[] }; role: Role }
> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.AdminWhereUniqueInput = {
    id: adminId,
    deletedAt: null,
  };

  const data: Prisma.AdminUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };
  const deletedAdmin = await prisma.admin.update({
    where,
    data,
    include: {
      user: {
        include: {
          userAgreements: true,
        },
      },
      company: true,
      role: true,
    },
  });

  return deletedAdmin;
}

export async function deleteAdminListByCompanyId(companyId: number): Promise<number> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.AdminWhereInput = {
    companyId,
    deletedAt: null,
  };

  const data: Prisma.AdminUpdateManyMutationInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs = {
    data,
    where,
  };

  const { count } = await prisma.admin.updateMany(updateArgs);
  return count;
}

export async function listCompanyAndRole(
  userId: number
): Promise<Array<{ company: Company; role: Role }>> {
  const listedCompanyRole: Array<{ company: Company; role: Role }> = await prisma.admin.findMany({
    where: {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
      company: {
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    },
    select: {
      company: true,
      role: true,
    },
  });
  return listedCompanyRole;
}

export async function getCompanyDetailAndRoleByCompanyId(
  userId: number,
  companyId: number
): Promise<{
  company: Company & {
    admins: Admin[];
    companyKYCs: CompanyKYC[];
  };
  role: Role;
} | null> {
  let companyDetail: {
    company: Company & {
      admins: Admin[];
      companyKYCs: CompanyKYC[];
    };
    role: Role;
  } | null = null;
  if (companyId > 0) {
    const companyRole = await prisma.admin.findFirst({
      where: {
        companyId,
        userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        company: {
          include: {
            admins: {
              where: {
                role: {
                  name: ROLE_NAME.OWNER,
                },
                OR: [{ deletedAt: 0 }, { deletedAt: null }],
              },
            },
            companyKYCs: {
              where: {
                OR: [{ deletedAt: 0 }, { deletedAt: null }],
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
        role: true,
      },
    });
    companyDetail = companyRole;
  }
  return companyDetail;
}

export async function createCompanyAndRole(
  userId: number,
  code: string,
  name: string,
  regional: string,
  imageId?: string,
  email?: string
): Promise<{ company: Company; role: Role }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newCompanyRoleList: { company: Company; role: Role } = await prisma.admin.create({
    data: {
      user: {
        connect: {
          id: userId,
        },
      },
      company: {
        create: {
          code,
          name,
          regional,
          imageId,
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
            // Todo: [Beta] (20240517 - Jacky) Should enum the permissions
            permissions: ['read', 'write', 'delete', 'invite'],
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          },
        },
      },
      email: email || '',
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

// Info (20240721 - Murky) For testing, real delete
export async function deleteAdminByIdForTesting(
  adminId: number
): Promise<Admin & { company: Company; user: User; role: Role }> {
  const where: Prisma.AdminWhereUniqueInput = {
    id: adminId,
  };

  const include: Prisma.AdminInclude = {
    user: true,
    company: true,
    role: true,
  };

  const deleteArgs = {
    where,
    include,
  };
  const deletedAdmin = await prisma.admin.delete(deleteArgs);

  return deletedAdmin;
}

export async function deleteAdminListByCompanyIdForTesting(companyId: number): Promise<number> {
  const where: Prisma.AdminWhereInput = {
    companyId,
  };

  const deleteArgs = {
    where,
  };

  const { count } = await prisma.admin.deleteMany(deleteArgs);
  return count;
}
