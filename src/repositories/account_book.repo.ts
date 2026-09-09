import { prisma } from "@/lib/prisma";
import { Prisma, AccountBook, TeamMember, Team } from "@/generated";
import { addressLookupForms } from "@/lib/team/address_identity";

export interface IAccountBookRepository {
  create(data: Prisma.AccountBookCreateInput): Promise<AccountBook>;
  listTeamsAccountBooksByUserId(userId: string): Promise<
    (TeamMember & {
      team: Team & {
        accountBooks: AccountBook[];
      };
    })[]
  >;
  listTeamsAccountBooksByTeamId(teamId: string): Promise<AccountBook[]>;
  updateAccountBook(
    accountBookId: string,
    data: Prisma.AccountBookUpdateInput,
  ): Promise<AccountBook>;
  transferAccountBook(
    accountBookId: string,
    teamId: string,
  ): Promise<AccountBook>;
  softDelete(accountBookId: string): Promise<AccountBook>;
  hasAssociatedEsgData(userId: string, enterpriseId: string): Promise<boolean>;
  getCreatedAt(accountBookId: string): Promise<Date | null>;
}

export class AccountBookRepository {
  async create(data: Prisma.AccountBookCreateInput) {
    const accountBook = await prisma.accountBook.create({
      data,
    });
    return accountBook;
  }

  async findFirst(args: Prisma.AccountBookFindFirstArgs) {
    return prisma.accountBook.findFirst(args);
  }

  async listTeamsAccountBooksByUserId(userId: string) {
    // Info: (20260306 - Luphia) 這裡在 include 加入 filter，只取未刪除的帳本
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId,
      },
      include: {
        team: {
          include: {
            accountBooks: {
              where: { deletedAt: null }, // Info: (20260306 - Luphia) 軟刪除過濾
            },
          },
        },
      },
    });
    return teamMembers;
  }

  async getAccountBookById(accountBookId: string) {
    const accountBook = await prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        deletedAt: null,
      },
    });
    return accountBook;
  }

  async getAccountBookByIdAndUserAddress(
    accountBookId: string,
    userAddress: string,
  ) {
    return prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        team: {
          teamMembers: { some: { user: { address: userAddress } } },
        },
        deletedAt: null,
      },
    });
  }

  /**
   * Info: (20260716 - Tzuhan) #52 取得使用者於帳本所屬團隊的角色(非成員回 null)
   * 供碳盤查報告權限裁決:VIEWER 可閱覽、EDITOR 以上可編輯
   *
   * Info: (20260909 - Emily) 位址比對走 `addressLookupForms`,不是精確比對(#6783 review 阻-1)。
   *
   * `User.address` 有兩種形狀共存 —— viem 對合約回傳一律 EIP-55 checksum,
   * `setup.service.ts` 建的使用者是全小寫(見 `address_identity.ts` 檔頭)。原本這裡是
   * `address: userAddress` 精確比對,只有在「傳進來的位址與存進去的是同一份」時才成立。
   *
   * 它成立了三個呼叫端(都傳 session 位址,與 `User.address` 同源同形狀),然後在第四個
   * 呼叫端破掉:`canReadAttachmentCid` 傳的是 `CarbonAttachmentOwner.address`,那一欄是
   * **正規化後的小寫**。於是 checksum 形狀的擁有者一律查不到 → 「同帳本接續者可讀」
   * (#6748 review 中-1)對那些使用者從第一天就不生效,而失敗長得跟合法拒絕一模一樣。
   *
   * `in` 而不是 `mode: "insensitive"`:後者走 ILIKE,吃不到 `User.address` 的索引。
   * 撈出來是超集,但兩種形狀都是同一個位址,不需要再收斂。
   */
  async getMemberRoleByAddress(accountBookId: string, userAddress: string) {
    const member = await prisma.teamMember.findFirst({
      where: {
        user: { address: { in: addressLookupForms(userAddress) } },
        team: {
          accountBooks: { some: { id: accountBookId, deletedAt: null } },
        },
      },
      select: { role: true },
    });
    return member?.role ?? null;
  }

  async listTeamsAccountBooksByTeamId(teamId: string) {
    // Info: (20260306 - Luphia) 查詢特定團隊時過濾掉已刪除帳本
    const accountBooks = await prisma.accountBook.findMany({
      where: {
        teamId,
        deletedAt: null, // Info: (20260306 - Luphia) 軟刪除過濾
      },
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
        deletedAt: null,
      },
      data: {
        team: { connect: { id: teamId } },
      },
    });

    return accountBook;
  }

  async updateAccountBook(
    accountBookId: string,
    data: Prisma.AccountBookUpdateInput,
  ) {
    /**
     * Info: (20260306 - Luphia) Update accountBook details.
     * Logic:
     * 1. 確保該帳本 ID 存在且尚未被標記為軟刪除。
     * 2. 執行局部更新 (Partial Update)。
     */
    const accountBook = await prisma.accountBook.update({
      where: {
        id: accountBookId,
        deletedAt: null, // Info: (20260306 - Luphia) 確保不更新已刪除的資料
      },
      data,
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
      data: { deletedAt: new Date() },
    });
    return accountBook;
  }

  async hasAssociatedEsgData(
    userId: string,
    enterpriseId: string,
  ): Promise<boolean> {
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
    });
    const teamIds = teamMembers.map((tm) => tm.teamId);

    const matchedAccountBook = await prisma.accountBook.findFirst({
      where: { teamId: { in: teamIds }, enterpriseId: enterpriseId },
    });

    const esgRecordsCount = matchedAccountBook
      ? await prisma.esgRecord.count({
          where: { accountBookId: matchedAccountBook.id, deletedAt: null },
        })
      : 0;

    return esgRecordsCount > 0;
  }

  /**
   * Info: (20260907 - Julian) 這本帳是什麼時候建立的 —— 只取那一格。
   *
   * 薪資紀錄完整度用它當起算的下限（`missingSalaryPeriods` 的 `bookCreatedAt`）：
   * 帳本還不存在的月份不可能有薪資單。`select` 只要 `createdAt`，
   * 因為呼叫端要的就是那一格，而 `AccountBook` 整列有二十幾欄。
   *
   * 查不到回 `null`（帳本被刪、或 id 不存在）。呼叫端據此退回「沒有下限」——
   * 那時員工名單本來也會是空的。
   */
  async getCreatedAt(accountBookId: string): Promise<Date | null> {
    const found = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
      select: { createdAt: true },
    });

    return found?.createdAt ?? null;
  }
}

export const accountBookRepo = new AccountBookRepository();
