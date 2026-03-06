import { prisma } from '@/lib/prisma';
import { Prisma, AccountBook, TeamMember, Team } from '@/generated/client';

export interface IAccountBookRepository {
  create(data: Prisma.AccountBookCreateInput): Promise<AccountBook>;
  listTeamsAccountBooksByUserId(userId: string): Promise<
    (TeamMember & {
      team: Team & {
        accountBooks: AccountBook[]
      }
    })[]
  >;
  listTeamsAccountBooksByTeamId(teamId: string): Promise<AccountBook[]>;
  updateAccountBook(
    accountBookId: string,
    data: Prisma.AccountBookUpdateInput
  ): Promise<AccountBook>;
  transferAccountBook(accountBookId: string, teamId: string): Promise<AccountBook>;
  softDelete(accountBookId: string): Promise<AccountBook>;
}

export class AccountBookRepository {
  async create(data: Prisma.AccountBookCreateInput) {
    const accountBook = await prisma.accountBook.create({
      data
    });
    return accountBook;
  }

  async listTeamsAccountBooksByUserId(userId: string) {
    // Info: (20260306 - Luphia) 這裡在 include 加入 filter，只取未刪除的帳本
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId
      },
      include: {
        team: {
          include: {
            accountBooks: {
              where: { deletedAt: null } // Info: (20260306 - Luphia) 軟刪除過濾
            }
          }
        }
      }
    });
    return teamMembers;
  }

  async listTeamsAccountBooksByTeamId(teamId: string) {
    // Info: (20260306 - Luphia) 查詢特定團隊時過濾掉已刪除帳本
    const accountBooks = await prisma.accountBook.findMany({
      where: {
        teamId,
        deletedAt: null // Info: (20260306 - Luphia) 軟刪除過濾
      }
    });
    return accountBooks;
  }

  async transferAccountBook(accountBookId: string, teamId: string) {
    /**
     * Info: (20260306 - Luphia) 轉移帳本
     * 額外加入 deletedAt: null 確保不會不小心操作到已被刪除的帳本
     */
    const accountBook = await prisma.accountBook.update({
      where: {
        id: accountBookId,
        deletedAt: null
      },
      data: {
        team: { connect: { id: teamId } }
      },
    });

    return accountBook;
  }

  async updateAccountBook(accountBookId: string, data: Prisma.AccountBookUpdateInput) {
    /**
     * Info: (20260306 - Luphia) Update accountBook details.
     * Logic: 
     * 1. 確保該帳本 ID 存在且尚未被標記為軟刪除。
     * 2. 執行局部更新 (Partial Update)。
     */
    const accountBook = await prisma.accountBook.update({
      where: {
        id: accountBookId,
        deletedAt: null // Info: (20260306 - Luphia) 確保不更新已刪除的資料
      },
      data
    });

    return accountBook;
  }

  async softDelete(accountBookId: string) {
    /**
     * Info: (20260306 - Luphia) 執行軟刪除
     * 將 deletedAt 標記為當前時間，而非真正從 DB 抹除
     */
    const accountBook = await prisma.accountBook.update({
      where: { id: accountBookId },
      data: { deletedAt: new Date() }
    });
    return accountBook;
  }
};

export const AccountBookRepo = new AccountBookRepository();
