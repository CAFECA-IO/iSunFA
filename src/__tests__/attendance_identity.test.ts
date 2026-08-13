import { describe, it, expect } from "@jest/globals";
import { Employee, UserIdentity } from "@/generated";
import { AttendanceIdentityService } from "@/services/attendance_identity.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { IEmployeeRepository } from "@/repositories/employee.repo";
import { IUserIdentityRepository } from "@/repositories/user_identity.repo";
import { IUser } from "@/interfaces/user";

/**
 * Info: (20260813 - Julian) 登入身分 → 員工檔的綁定。
 *
 * 這支 service 決定「打卡的這一筆算在誰頭上」，而出勤紀錄是法定文件 ——
 * 綁錯人不是顯示錯誤，是讓某人以另一個人的身分留下出勤事實。
 * 因此每一條「不綁」的路徑都要有測試，尤其是那些看起來可以將就過去的。
 *
 * repository 以手寫假物件注入（同 `oauth.service` 的建構子注入慣例），
 * 這支測試因此完全不碰資料庫。
 */

const ACCOUNT_BOOK_ID = "demo-book-public-works";

const user: IUser = {
  id: "user-1",
  address: "0xabc",
  pubKeyX: null,
  pubKeyY: null,
  credentialId: null,
  name: "張文彬",
  imageUrl: null,
  role: "USER",
  currentChallenge: null,
  identityAddress: null,
  createdAt: new Date("2026-08-01T00:00:00Z"),
  updatedAt: new Date("2026-08-01T00:00:00Z"),
};

const makeEmployee = (overrides: Partial<Employee> = {}): Employee =>
  ({
    id: "emp-5",
    employeeNo: "EMP005",
    name: "張文彬",
    email: "site.chief@example.com",
    accountBookId: ACCOUNT_BOOK_ID,
    userId: null,
    ...overrides,
  }) as Employee;

const makeIdentity = (overrides: Partial<UserIdentity> = {}): UserIdentity =>
  ({
    id: "identity-1",
    userId: user.id,
    provider: "GOOGLE",
    providerUserId: "google-1",
    email: "site.chief@example.com",
    emailVerified: true,
    ...overrides,
  }) as UserIdentity;

interface IStubs {
  linkedByUserId?: Employee | null;
  candidates?: Employee[];
  identities?: UserIdentity[];
  linkSucceeds?: boolean;
  // Info: (20260813 - Julian) 競態後重讀到的結果，用來模擬「被別人搶先」的兩種結局
  afterRace?: Employee | null;
}

const buildService = (stubs: IStubs): AttendanceIdentityService => {
  let findByUserIdCalls = 0;

  const employees: IEmployeeRepository = {
    findByUserId: async () => {
      findByUserIdCalls += 1;
      // Info: (20260813 - Julian) 第一次是流程開頭的查詢，第二次是條件式更新失敗後的重讀
      return findByUserIdCalls === 1
        ? (stubs.linkedByUserId ?? null)
        : (stubs.afterRace ?? null);
    },
    findByAccountBookAndEmails: async () => stubs.candidates ?? [],
    linkUser: async () => stubs.linkSucceeds ?? true,
  };

  const identities: IUserIdentityRepository = {
    findByUserId: async () => stubs.identities ?? [makeIdentity()],
    findByProviderUserId: async () => null,
    create: async () => makeIdentity(),
    touchLogin: async () => makeIdentity(),
    deleteByUserAndProvider: async () => 0,
  };

  return new AttendanceIdentityService(employees, identities);
};

const expectApiCode = async (
  promise: Promise<unknown>,
  code: string,
): Promise<void> => {
  await expect(promise).rejects.toThrow(AppError);
  await promise.catch((error: unknown) => {
    expect((error as AppError).apiCode).toBe(code);
  });
};

