import { COUNTRY, CURRENCY, RULE } from '@/constants/accounts';
import { Prisma } from '@/generated/client';
import { prisma } from '@/lib/prisma';
import { AccountBookRepo } from '@/repositories/account_book.repo';

export interface IAccountBook {
  id: string;
  name: string;
  country: string;
  currency: string;
  rule: string;
  teamId?: string;
  teamName?: string;
  userRole?: string;
}

// Info: (20260308 - Luphia) 找出所有帳簿的團隊，使用 createAccountBook 為他建立一個
export const createAccountBookForTeamsWithoutOne = async () => {
  const teamsWithoutAccountBook = await prisma.team.findMany({
    where: {
      accountBooks: {
        none: {},
      },
    },
  });

  const results: IAccountBook[] = [];
  for (const team of teamsWithoutAccountBook) {
    const accountBook = await createAccountBook({
      name: 'New Account Book',
      country: COUNTRY.TW,
      currency: CURRENCY.TW,
      rule: RULE.T_IFRS,
      team: { connect: { id: team.id } },
    });
    results.push(accountBook);
  }

  return results;
};

// Info: (20260308 - Luphia) 找出用戶可以存取的帳簿清單，並提供用戶角色
export const getAccountBooksByUserId = async (userId: string): Promise<IAccountBook[]> => {
  const teamMembers = await AccountBookRepo.listTeamsAccountBooksByUserId(userId);
  return teamMembers.flatMap((member) =>
    member.team.accountBooks.map((ab) => ({
      ...ab,
      teamId: member.team.id,
      teamName: member.team.name,
      userRole: member.role,
    }))
  );
};

// Info: (20260308 - Luphia) 找出團隊可以存取的帳簿清單
export const getAccountBooksByTeamId = async (teamId: string): Promise<IAccountBook[]> => {
  return AccountBookRepo.listTeamsAccountBooksByTeamId(teamId);
};

// Info: (20260308 - Luphia) 建立一個帳簿
export const createAccountBook = async (data: Prisma.AccountBookCreateInput): Promise<IAccountBook> => {
  return AccountBookRepo.create(data);
};

// Info: (20260308 - Luphia) 取得一個帳簿
export const getAccountBookById = async (accountBookId: string): Promise<IAccountBook | null> => {
  return AccountBookRepo.getAccountBookById(accountBookId);
};

// Info: (20260308 - Luphia) 編輯帳簿
export const updateAccountBook = async (accountBookId: string, data: Prisma.AccountBookUpdateInput): Promise<IAccountBook> => {
  return AccountBookRepo.updateAccountBook(accountBookId, data);
};

// Info: (20260308 - Luphia) 轉移帳簿
export const transferAccountBook = async (accountBookId: string, teamId: string): Promise<IAccountBook> => {
  return AccountBookRepo.transferAccountBook(accountBookId, teamId);
};

// Info: (20260308 - Luphia) 軟刪除帳簿
export const deleteAccountBook = async (accountBookId: string): Promise<IAccountBook> => {
  return AccountBookRepo.softDelete(accountBookId);
};

