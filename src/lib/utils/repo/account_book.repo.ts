import prisma from '@/client';
import { IAccountBookForUserWithTeam, WORK_TAG } from '@/interfaces/account_book';
import { TeamRole } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { SortOrder } from '@/constants/sort';
import { DEFAULT_PAGE_START_AT, DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { IPaginatedOptions } from '@/interfaces/pagination';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { pageToOffset } from '@/lib/utils/common';

/**
 * 獲取用戶的帳本列表，包含團隊資訊
 * @param userId 用戶 ID
 * @param page 頁碼
 * @param pageSize 每頁數量
 * @returns 分頁後的帳本列表
 */
export async function listAccountBookByUserId(
  userId: number,
  initialPage: number = DEFAULT_PAGE_START_AT,
  pageSize: number = DEFAULT_PAGE_LIMIT
): Promise<IPaginatedOptions<IAccountBookForUserWithTeam[]>> {
  let accountBooks: IAccountBookForUserWithTeam[] = [];
  let page = initialPage;

  try {
    // 1. 獲取用戶的公司和角色資訊
    const adminResults = await prisma.admin.findMany({
      where: {
        userId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
        company: {
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
        },
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

    // 2. 獲取每個公司對應的團隊資訊
    const accountBookPromises = adminResults.map(async (admin) => {
      const { teamId } = admin.company;
      let teamInfo = null;

      if (teamId) {
        // 獲取團隊資訊
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

      // 3. 組合成 IAccountBookForUserWithTeam 格式
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
        isTransferring: false, // 預設為 false，實際情況可能需要從其他地方獲取
      } as IAccountBookForUserWithTeam;
    });

    accountBooks = await Promise.all(accountBookPromises);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'list account books by user id failed',
      errorMessage: (error as Error).message,
    });
    loggerBack.error(`Error in listAccountBookByUserId: ${(error as Error).message}`);
  }

  // 4. 分頁處理
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
    sort: [{ sortBy: 'order', sortOrder: SortOrder.DESC }],
  };
}
