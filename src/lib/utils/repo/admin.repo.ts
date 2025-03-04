import prisma from '@/client';
import {
  File,
  Admin,
  Company,
  CompanyKYC,
  Prisma,
  Role,
  User,
  UserAgreement,
} from '@prisma/client';
import { CompanyRoleName } from '@/constants/role';
import { SortOrder } from '@/constants/sort';
import { getTimestampNow, pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { loggerError } from '@/lib/utils/logger_back';
import { WORK_TAG } from '@/interfaces/account_book';
import { DefaultValue } from '@/constants/default_value';
import { getTeamList, isEligibleToCreateCompanyInTeam } from '@/lib/utils/repo/team.repo';

export async function listAdminByCompanyId(companyId: number): Promise<
  (Admin & {
    company: Company & { imageFile: File | null };
    user: User & { userAgreements: UserAgreement[]; imageFile: File | null };
    role: Role;
  })[]
> {
  const listedAdmin = await prisma.admin.findMany({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      id: SortOrder.ASC,
    },
    include: {
      user: {
        include: {
          imageFile: true,
          userAgreements: true,
        },
      },
      company: {
        include: {
          imageFile: true,
        },
      },
      role: true,
    },
  });
  return listedAdmin;
}

export async function listCompanyByUserId(userId: number): Promise<
  {
    company: Company & { imageFile: File };
  }[]
> {
  const listedCompany = await prisma.admin.findMany({
    where: {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      companyId: SortOrder.ASC,
    },
    select: {
      company: {
        include: {
          imageFile: true,
        },
      },
    },
  });
  return listedCompany;
}

export async function getCompanyByUserIdAndCompanyId(
  userId: number,
  companyId: number
): Promise<
  | (Company & {
      imageFile: File;
    })
  | null
> {
  const admin = await prisma.admin.findFirst({
    where: {
      userId,
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    select: {
      company: {
        include: {
          imageFile: true,
        },
      },
    },
  });
  const company = admin?.company ?? null;
  return company;
}

export async function getAdminById(adminId: number): Promise<
  | (Admin & {
      company: Company & { imageFile: File | null };
      user: User & { userAgreements: UserAgreement[]; imageFile: File | null };
      role: Role;
    })
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
            imageFile: true,
          },
        },
        company: {
          include: {
            imageFile: true,
          },
        },
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
        name: CompanyRoleName.OWNER,
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
  userId: number,
  companyId: number
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
  roleName: CompanyRoleName
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
  Admin & {
    company: Company & { imageFile: File | null };
    user: User & { userAgreements: UserAgreement[]; imageFile: File | null };
    role: Role;
  }
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
          imageFile: true,
        },
      },
      company: {
        include: {
          imageFile: true,
        },
      },
      role: true,
    },
  });
  return updatedAdmin;
}

