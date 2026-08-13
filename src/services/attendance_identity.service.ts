import { Employee } from "@/generated";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { IUser } from "@/interfaces/user";
import {
  employeeRepo,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  userIdentityRepo,
  IUserIdentityRepository,
} from "@/repositories/user_identity.repo";

/**
 * Info: (20260813 - Julian) 登入身分與員工檔之間的橋。
 *
 * ## 為什麼需要它
 *
 * 登入完成後拿到的是一個 `User`，但打卡、班表、出勤全部掛在 `Employee` 上，
 * 而兩者之間原本沒有任何欄位相連。這支 service 就是那座橋。
 *
 * ## 綁定的兩個階段
 *
 * 1. **首次登入**：以已驗證的信箱比對 `Employee.email`（公司信箱），命中即寫入
 *    `Employee.userId`。
 * 2. **之後每一次**：直接走 `userId` 外鍵，不再碰信箱。
 *
 * ## Passkey 登入者走不到第 1 階段
 *
 * `User` 沒有 email 欄位，passkey 使用者也不會產生 `UserIdentity` ——
 * 候選信箱永遠是空陣列，因此必定落到 `NF_EMPLOYEE_FOR_USER`。
 * **這是正確行為，不是待修的缺口**：passkey 證明的是「你持有註冊時那把金鑰」，
 * 它問不出「你是哪個信箱的主人」。這類帳號的 `Employee.userId` 由人事以
 * `scripts/seed/link_employee_user.ts` 寫入，綁定的判斷責任因此留在人身上。
 *
 * **信箱比對只是首次綁定的引導，綁定本身是那個欄位。** 公司信箱可以變更
 * （改名、部門調動），而打卡歷史不該跟著飄移；把信箱當成長期的連結，
 * 等於讓一次人事異動改寫某人過去的出勤紀錄屬於誰。
 *
 * ## 為什麼只能用公司信箱
 *
 * `Employee.personalEmailCipher` 是密文，DB 端查不了（ADR 018 §7 已知取捨第 2 條）。
 * 用個人 Gmail 登入的人永遠對不上 —— 那是加密的必然結果，不是 bug。
 * Demo 的檢查清單因此要求上台者的 Google 帳號必須就是其公司信箱。
 */
export class AttendanceIdentityService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly identities: IUserIdentityRepository,
  ) {}

  /**
   * Info: (20260813 - Julian) 取得登入者在指定帳本下的員工檔，必要時完成首次綁定。
   *
   * 找不到時一律回 `NF_EMPLOYEE_FOR_USER`(404)，**包含「這個人是別的帳本的員工」
   * 這種情況** —— 回 403「你是員工但不屬於這個帳本」會洩漏一個不該由未授權者
   * 得知的事實：這個信箱在系統裡有員工檔。從呼叫端的視角，這個帳本裡就是沒有他。
   */
  public async resolveEmployee(
    user: IUser,
    accountBookId: string,
  ): Promise<Employee> {
    const linked = await this.employees.findByUserId(user.id);
    if (linked) {
      if (linked.accountBookId !== accountBookId) {
        logger.warn(
          `[attendance] user ${user.id} is linked to an employee in another account book`,
        );
        throw new AppError(API_ERRORS.NF_EMPLOYEE_FOR_USER);
      }
      return linked;
    }

    return this.linkOnFirstLogin(user, accountBookId);
  }

  /**
   * Info: (20260813 - Julian) 首次登入的綁定。
   *
   * 只採信 `emailVerified` 為真的信箱：未驗證的信箱是使用者在 provider 端自行填寫的字串，
   * 拿它比對等於讓任何人宣稱自己是任何員工。
   */
  private async linkOnFirstLogin(
    user: IUser,
    accountBookId: string,
  ): Promise<Employee> {
    const identities = await this.identities.findByUserId(user.id);
    const emails = identities
      .filter((identity) => identity.emailVerified && identity.email)
      .map((identity) => identity.email as string);

    const candidates = await this.employees.findByAccountBookAndEmails(
      accountBookId,
      emails,
    );

    if (candidates.length === 0) {
      throw new AppError(API_ERRORS.NF_EMPLOYEE_FOR_USER);
    }

    /**
     * Info: (20260813 - Julian) 只差大小寫的多筆員工檔 —— 拒絕，不挑一筆。
     *
     * `@@unique([accountBookId, email])` 大小寫敏感，因此
     * `Julian@x.com` 與 `julian@x.com` 可以同時存在。這種狀況下任選一筆綁定，
     * 就是讓某人以另一個人的身分打卡 —— 而出勤紀錄是法定文件。
     * 寧可擋住並要求 HR 先清理資料。
     */
    if (candidates.length > 1) {
      logger.error(
        `[attendance] ambiguous employee match for user ${user.id}: ${candidates.length} records differ only by email case`,
      );
      throw new AppError(API_ERRORS.CF_EMPLOYEE_EMAIL_AMBIGUOUS);
    }

    const candidate = candidates[0];
    if (candidate.userId && candidate.userId !== user.id) {
      throw new AppError(API_ERRORS.CF_EMPLOYEE_ALREADY_LINKED);
    }

    const bound = await this.employees.linkUser(candidate.id, user.id);
    if (bound) {
      return { ...candidate, userId: user.id };
    }

    /**
     * Info: (20260813 - Julian) 條件式更新沒有生效，代表在查與寫之間有人先綁走了。
     *
     * 兩種可能：另一個分頁的同一人（結果正確，直接回傳），
     * 或另一個帳號搶到同一筆員工檔（那是衝突）。重讀一次就能分辨 ——
     * 比照 `oauth.service` 對併發首登的處理：後到者不把錯誤丟給使用者，先確認對方是誰。
     */
    const afterRace = await this.employees.findByUserId(user.id);
    if (afterRace) return afterRace;

    throw new AppError(API_ERRORS.CF_EMPLOYEE_ALREADY_LINKED);
  }
}

export const attendanceIdentityService = new AttendanceIdentityService(
  employeeRepo,
  userIdentityRepo,
);
