import { COUNTRY, CURRENCY, RULE } from "@/constants/accounts";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { teamRepo } from "@/repositories/team.repo";
import { IAccountBook } from "@/interfaces/account_book";

// Info: (20260308 - Luphia) 找出所有帳簿的團隊，使用 createAccountBook 為他建立一個
export const createAccountBookForTeamsWithoutOne = async () => {
  const teamsWithoutAccountBook = await teamRepo.findManyTeams({
    where: {
      accountBooks: {
        none: {},
      },
    },
  });

  const results: IAccountBook[] = [];
  for (const team of teamsWithoutAccountBook) {
    const accountBook = await createAccountBook({
      name: "New Account Book",
      country: COUNTRY.TW,
      currency: CURRENCY.TW,
      rule: RULE.T_IFRS,
      teamId: team.id,
    });
    results.push(accountBook);
  }

  return results;
};

// Info: (20260308 - Luphia) 找出用戶可以存取的帳簿清單，並提供用戶角色
export const getAccountBooksByUserId = async (
  userId: string,
): Promise<IAccountBook[]> => {
  const teamMembers =
    await accountBookRepo.listTeamsAccountBooksByUserId(userId);
  return teamMembers.flatMap((member) =>
    member.team.accountBooks.map((ab) => ({
      ...ab,
      teamId: member.team.id,
      teamName: member.team.name,
      userRole: member.role,
    })),
  );
};

// Info: (20260308 - Luphia) 找出團隊可以存取的帳簿清單
export const getAccountBooksByTeamId = async (
  teamId: string,
): Promise<IAccountBook[]> => {
  return accountBookRepo.listTeamsAccountBooksByTeamId(teamId);
};

export interface IAccountBookCreateInput {
  name: string;
  country: string;
  currency: string;
  rule: string;
  teamId: string;
  enterpriseId?: string | null;
  esgIndustryId?: number | null;
  parValue?: number;
  createdAt?: Date;
}

// Info: (20260508 - Julian) 建立一個帳簿
export const createAccountBook = async (
  data: IAccountBookCreateInput,
): Promise<IAccountBook> => {
  const { teamId, ...rest } = data;
  const updatedData = {
    ...rest,
    team: { connect: { id: teamId } },
  };
  return accountBookRepo.create(updatedData);
};

// Info: (20260308 - Luphia) 取得一個帳簿
export const getAccountBookById = async (
  accountBookId: string,
): Promise<IAccountBook | null> => {
  return accountBookRepo.getAccountBookById(accountBookId);
};

// Info: (20260308 - Luphia) 編輯帳簿
export const updateAccountBook = async (
  accountBookId: string,
  data: Partial<IAccountBook>, // Info: (20260508 - Julian) 目前使用 Partial<IAccountBook> 作為參數，未來可依據需求擴充其他欄位
): Promise<IAccountBook> => {
  return accountBookRepo.updateAccountBook(accountBookId, data);
};

// Info: (20260308 - Luphia) 轉移帳簿
export const transferAccountBook = async (
  accountBookId: string,
  teamId: string,
): Promise<IAccountBook> => {
  return accountBookRepo.transferAccountBook(accountBookId, teamId);
};

// Info: (20260308 - Luphia) 軟刪除帳簿
export const deleteAccountBook = async (
  accountBookId: string,
): Promise<IAccountBook> => {
  return accountBookRepo.softDelete(accountBookId);
};