export async function deleteAdminById(adminId: number): Promise<
  Admin & {
    company: Company & { imageFile: File | null };
    user: User & { userAgreements: UserAgreement[]; imageFile: File | null };
    role: Role;
  }
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
          imageFile: true,
        },
      },
      company: {
        include: {
          imageFile: true,
        },
      },
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
  userId: number,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  searchQuery: string = '',
  sortOrder: SortOrder = SortOrder.DESC
): Promise<{
  data: Array<{
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
  }>;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sort: { sortBy: string; sortOrder: string }[];
}> {
  let companyRoleList: Array<{
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
  }> = [];

  try {
    companyRoleList = await prisma.admin.findMany({
      where: {
        userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
        company: {
          AND: [
            { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
            {
              OR: [{ name: { contains: searchQuery, mode: 'insensitive' } }],
            },
          ],
        },
      },
      orderBy: {
        // Info: (20241120 - Jacky) Order from bigger to smaller
        order: sortOrder,
      },
      select: {
        company: {
          include: {
            imageFile: true,
          },
        },
        role: true,
        tag: true,
        order: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'list company and role in listCompanyAndRole failed',
      errorMessage: (error as Error).message,
    });
  }

  const totalCount = companyRoleList.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (targetPage < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const skip = pageToOffset(targetPage, pageSize);

  const paginatedCompanyRoles = companyRoleList.slice(skip, skip + pageSize);

  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = targetPage > 1;
  // ToDo: (20241017 - Jacky) Should enum the sort by, companyOrder
  const sort: { sortBy: string; sortOrder: string }[] = [{ sortBy: 'order', sortOrder }];

  return {
    data: paginatedCompanyRoles,
    page: targetPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort,
  };
}

export async function listCompanyAndRoleSimple(userId: number): Promise<
  Array<{
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
  }>
> {
  const companyRoleList = await prisma.admin.findMany({
    where: {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      order: SortOrder.DESC,
    },
    select: {
      company: {
        include: {
          imageFile: true,
        },
      },
      role: true,
      tag: true,
      order: true,
    },
  });
  return companyRoleList;
}

export async function getCompanyAndRoleByUserIdAndCompanyId(
  userId: number,
  companyId: number
): Promise<{
  company: Company & { imageFile: File | null };
  tag: string;
  order: number;
  role: Role;
} | null> {
  let companyRole: {
    company: Company & { imageFile: File | null };
    tag: string;
    order: number;
    role: Role;
  } | null = null;
  if (userId > 0 && companyId > 0) {
    companyRole = await prisma.admin.findFirst({
      where: {
        companyId,
        userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        tag: true,
        order: true,
        company: {
          include: {
            imageFile: true,
          },
        },
        role: true,
      },
    });
  }
  return companyRole;
}

export async function getCompanyDetailAndRoleByCompanyId(
  userId: number,
  companyId: number
): Promise<{
  company: Company & {
    admins: Admin[];
    companyKYCs: CompanyKYC[];
    imageFile: File | null;
  };
  role: Role;
} | null> {
  let companyDetail: {
    company: Company & {
      admins: Admin[];
      companyKYCs: CompanyKYC[];
      imageFile: File | null;
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
            imageFile: true,
            admins: {
              where: {
                role: {
                  name: CompanyRoleName.OWNER,
                },
                OR: [{ deletedAt: 0 }, { deletedAt: null }],
              },
            },
            companyKYCs: {
              where: {
                OR: [{ deletedAt: 0 }, { deletedAt: null }],
              },
              orderBy: {
                createdAt: SortOrder.DESC,
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

export async function getCompanyAndRoleByTaxId(
  userId: number,
  taxId: string
): Promise<{
  company: Company;
  tag: string;
  order: number;
  role: Role;
} | null> {
  let companyDetail: {
    company: Company;
    tag: string;
    order: number;
    role: Role;
  } | null = null;
  if (taxId) {
    const companyRole = await prisma.admin.findFirst({
      where: {
        company: {
          taxId,
        },
        userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        tag: true,
        order: true,
        company: true,
        role: true,
      },
    });
    companyDetail = companyRole;
  }
  return companyDetail;
}

export async function createCompanyAndRole(
  userId: number,
  taxId: string,
  name: string,
  imageFileId: number,
  tag: WORK_TAG = WORK_TAG.ALL,
  email?: string,
  teamId?: number
): Promise<{
  company: Company & { imageFile: File | null };
  role: Role;
  tag: string;
  order: number;
}> {
  const nowTimestamp = getTimestampNow();

  // Info: (20250303 - Shirley) 如果提供了 teamId，檢查用戶是否有權限在該 team 建立 company
  let finalTeamId: number | undefined = teamId;
  if (finalTeamId) {
    const hasPermission = await isEligibleToCreateCompanyInTeam(userId, finalTeamId);
    if (!hasPermission) {
      throw new Error('User does not have permission to create company in this team');
    }
  } else {
    // Info: (20250303 - Shirley) 如果沒有提供 teamId，則獲取用戶的 team 列表
    const userTeams = await getTeamList(userId);
    if (userTeams && userTeams.data.length > 0) {
      // Info: (20250303 - Shirley) 使用用戶的第一個 team（通常是默認 team）
      const defaultTeamId = +userTeams.data[0].id;
      const hasPermission = await isEligibleToCreateCompanyInTeam(userId, defaultTeamId);
      if (hasPermission) {
        finalTeamId = defaultTeamId;
      }
    }
  }

  const userConnect: Prisma.UserCreateNestedOneWithoutAdminsInput = {
    connect: {
      id: userId,
    },
  };

  const roleConnectOrCreate: Prisma.RoleCreateNestedOneWithoutAdminsInput = {
    connectOrCreate: {
      where: {
        name: CompanyRoleName.OWNER,
      },
      create: {
        name: CompanyRoleName.OWNER,
        // ToDo: (20240822 - Murky) [Beta] Should enum the permissions,
        // however, since Beta version will change the permission type,
        // and what permission per type is not clear yet, so just put it as string array
        // and change it after beta mockup is clear
        permissions: ['read', 'write', 'delete', 'invite'],
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    },
  };

  // Info: (20250301 - Shirley) 創建 company 時關聯到 team
  const companyCreateInput: Prisma.CompanyCreateWithoutAdminsInput = {
    taxId,
    name,
    imageFile: {
      connect: {
        id: imageFileId,
      },
    },
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
    startDate: nowTimestamp,
  };

  // Info: (20250303 - Shirley) 如果找到了 team，則關聯 company 到該 team
  if (finalTeamId) {
    companyCreateInput.team = {
      connect: {
        id: finalTeamId,
      },
    };
  }

  const newCompanyRoleList = await prisma.admin.create({
    data: {
      user: userConnect,
      company: {
        create: companyCreateInput,
      },
      tag,
      role: roleConnectOrCreate,
      email: email || '',
      status: true,
      startDate: nowTimestamp,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
    select: {
      company: {
        include: {
          imageFile: true,
        },
      },
      tag: true,
      order: true,
      role: true,
    },
  });

  return newCompanyRoleList;
}

// ToDo: (20241017 - Jacky) Modify this function by order by companyOrder
export async function setCompanyToTop(userId: number, companyId: number) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  let companyRole: {
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
  } | null = null;
  // Info: (20241017 - Jacky) Get the max companyOrder
  const getMaxOrderAdmin = await prisma.admin.aggregate({
    where: {
      userId,
    },
    _max: {
      order: true,
    },
  });

  const {
    _max: { order: maxOrder },
  } = getMaxOrderAdmin;

  const admin = await getAdminByCompanyIdAndUserId(userId, companyId);

  if (admin) {
    // Info: (20241017 - Jacky) Set the companyOrder to maxOrder + 1
    companyRole = await prisma.admin.update({
      where: {
        id: admin.id,
      },
      data: {
        order: (maxOrder ?? 0) + 1,
        updatedAt: nowTimestamp,
      },
      select: {
        company: {
          include: {
            imageFile: true,
          },
        },
        role: true,
        tag: true,
        order: true,
      },
    });
  }
  return companyRole;
}

export async function updateCompanyTagById(
  adminId: number,
  tag: WORK_TAG
): Promise<{
  company: Company & { imageFile: File | null };
  role: Role;
  tag: string;
  order: number;
}> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  // ToDo: (20241017 - Jacky) update company tag
  const updatedCompany = await prisma.admin.update({
    where: {
      id: adminId,
    },
    data: {
      tag,
      updatedAt: nowTimestamp,
    },
    select: {
      company: {
        include: {
          imageFile: true,
        },
      },
      tag: true,
      order: true,
      role: true,
    },
  });
  return updatedCompany;
}

// Info (20240721 - Murky) For testing, real delete
export async function deleteAdminByIdForTesting(
  adminId: number
): Promise<{ company: Company & { imageFile: File | null }; role: Role }> {
  const where: Prisma.AdminWhereUniqueInput = {
    id: adminId,
  };

  const select = {
    company: {
      include: {
        imageFile: true,
      },
    },
    role: true,
  };

  const deleteArgs = {
    where,
    select,
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
