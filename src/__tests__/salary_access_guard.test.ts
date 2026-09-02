import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { TeamRole } from "@/constants/team";
import { SalaryAccess } from "@/constants/salary_access";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { teamRepo } from "@/repositories/team.repo";
import { assertSalaryAccountBookAccess } from "@/services/salary_record.service";

/**
 * Info: (20260901 - Julian) 授權閘的**閘體**：把角色餵給角色矩陣，再把否決轉成 403。
 *
 * ## 為什麼這一支非有不可
 *
 * 這個模組的授權有三塊，先前只守住了兩塊：
 *
 * - `salary_access_roles.test.ts` 驗**那張表**（`SALARY_ACCESS_ROLES` 答得對不對）
 * - `salary_route_wiring.test.ts` 驗**接線**（八支 route 有沒有真的呼叫、要求的層級對不對）
 * - 中間這一段 —— 把 `member.role` 與 `access` 交給那張表的那顆螺絲 —— **沒有任何東西守著**
 *
 * 而它在 `salary_route_wiring.test.ts` 裡被整包 `jest.mock` 掉了，
 * 全 repo 沒有第二處匯入它。實測 mutation：
 *
 * ```diff
 * - if (!isSalaryAccessAllowed(member.role, access)) {
 * + if (!isSalaryAccessAllowed(member.role, SalaryAccess.READ)) {
 * ```
 *
 * ＝ 每支端點都只要求 READ ＝ **`VIEWER` 可以硬刪任何一筆薪資紀錄**，
 * 也就是這次要修掉的缺陷本身。改壞之後
 * `jest salary_route_wiring salary_access_roles salary_record_service`
 * → 70 條全綠。零件對、裝配對，而把零件裝上去的那顆螺絲沒人看
 * （checklist §1.7 與 §1.11 那一對的第三塊）。
 *
 * ## 替身只落在外部世界
 *
 * 只 mock `accountBookRepo` / `teamRepo`（＝資料庫），
 * `resolveAccountBookMembership`、`isSalaryAccessAllowed`、`SALARY_ACCESS_ROLES`
 * 與錯誤轉換全部走真的（checklist §1.8：把 mock 換成真的實作，結論應該一樣）。
 * 於是這一支同時守著兩件真的會壞的事：角色比對用的是不是**傳進來的** `access`，
 * 以及角色不足時丟出來的是不是 403。
 *
 * `declare const jest` 的理由同 `salary_route_wiring.test.ts`：
 * `next/jest`(SWC) 只提升全域 `jest` 的 `jest.mock`。
 */

jest.mock("@/repositories/account_book.repo", () => ({
  accountBookRepo: { getAccountBookById: jest.fn() },
}));
jest.mock("@/repositories/team.repo", () => ({
  teamRepo: { getTeamMember: jest.fn() },
}));

const BOOK_ID = "book-1";
const TEAM_ID = "team-1";
const USER_ID = "user-1";

const getAccountBookMock = accountBookRepo.getAccountBookById as unknown as
  ReturnType<typeof jest.fn<(id: string) => Promise<unknown>>>;
const getTeamMemberMock = teamRepo.getTeamMember as unknown as ReturnType<
  typeof jest.fn<(userId: string, teamId: string) => Promise<unknown>>
>;

const asMember = (role: string) => ({
  id: "member-1",
  userId: USER_ID,
  teamId: TEAM_ID,
  role,
});

beforeEach(() => {
  getAccountBookMock.mockReset();
  getTeamMemberMock.mockReset();
  getAccountBookMock.mockResolvedValue({ id: BOOK_ID, teamId: TEAM_ID });
});

/**
 * Info: (20260901 - Julian) 期望值刻意寫死成一張表，不從 `SALARY_ACCESS_ROLES` 推導。
 *
 * 從那張表推導的話，這一支就會跟著它一起錯 —— 表被改寬時兩邊同時放寬，
 * 而測試照樣全綠（checklist §1.9：判準要能在缺陷發生時分辨成功與失敗）。
 * 「表答得對不對」由 `salary_access_roles.test.ts` 用同樣寫死的方式守。
 */
const MATRIX: ReadonlyArray<{
  role: string;
  access: SalaryAccess;
  allowed: boolean;
}> = [
  { role: TeamRole.OWNER, access: SalaryAccess.READ, allowed: true },
  { role: TeamRole.OWNER, access: SalaryAccess.WRITE, allowed: true },
  { role: TeamRole.EDITOR, access: SalaryAccess.READ, allowed: true },
  { role: TeamRole.EDITOR, access: SalaryAccess.WRITE, allowed: true },
  { role: TeamRole.VIEWER, access: SalaryAccess.READ, allowed: true },
  // Info: (20260901 - Julian) 這一格就是這次要修掉的缺陷：唯讀成員不得寫入
  { role: TeamRole.VIEWER, access: SalaryAccess.WRITE, allowed: false },
  // Info: (20260901 - Julian) 20260819 已停用，資料庫可能還有殘列 —— 表外一律擋
  { role: "ADMIN", access: SalaryAccess.READ, allowed: false },
  { role: "ADMIN", access: SalaryAccess.WRITE, allowed: false },
];

