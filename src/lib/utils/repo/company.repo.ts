import prisma from '@/client';
import { Admin, Company, Prisma, File, CompanySetting } from '@prisma/client';
import { getTimestampNow, timestampInSeconds, pageToOffset } from '@/lib/utils/common';
import { CompanyRoleName } from '@/interfaces/role';
import { TeamRole, LeaveStatus } from '@/interfaces/team';
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
    // Info: (20250306 - Shirley) 處理排序選項
    const defaultSortOption = { sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC };
    // TODO: (20250306 - Shirley) 如果沒有排序選項，則使用預設排序；有多個排序選項時，目前只使用第一個，以後需要改成多重排序
    const sortOption = sortOptions && sortOptions.length > 0 ? sortOptions[0] : defaultSortOption;

    // Info: (20250306 - Shirley) 根據排序選項設置 Prisma 的排序條件
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
        // Info: (20250306 - Shirley) 預設按照 order 排序
        orderBy = {
          order: sortOption.sortOrder,
        };
        break;
    }

    // Info: (20250306 - Shirley) 構建查詢條件
    let whereCondition: Prisma.AdminWhereInput = {
      userId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
      company: {
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    };

    // Info: (20250306 - Shirley) 如果有搜索查詢，添加搜索條件
    if (searchQuery) {
      whereCondition = {
        userId,
        AND: [
          { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
          {
            OR: [
              // Info: (20250306 - Shirley) 搜索公司/帳本名稱
              {
                company: {
                  OR: [{ deletedAt: 0 }, { deletedAt: null }],
                  name: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode },
                },
              },
              // Info: (20250306 - Shirley) 搜索公司稅號
              {
                company: {
                  OR: [{ deletedAt: 0 }, { deletedAt: null }],
                  taxId: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode },
                },
              },
              // Info: (20250306 - Shirley) 搜索角色名稱
              {
                role: {
                  name: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode },
                },
              },
              // Info: (20250306 - Shirley) 搜索標籤
              {
                tag: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode },
              },
              // Info: (20250306 - Shirley) 搜索團隊名稱
              {
                company: {
                  OR: [{ deletedAt: 0 }, { deletedAt: null }],
                  teamId: { not: null },
                  team: {
                    name: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode },
                  },
                },
              },
            ],
          },
        ],
      };
    }

    // Info: (20250306 - Shirley) 1. 獲取用戶的公司和角色資訊
    const adminResults = await prisma.admin.findMany({
      where: whereCondition,
      orderBy,
      include: {
        company: {
          include: {
            imageFile: true,
          },
        },
        role: true,
      },
    });

    // Info: (20250306 - Shirley) 2. 獲取每個公司對應的團隊資訊
    const accountBookPromises = adminResults.map(async (admin) => {
      const { teamId } = admin.company;
      let teamInfo = null;

      if (teamId) {
        // Info: (20250306 - Shirley) 獲取團隊資訊
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
            accountBook: {
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
            totalAccountBooks: team.accountBook.length,
            bankAccount: {
              value: team.bankInfo
                ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
                : '',
              editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
            },
          };
        }
      }

      // Info: (20250306 - Shirley) 3. 組合成 IAccountBookForUserWithTeam 格式
      return {
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
        isTransferring: admin.company.isTransferring || false, // Info: (20250306 - Shirley) 使用數據庫中的 isTransferring 值
      } as IAccountBookForUserWithTeam;
    });

    // Info: (20230506 - Shirley) 4. 獲取用戶所屬團隊的帳本
    // Info: (20230506 - Shirley) 找出用戶加入的所有團隊
    const userTeams = await prisma.teamMember.findMany({
      where: {
        userId,
        status: LeaveStatus.IN_TEAM,
      },
      select: {
        teamId: true,
        role: true,
        team: true,
      },
    });

    // Info: (20230506 - Shirley) 對每個團隊，獲取用戶可以存取的帳本
    const teamAccountBookPromises = userTeams.map(async (teamMember) => {
      const teamRole = teamMember.role as TeamRole;

      // Info: (20230506 - Shirley) 根據用戶在團隊中的角色，獲取可存取的帳本
      // Info: (20230506 - Shirley) Owner 和 Admin 可以查看團隊中的所有帳本(包括私有帳本)
      // Info: (20230506 - Shirley) Editor 和 Viewer 只能查看公開帳本
      const teamAccountBooks = await prisma.company.findMany({
        where: {
          teamId: teamMember.teamId,
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
          AND: [
            searchQuery
              ? {
                  OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
                    { taxId: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
                  ],
                }
              : {},
          ],
        },
        include: {
          imageFile: true,
          team: {
            include: {
              members: {
                where: { status: LeaveStatus.IN_TEAM },
                select: { userId: true, role: true },
              },
              accountBook: {
                select: { id: true },
              },
              subscription: {
                include: { plan: true },
              },
              imageFile: {
                select: { id: true, url: true },
              },
            },
          },
        },
      });

      // Info: (20230506 - Shirley) 將團隊帳本轉換為 IAccountBookForUserWithTeam 格式
      return Promise.all(
        teamAccountBooks.map(async (book) => {
          // Info: (20230506 - Shirley) 檢查這個帳本是否已經包含在用戶的直接關聯帳本中
          const adminRecord = await prisma.admin.findFirst({
            where: {
              userId,
              companyId: book.id,
              OR: [{ deletedAt: 0 }, { deletedAt: null }],
            },
            include: {
              role: true,
            },
          });

          // Info: (20230506 - Shirley) 如果用戶與該帳本已有直接關聯，則跳過
          if (adminRecord) {
            return null;
          }

          const planType = book.team?.subscription
            ? (book.team.subscription.plan.type as TPlanType)
            : TPlanType.BEGINNER;

          const teamInfo = book.team
            ? {
                id: book.team.id,
                imageId: book.team.imageFile?.url ?? '/images/fake_team_img.svg',
                role: teamRole,
                name: {
                  value: book.team.name,
                  editable: teamRole === TeamRole.OWNER || teamRole === TeamRole.ADMIN,
                },
                about: {
                  value: book.team.about || '',
                  editable: teamRole === TeamRole.OWNER || teamRole === TeamRole.ADMIN,
                },
                profile: {
                  value: book.team.profile || '',
                  editable: teamRole === TeamRole.OWNER || teamRole === TeamRole.ADMIN,
                },
                planType: {
                  value: planType,
                  editable: false,
                },
                totalMembers: book.team.members.length,
                totalAccountBooks: book.team.accountBook.length,
                bankAccount: {
                  value: book.team.bankInfo
                    ? `${(book.team.bankInfo as { code: string }).code}-${
                        (book.team.bankInfo as { number: string }).number
                      }`
                    : '',
                  editable: teamRole === TeamRole.OWNER || teamRole === TeamRole.ADMIN,
                },
              }
            : null;

          return {
            company: {
              id: book.id,
              imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
              name: book.name,
              taxId: book.taxId,
              startDate: book.startDate,
              createdAt: book.createdAt,
              updatedAt: book.updatedAt,
              isPrivate: book.isPrivate,
            },
            team: teamInfo,
            tag: WORK_TAG.ALL, // Info: (20230506 - Shirley) 團隊帳本默認使用 ALL 標籤
            order: 0, // Info: (20230506 - Shirley) 團隊帳本默認排序為 0
            role: {
              // Info: (20230506 - Shirley) 用戶在團隊中的角色對應到帳本的角色
              id: 0, // Info: (20230506 - Shirley) 非直接關聯的角色，使用預設值
              name: teamRole,
              permissions: [], // Info: (20230506 - Shirley) 使用空權限列表，後續可根據團隊角色映射
              createdAt: 0,
              updatedAt: 0,
            },
            isTransferring: book.isTransferring || false,
          } as IAccountBookForUserWithTeam;
        })
      );
    });

    // Info: (20230506 - Shirley) 執行所有 Promise 並合併結果
    const directAccountBooks = await Promise.all(accountBookPromises);
    const teamAccountBooksArrays = await Promise.all(teamAccountBookPromises);

    // Info: (20230506 - Shirley) 扁平化團隊帳本數組並過濾掉 null 值
    const teamAccountBooks = teamAccountBooksArrays
      .flat()
      .filter((book): book is IAccountBookForUserWithTeam => book !== null);

    // Info: (20230506 - Shirley) 合併直接關聯帳本和團隊帳本
    accountBooks = [...directAccountBooks, ...teamAccountBooks];

    // Info: (20250306 - Shirley) 由於所有搜索邏輯已經在 Prisma 查詢中實現，不再需要額外的過濾步驟
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'list account books by user id failed',
      errorMessage: (error as Error).message,
    });
  }

  // Info: (20250306 - Shirley) 分頁處理
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
