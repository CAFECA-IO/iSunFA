import prisma from '@/client';
import { Company, Prisma, File, CompanySetting } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { TeamRole, LeaveStatus } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { SortOrder, SortBy } from '@/constants/sort';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { IAccountBookWithTeam, WORK_TAG } from '@/interfaces/account_book';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { createOrderByList } from '@/lib/utils/sort';

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

export async function getCompanyWithOwner(companyId: number): Promise<Company | null> {
  let company: Company | null = null;
  if (companyId > 0) {
    company = await prisma.company.findUnique({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
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

export const listAccountBookByUserId = async (
  userId: number,
  queryParams: {
    page?: number;
    pageSize?: number;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
    sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
  }
): Promise<IPaginatedOptions<IAccountBookWithTeam[]>> => {
  const {
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

  // 1️⃣ 查詢 User 所屬的所有 Team
  const userTeams = await prisma.teamMember.findMany({
    where: {
      userId,
      status: LeaveStatus.IN_TEAM,
    },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  if (teamIds.length === 0) {
    return toPaginatedData({
      data: [],
      page,
      totalPages: 0,
      totalCount: 0,
      pageSize,
      sort: sortOption,
    });
  }

  // 2️⃣ 查詢 Team 內的所有 Company (帳本) 總數
  const totalCount = await prisma.company.count({
    where: {
      teamId: { in: teamIds },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      createdAt: { gte: startDate, lte: endDate },
      AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
    },
  });

  // 3️⃣ 取得帳本資訊，包含所屬 Team
  const accountBooks = await prisma.company.findMany({
    where: {
      teamId: { in: teamIds },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      createdAt: { gte: startDate, lte: endDate },
      AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
    },
    include: {
      team: {
        include: {
          members: {
            where: { status: LeaveStatus.IN_TEAM },
            select: { id: true, userId: true, role: true },
          },
          accountBook: true,
          subscription: { include: { plan: true } },
          imageFile: { select: { id: true, url: true } },
        },
      },
      imageFile: { select: { id: true, url: true } },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption),
  });

  // 4️⃣ 格式化回傳數據
  return toPaginatedData({
    data: accountBooks.map((book) => {
      const teamMember = book.team?.members.find((member) => member.userId === userId);
      const teamRole = (teamMember?.role ?? TeamRole.VIEWER) as TeamRole;

      return {
        id: book.id,
        imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
        name: book.name,
        taxId: book.taxId,
        startDate: book.startDate,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        isPrivate: book.isPrivate ?? false,
        tag: book.tag as WORK_TAG,
        team: book.team
          ? {
              id: book.team.id,
              imageId: book.team.imageFile?.url ?? '/images/fake_team_img.svg',
              role: teamRole,
              name: { value: book.team.name, editable: teamRole !== TeamRole.VIEWER },
              about: { value: book.team.about ?? '', editable: teamRole !== TeamRole.VIEWER },
              profile: { value: book.team.profile ?? '', editable: teamRole !== TeamRole.VIEWER },
              planType: {
                value: book.team.subscription?.plan.type ?? TPlanType.BEGINNER,
                editable: false,
              },
              totalMembers: book.team.members.length || 0,
              totalAccountBooks: book.team.accountBook.length || 0,
              bankAccount: {
                value: book.team.bankInfo
                  ? `${(book.team.bankInfo as { code: string }).code}-${(book.team.bankInfo as { number: string }).number}`
                  : '',
                editable: false,
              },
            }
          : null,
        isTransferring: false, // ToDo: (20250306 - Tzuhan) 待DB新增欄位後更新成正確值
      } as IAccountBookWithTeam;
    }),
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: sortOption,
  });
};
