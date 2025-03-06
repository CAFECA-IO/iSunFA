import prisma from '@/client';
import { Admin, Company, Prisma, File, CompanySetting } from '@prisma/client';
import { getTimestampNow, timestampInSeconds, pageToOffset } from '@/lib/utils/common';
import { CompanyRoleName } from '@/constants/role';
import { TeamRole } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { SortOrder, SortBy } from '@/constants/sort';
import { DEFAULT_PAGE_START_AT, DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { IAccountBookForUserWithTeam, WORK_TAG } from '@/interfaces/account_book';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

export async function getCompanyById(
  companyId: number
): Promise<(Company & { imageFile: File | null }) | null> {
  let company: (Company & { imageFile: File | null }) | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
      },
    });
  }
  return company;
}

export async function getCompanyWithSettingById(companyId: number): Promise<
  | (Company & {
      imageFile: File | null;
      companySettings: CompanySetting[];
    })
  | null
> {
  let company:
    | (Company & {
        imageFile: File | null;
        companySettings: CompanySetting[];
      })
    | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
        companySettings: true,
      },
    });
  }
  return company;
}

export async function getCompanyWithOwner(companyId: number): Promise<
  | (Company & {
      admins: Admin[];
    })
  | null
> {
  let company:
    | (Company & {
        admins: Admin[];
      })
    | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        admins: {
          where: {
            role: {
              name: CompanyRoleName.OWNER,
            },
          },
        },
      },
    });
  }
  return company;
}

export async function updateCompanyById(
  companyId: number,
  taxId?: string,
  name?: string,
  imageId?: number
): Promise<Company & { imageFile: File | null }> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const company = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      taxId,
      name,
      updatedAt: nowTimestamp,
      imageFileId: imageId,
    },
    include: {
      imageFile: true,
    },
  });
  return company;
}

export async function deleteCompanyById(
  companyId: number
): Promise<Company & { imageFile: File | null }> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CompanyWhereUniqueInput = {
    id: companyId,
    OR: [{ deletedAt: 0 }, { deletedAt: null }],
  };

  const data: Prisma.CompanyUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const include = {
    imageFile: true,
  };

  const updateArgs = {
    where,
    data,
    include,
  };

  const company = await prisma.company.update(updateArgs);
  return company;
}

export async function deleteCompanyByIdForTesting(companyId: number): Promise<Company> {
  const company = await prisma.company.delete({
    where: {
      id: companyId,
    },
  });
  return company;
}

export async function putCompanyIcon(options: { companyId: number; fileId: number }) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const { companyId, fileId } = options;
  const updatedCompany = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      imageFile: {
        connect: {
          id: fileId,
        },
      },
      updatedAt: nowTimestamp,
    },
    include: {
      imageFile: true,
    },
  });
  return updatedCompany;
}

