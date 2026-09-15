import { prisma } from "@/lib/prisma";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";
import { IAccountBookCompanyProfile } from "@/interfaces/salary_company_profile";

/**
 * Info: (20260914 - Julian) 帳本公司設定的存取層。與帳本 1:1。
 *
 * 這張表**沒有 `deletedAt`**：1:1 且沒有「刪除公司」這個動作，只有改內容。
 * `salary_repo_scope.test.ts` 的 `LIFECYCLE` 裡兩支都登記為 `NO_SOFT_DELETE`。
 *
 * Info: (20260914 - Julian) 改的軌跡寫在**這一層、同一個交易裡**（計劃書 §5.4 已更正）。
 *
 * 計劃書原本寫「由 service 層承擔」。改掉的理由與 `salaryRecordRepo.deleteRecord`
 * 同一條，而那一條是實際踩過的：
 *
 * 1. **在 repository** —— 放 service 的話，日後多一條寫入路徑（帳本複製、
 *    匯入、後台修正）就是各記一次，而漏掉的那一條沒有任何症狀。
 * 2. **同一個交易** —— 分兩次寫，中間失敗會產生「改了但沒紀錄」
 *    （軌跡憑空消失）或「有紀錄但沒改」（假的軌跡）。
 *
 * 這裡不判斷「可不可以改」，那是 route 的授權閘與 service 的事。
 */
export interface IAccountBookCompanyProfileRepository {
  getProfile(accountBookId: string): Promise<IAccountBookCompanyProfile | null>;
  upsertProfile(params: {
    accountBookId: string;
    profile: IAccountBookCompanyProfile;
    changedByUserId: string;
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
    changedByUserId: string;
  }): Promise<IAccountBookCompanyProfile> {
    const { accountBookId, profile, changedByUserId } = params;

    return prisma.$transaction(async (tx) => {
      /**
       * Info: (20260914 - Julian) 先看有沒有，只為了分辨 `CREATE` 與 `UPDATE`。
       *
       * 這**不是**回到「先查再決定」—— 寫入仍然是 `upsert`，上面那段
       * 講的競態還是由它擋住。這一查只影響軌跡上記的動作名稱。
       *
       * 同一個交易裡兩支並發首次儲存時，兩筆都可能記成 `CREATE`。
       * 接受：軌跡要回答的是「誰在什麼時候動過這本帳的公司設定」，
       * 而那個答案在兩筆都記 `CREATE` 的情況下仍然是對的。
       */
      const existing = await tx.accountBookCompanyProfile.findUnique({
        // Info: (20260914 - Julian) 租戶過濾永遠是 where 的第一個 key
        where: { accountBookId },
        select: { id: true },
      });

      const row = await tx.accountBookCompanyProfile.upsert({
        // Info: (20260914 - Julian) 租戶過濾永遠是 where 的第一個 key
        where: { accountBookId },
        create: { accountBookId, ...profile },
        update: { ...profile },
      });

      /**
       * Info: (20260914 - Julian) `dataId` 填**帳本 id**，不是這一列的 uuid。
       *
       * 那個 uuid 在整個系統裡沒有任何地方顯示得出來，拿它當查詢軸線
       * 等於這些軌跡誰都查不到（稽核頁的關鍵字就是查 `dataId`）。
       * 完整理由在 `AuditLogDataType.ACCOUNT_BOOK_COMPANY_PROFILE` 的註解。
       */
      await tx.auditLog.create({
        data: {
          accountBookId,
          userId: changedByUserId,
          dataType: AuditLogDataType.ACCOUNT_BOOK_COMPANY_PROFILE,
          dataId: accountBookId,
          action:
            existing === null ? AuditLogAction.CREATE : AuditLogAction.UPDATE,
        },
      });

      return toProfile(row);
    });
  }
}

export const accountBookCompanyProfileRepo: IAccountBookCompanyProfileRepository =
  new AccountBookCompanyProfileRepository();
