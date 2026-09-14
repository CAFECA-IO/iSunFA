import { prisma } from "@/lib/prisma";
import { IAccountBookCompanyProfile } from "@/interfaces/salary_company_profile";

/**
 * Info: (20260914 - Julian) 帳本公司設定的存取層。與帳本 1:1。
 *
 * 這張表**沒有 `deletedAt`**：1:1 且沒有「刪除公司」這個動作，只有改內容。
 * 改的軌跡由 service 層的 `AuditLog` 承擔（計劃書 §5.4）。
 * `salary_repo_scope.test.ts` 的 `LIFECYCLE` 裡兩支都登記為 `NO_SOFT_DELETE`。
 *
 * 這裡不判斷「可不可以改」，那是 route 的授權閘與 service 的事。
 */
export interface IAccountBookCompanyProfileRepository {
  getProfile(accountBookId: string): Promise<IAccountBookCompanyProfile | null>;
  upsertProfile(params: {
    accountBookId: string;
    profile: IAccountBookCompanyProfile;
  }): Promise<IAccountBookCompanyProfile>;
}

const toProfile = (row: {
  entityName: string;
  taxId: string | null;
  responsiblePerson: string | null;
  address: string | null;
  leaveYearScheme: IAccountBookCompanyProfile["leaveYearScheme"];
  leaveYearStartMonth: number | null;
  leaveYearStartDay: number | null;
}): IAccountBookCompanyProfile => ({
  entityName: row.entityName,
  taxId: row.taxId,
  responsiblePerson: row.responsiblePerson,
  address: row.address,
  leaveYearScheme: row.leaveYearScheme,
  leaveYearStartMonth: row.leaveYearStartMonth,
  leaveYearStartDay: row.leaveYearStartDay,
});

class AccountBookCompanyProfileRepository implements IAccountBookCompanyProfileRepository {
  public async getProfile(
    accountBookId: string,
  ): Promise<IAccountBookCompanyProfile | null> {
    const row = await prisma.accountBookCompanyProfile.findUnique({
      // Info: (20260914 - Julian) 租戶過濾永遠是 where 的第一個 key
      where: { accountBookId },
    });

    return row === null ? null : toProfile(row);
  }

  /**
   * Info: (20260914 - Julian) 沒有這一列就建、有就整份覆寫。
   *
   * 用 `upsert` 而不是「先查再決定」：兩次往返之間有人也按了儲存的話，
   * 後到的那一次會撞上 `@@unique` 而噴錯 —— 而使用者看到的是儲存失敗，
   * 卻不知道為什麼。`upsert` 讓「第一次設定」與「之後修改」是同一條路。
   *
   * **整份覆寫而不是部分更新**：這是一張表單，送出的就是完整的一份。
   * 部分更新會讓「把統編清空」與「沒有動統編」在 payload 上分不開。
   */
  public async upsertProfile(params: {
    accountBookId: string;
    profile: IAccountBookCompanyProfile;
  }): Promise<IAccountBookCompanyProfile> {
    const { accountBookId, profile } = params;

    const row = await prisma.accountBookCompanyProfile.upsert({
      // Info: (20260914 - Julian) 租戶過濾永遠是 where 的第一個 key
      where: { accountBookId },
      create: { accountBookId, ...profile },
      update: { ...profile },
    });

    return toProfile(row);
  }
}

export const accountBookCompanyProfileRepo: IAccountBookCompanyProfileRepository =
  new AccountBookCompanyProfileRepository();