export async function listAccountBookByUserId(
  userId: number,
  initialPage: number = DEFAULT_PAGE_START_AT,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  searchQuery?: string,
  sortOptions?: { sortBy: SortBy; sortOrder: SortOrder }[]
): Promise<IPaginatedOptions<IAccountBookForUserWithTeam[]>> {
  let accountBooks: IAccountBookForUserWithTeam[] = [];
  let page = initialPage;

  try {
    // Info: (20250305 - Shirley) 處理排序選項
    const defaultSortOption = { sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC };
    const sortOption = sortOptions && sortOptions.length > 0 ? sortOptions[0] : defaultSortOption;

    // Info: (20250305 - Shirley) 根據排序選項設置 Prisma 的排序條件
    let orderBy: Prisma.AdminOrderByWithRelationInput = { order: SortOrder.DESC };

    switch (sortOption.sortBy) {
      case SortBy.CREATED_AT:
        orderBy = {
          company: {
            createdAt: sortOption.sortOrder,
          },
        };
        break;
      case SortBy.UPDATED_AT:
        orderBy = {
          company: {
            updatedAt: sortOption.sortOrder,
          },
        };
        break;
      default:
        // 預設按照 order 排序
        orderBy = {
          order: sortOption.sortOrder,
        };
        break;
    }

    // Info: (20250305 - Shirley) 構建搜索條件
    const baseWhereCondition = {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
      company: {
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    };

    // Info: (20250305 - Shirley) 添加搜索條件
    const searchWhereCondition = searchQuery
      ? {
          userId,
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
          company: {
            OR: [{ deletedAt: 0 }, { deletedAt: null }],
            AND: [
              {
                OR: [{ name: { contains: searchQuery } }, { taxId: { contains: searchQuery } }],
              },
            ],
          },
        }
      : baseWhereCondition;

    // Info: (20250305 - Shirley) 1. 獲取用戶的公司和角色資訊
    const adminResults = await prisma.admin.findMany({
      where: searchWhereCondition,
      orderBy,
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

    // Info: (20250305 - Shirley) 2. 獲取每個公司對應的團隊資訊
    const accountBookPromises = adminResults.map(async (admin) => {
      const { teamId } = admin.company;
      let teamInfo = null;

      if (teamId) {
        // Info: (20250305 - Shirley) 獲取團隊資訊
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          include: {
            members: {
              select: {
                userId: true,
                role: true,
                user: {
                  select: { name: true, email: true, imageFileId: true },
                },
              },
            },
            ledger: {
              select: { id: true },
            },
            subscription: {
              include: { plan: true },
            },
            imageFile: {
              select: { id: true, url: true },
            },
          },
        });

        if (team) {
          const userRole =
            (team.members.find((member) => member.userId === userId)?.role as TeamRole) ??
            TeamRole.VIEWER;
          const planType = team.subscription
            ? (team.subscription.plan.type as TPlanType)
            : TPlanType.BEGINNER;

          teamInfo = {
            id: team.id,
            imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
            role: userRole,
            name: {
              value: team.name,
              editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
            },
            about: {
              value: team.about || '',
              editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
            },
            profile: {
              value: team.profile || '',
              editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
            },
            planType: {
              value: planType,
              editable: false,
            },
            totalMembers: team.members.length,
            totalAccountBooks: team.ledger.length,
            bankAccount: {
              value: team.bankInfo
                ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
                : '',
              editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
            },
          };
        }
      }

      // Info: (20250305 - Shirley) 3. 組合成 IAccountBookForUserWithTeam 格式
      return {
        teamId: teamId ?? 0,
        company: {
          id: admin.company.id,
          imageId: admin.company.imageFile?.url ?? '/images/fake_company_img.svg',
          name: admin.company.name,
          taxId: admin.company.taxId,
          startDate: admin.company.startDate,
          createdAt: admin.company.createdAt,
          updatedAt: admin.company.updatedAt,
          isPrivate: admin.company.isPrivate,
        },
        team: teamInfo,
        tag: admin.tag as WORK_TAG,
        order: admin.order,
        role: {
          id: admin.role.id,
          name: admin.role.name,
          permissions: admin.role.permissions as string[],
          createdAt: admin.role.createdAt,
          updatedAt: admin.role.updatedAt,
        },
        isTransferring: false, // TODO: (20250305 - Shirley) 預設為 false，實際情況可能需要從其他地方獲取
      } as IAccountBookForUserWithTeam;
    });

    accountBooks = await Promise.all(accountBookPromises);

    // Info: (20250305 - Shirley) 處理團隊名稱的搜索
    // 由於團隊名稱不在 Prisma 查詢中，需要在獲取數據後進行過濾
    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      accountBooks = accountBooks.filter((accountBook) => {
        // 如果已經通過公司名稱或稅號匹配，則不需要再檢查團隊名稱
        return accountBook.team?.name.value.toLowerCase().includes(lowerCaseSearchQuery);
      });
    }
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'list account books by user id failed',
      errorMessage: (error as Error).message,
    });
  }

  // Info: (20250305 - Shirley) 6. 分頁處理
  const totalCount = accountBooks.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (page < 1) {
    page = 1;
  }

  const skip = pageToOffset(page, pageSize);
  const paginatedAccountBooks = accountBooks.slice(skip, skip + pageSize);

  return {
    data: paginatedAccountBooks,
    page,
    totalPages,
    totalCount,
    pageSize,
    sort: sortOptions || [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  };
}