describe("AttendanceIdentityService.resolveEmployee", () => {
  it("should return the already linked employee without touching e-mail matching", async () => {
    const linked = makeEmployee({ userId: user.id });
    const service = buildService({ linkedByUserId: linked, candidates: [] });

    await expect(service.resolveEmployee(user, ACCOUNT_BOOK_ID)).resolves.toBe(
      linked,
    );
  });

  it("should link on first login when a verified e-mail matches exactly one employee", async () => {
    const service = buildService({ candidates: [makeEmployee()] });

    const result = await service.resolveEmployee(user, ACCOUNT_BOOK_ID);

    expect(result.id).toBe("emp-5");
    expect(result.userId).toBe(user.id);
  });

  /**
   * Info: (20260813 - Julian) 未驗證的信箱是使用者在 provider 端自行填寫的字串。
   * 採信它等於讓任何人宣稱自己是任何員工。
   */
  it("should ignore unverified e-mail addresses", async () => {
    const service = buildService({
      identities: [makeIdentity({ emailVerified: false })],
      candidates: [],
    });

    await expectApiCode(
      service.resolveEmployee(user, ACCOUNT_BOOK_ID),
      API_ERRORS.NF_EMPLOYEE_FOR_USER.code,
    );
  });

  it("should report not found when no employee carries that company e-mail", async () => {
    const service = buildService({ candidates: [] });

    await expectApiCode(
      service.resolveEmployee(user, ACCOUNT_BOOK_ID),
      API_ERRORS.NF_EMPLOYEE_FOR_USER.code,
    );
  });

  /**
   * Info: (20260813 - Julian) 別的帳本的員工也回 404 而不是 403。
   *
   * 回「你是員工但不屬於這個帳本」會洩漏一個不該由未授權者得知的事實：
   * 這個信箱在系統裡有員工檔。從呼叫端的視角，這個帳本裡就是沒有他。
   */
  it("should not reveal that the user is an employee of another account book", async () => {
    const service = buildService({
      linkedByUserId: makeEmployee({
        userId: user.id,
        accountBookId: "another-book",
      }),
    });

    await expectApiCode(
      service.resolveEmployee(user, ACCOUNT_BOOK_ID),
      API_ERRORS.NF_EMPLOYEE_FOR_USER.code,
    );
  });

  it("should refuse when the matched employee is already linked to somebody else", async () => {
    const service = buildService({
      candidates: [makeEmployee({ userId: "another-user" })],
    });

    await expectApiCode(
      service.resolveEmployee(user, ACCOUNT_BOOK_ID),
      API_ERRORS.CF_EMPLOYEE_ALREADY_LINKED.code,
    );
  });

  /**
   * Info: (20260813 - Julian) 只差大小寫的兩筆員工檔 —— 拒絕，不挑一筆。
   * 任選一筆綁定就是讓某人以另一個人的身分打卡。
   */
  it("should refuse to guess when two employees differ only by e-mail case", async () => {
    const service = buildService({
      candidates: [
        makeEmployee({ id: "emp-5", email: "site.chief@example.com" }),
        makeEmployee({ id: "emp-9", email: "Site.Chief@example.com" }),
      ],
    });

    await expectApiCode(
      service.resolveEmployee(user, ACCOUNT_BOOK_ID),
      API_ERRORS.CF_EMPLOYEE_EMAIL_AMBIGUOUS.code,
    );
  });

  /**
   * Info: (20260813 - Julian) 併發首登：同一人開兩個分頁。
   * 條件式更新只會有一邊成功，後到的那邊重讀後拿到同一筆，不該把錯誤丟給使用者。
   */
  it("should resolve the race when the same user linked from another tab", async () => {
    const winner = makeEmployee({ userId: user.id });
    const service = buildService({
      candidates: [makeEmployee()],
      linkSucceeds: false,
      afterRace: winner,
    });

    await expect(service.resolveEmployee(user, ACCOUNT_BOOK_ID)).resolves.toBe(
      winner,
    );
  });

  // Info: (20260813 - Julian) 同一個競態，但搶走的是別人 —— 那就是真的衝突
  it("should report a conflict when another account won the race", async () => {
    const service = buildService({
      candidates: [makeEmployee()],
      linkSucceeds: false,
      afterRace: null,
    });

    await expectApiCode(
      service.resolveEmployee(user, ACCOUNT_BOOK_ID),
      API_ERRORS.CF_EMPLOYEE_ALREADY_LINKED.code,
    );
  });
});
