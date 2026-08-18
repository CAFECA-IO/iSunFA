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
 * Info: (20260813 - Julian) 登入身分（User）與員工檔（Employee）之間的橋。
 *
 * 首次登入以已驗證信箱比對 Employee.email 完成綁定，寫入 Employee.userId；
 * 之後一律走 userId，不再碰信箱。`Employee.userId` 是綁定本身，信箱只是
 * 首次綁定的引導。Passkey 帳號沒有信箱，走不到自動綁定，需由人事手動綁定
 * （scripts/seed/link_employee_user.ts）。個人信箱是密文，只能比對公司信箱。
 */
export class AttendanceIdentityService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly identities: IUserIdentityRepository,
  ) {}

  /**
   * Info: (20260813 - Julian) 取得登入者在指定帳本下的員工檔，必要時完成首次綁定。
   *
   * 找不到一律回 404（NF_EMPLOYEE_FOR_USER），即使是「員工屬於別的帳本」，
   * 避免回 403 洩漏「這個信箱有員工檔」。
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
   * Info: (20260813 - Julian) 首次登入的綁定。只採信 emailVerified 為真的信箱，
   * 避免未驗證信箱被冒用。
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
     * Info: (20260813 - Julian) 大小寫不同的多筆員工檔命中時拒絕，不擅自挑一筆——
     * email 比對大小寫敏感，任選會讓某人冒用他人身分打卡。
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
     * Info: (20260813 - Julian) 條件式更新未生效，代表查寫之間已被別人綁走；
     * 重讀一次：同一 user 的併發首登直接回傳，否則視為衝突。
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