describe("assertSalaryAccountBookAccess 的角色 × 層級矩陣", () => {
  it("矩陣涵蓋四種角色 × 兩種層級，一格不漏", () => {
    expect(MATRIX).toHaveLength(8);
    expect(new Set(MATRIX.map((row) => `${row.role}|${row.access}`)).size).toBe(
      8,
    );
    // Info: (20260901 - Julian) 全 true 或全 false 的矩陣測不出東西
    expect(MATRIX.some((row) => row.allowed)).toBe(true);
    expect(MATRIX.some((row) => !row.allowed)).toBe(true);
  });

  it.each(MATRIX)(
    "$role 要求 $access → allowed=$allowed",
    async ({ role, access, allowed }) => {
      getTeamMemberMock.mockResolvedValue(asMember(role));

      const run = assertSalaryAccountBookAccess(BOOK_ID, USER_ID, access);

      if (allowed) {
        await expect(run).resolves.toBeUndefined();
        return;
      }

      /**
       * Info: (20260901 - Julian) 成對斷言：不只「有丟東西」，丟的必須是 403。
       *
       * 角色不足時丟的是 `AppError`，而外層的 catch 會把裸 `Error` 過一次
       * `mapServiceError()`。少了 `if (error instanceof AppError) throw error;`
       * 那一行，這顆 403 會被再包一層變成 `IS_DB_FAILED`（500）——
       * 使用者看到的是「系統壞了」而不是「你沒有權限」，而兩者都會被擋下來，
       * 所以只斷言 `rejects` 分不出這件事。
       */
      await expect(run).rejects.toBeInstanceOf(AppError);
      await run.catch((error: unknown) => {
        expect((error as AppError).apiCode).toBe(
          API_ERRORS.AUTH_PERMISSION_DENIED.code,
        );
        expect((error as AppError).http).toBe(403);
      });
    },
  );

  /**
   * Info: (20260901 - Julian) 把層級寫死（例如永遠檢查 READ）就會踩到這一條。
   *
   * 上面的矩陣已經涵蓋它，但那八格分散在八個案例裡，紅起來看不出共同原因。
   * 這一條把「同一個人、只換 access，答案必須不同」單獨拉出來 ——
   * 缺陷的形狀是「`access` 這個參數根本沒被用到」，而這是它唯一的症狀。
   */
  it("同一個 VIEWER，只換 access 就換答案（證明 access 真的被用到）", async () => {
    getTeamMemberMock.mockResolvedValue(asMember(TeamRole.VIEWER));

    await expect(
      assertSalaryAccountBookAccess(BOOK_ID, USER_ID, SalaryAccess.READ),
    ).resolves.toBeUndefined();

    await expect(
      assertSalaryAccountBookAccess(BOOK_ID, USER_ID, SalaryAccess.WRITE),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("授權閘先問「進不進得來」，再問「做不做得了」", () => {
  it("帳本不存在 → 404，而且不會去問團隊成員", async () => {
    getAccountBookMock.mockResolvedValue(null);

    await expect(
      assertSalaryAccountBookAccess(BOOK_ID, USER_ID, SalaryAccess.READ),
    ).rejects.toMatchObject({ apiCode: API_ERRORS.NF_ACCOUNT_BOOK.code });

    expect(getTeamMemberMock).not.toHaveBeenCalled();
  });

  it("不是團隊成員 → 403（連角色都沒得問）", async () => {
    getTeamMemberMock.mockResolvedValue(null);

    await expect(
      assertSalaryAccountBookAccess(BOOK_ID, USER_ID, SalaryAccess.READ),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.AUTH_PERMISSION_DENIED.code,
    });
  });

  it("問的是路徑上的帳本與 DeWT 上的使用者，且團隊取自帳本", async () => {
    getTeamMemberMock.mockResolvedValue(asMember(TeamRole.OWNER));

    await assertSalaryAccountBookAccess(BOOK_ID, USER_ID, SalaryAccess.WRITE);

    expect(getAccountBookMock).toHaveBeenCalledWith(BOOK_ID);
    expect(getTeamMemberMock).toHaveBeenCalledWith(USER_ID, TEAM_ID);
  });

  /**
   * Info: (20260901 - Julian) 資料庫壞掉不能變成「放行」，也不能變成 403。
   *
   * `mapServiceError` 對認不得的錯誤回 `IS_DB_FAILED`(500)，
   * 而 500 與 403 在使用者端都是「做不了」—— 分不出來的話，
   * 哪天授權查詢開始間歇性失敗，看到的會是「權限不足」而沒有人去查資料庫。
   */
  it("成員查詢丟例外 → 500，不是靜靜放行", async () => {
    getTeamMemberMock.mockRejectedValue(new Error("connection reset"));

    await expect(
      assertSalaryAccountBookAccess(BOOK_ID, USER_ID, SalaryAccess.WRITE),
    ).rejects.toMatchObject({ apiCode: API_ERRORS.IS_DB_FAILED.code });
  });
});
