import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import { accountBookRepo } from "@/repositories/account_book.repo";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260909 - Emily) `getMemberRoleByAddress` 的位址形狀（#6783 review 阻-1）。
 *
 * 這一檔存在的理由是一次實跑的 mutation：把那支查詢改回
 * `user: { address: userAddress }`（精確比對），**整套 6208 個測試全綠**。
 *
 * 綠的原因不是沒人用它，而是唯一會踩到這個缺陷的呼叫端
 * （`canReadAttachmentCid` 的同帳本放寬）在它自己的測試裡把整支 repo mock 掉了，
 * 而那個 mock 自己 `address.toLowerCase()` 比對 —— 比真實的 repo 寬鬆。
 * 檢查清單 §1.2 與 §1.8 講的正是這件事：mock 掉某支協作者，就要另有一支測試
 * 直接測那支協作者，而且 mock 不能比被 mock 的東西寬鬆。
 *
 * 缺陷的後果不是壞掉，是**一個功能對一半的使用者不生效**：
 * `CarbonAttachmentOwner.address` 是正規化後的全小寫，而 `User.address` 有小寫與
 * EIP-55 checksum 兩種形狀共存（viem 對合約回傳一律 checksum，`setup.service.ts`
 * 建的使用者是全小寫，見 `address_identity.ts` 檔頭）。精確比對之下，
 * checksum 形狀的擁有者一律查不到 → B 在 A 的待匯入卡上按「接著匯入」拿到 `AU000005`，
 * 而那個失敗長得跟合法拒絕（「A 已不是該帳本成員」）一模一樣。
 *
 * 所以這裡不 mock repo，而是 mock `prisma` —— 斷言的是**交給資料庫的條件**。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    teamMember: {
      findFirst: jest.fn(async () => null),
    },
  },
}));

const findFirst = prisma.teamMember.findFirst as unknown as ReturnType<
  typeof jest.fn<(args: unknown) => Promise<{ role: string } | null>>
>;

// Info: (20260909 - Emily) 真實的 EIP-55 checksum 與它的全小寫寫法，是同一個位址
const CHECKSUM = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
const LOWER = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";
const BOOK = "book-1";

const addressCondition = (): unknown => {
  const args = findFirst.mock.calls[0]?.[0] as
    | { where?: { user?: { address?: unknown } } }
    | undefined;
  return args?.where?.user?.address;
};

/**
 * Info: (20260909 - Emily) 忠實模擬資料庫：`User.address` 以某一種寫法存著一列，
 * 而 Postgres 的 `=` / `IN` 大小寫敏感（schema 沒有 citext）。
 */
const dbWithMemberStoredAs = (storedAddress: string) => {
  findFirst.mockImplementation(async (args: unknown) => {
    const where = args as { where: { user: { address: unknown } } };
    const condition = where.where.user.address;
    const candidates =
      typeof condition === "string"
        ? [condition]
        : ((condition as { in?: string[] }).in ?? []);
    return candidates.includes(storedAddress) ? { role: "EDITOR" } : null;
  });
};

describe("getMemberRoleByAddress:位址的兩種寫法都要查得到(#6783 阻-1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue(null);
  });

  it("兩種寫法都進 `in` 條件(不是精確比對)", async () => {
    await accountBookRepo.getMemberRoleByAddress(BOOK, LOWER);
    expect(addressCondition()).toEqual({ in: [LOWER, CHECKSUM] });
  });

  it("給 checksum 也一樣撈出兩種寫法(哪一種進來都不影響)", async () => {
    await accountBookRepo.getMemberRoleByAddress(BOOK, CHECKSUM);
    expect(addressCondition()).toEqual({ in: [LOWER, CHECKSUM] });
  });

  it("成員的 User.address 存 checksum、以小寫查 → 找得到(這就是阻-1 的場景)", async () => {
    dbWithMemberStoredAs(CHECKSUM);
    expect(await accountBookRepo.getMemberRoleByAddress(BOOK, LOWER)).toBe(
      "EDITOR",
    );
  });

  it("成員的 User.address 存全小寫、以小寫查 → 找得到(原本就成立的那一半)", async () => {
    dbWithMemberStoredAs(LOWER);
    expect(await accountBookRepo.getMemberRoleByAddress(BOOK, LOWER)).toBe(
      "EDITOR",
    );
  });

  it("真的不是成員 → 仍然回 null(放寬的是寫法，不是資格)", async () => {
    dbWithMemberStoredAs("0xdD2FD4581271e230360230F9337D5c0430Bf44C0");
    expect(await accountBookRepo.getMemberRoleByAddress(BOOK, LOWER)).toBe(
      null,
    );
  });

  it("不是合法位址的字串不進 getAddress(它會拋),只查它自己的小寫", async () => {
    /*
     * Info: (20260909 - Emily) 測試與既有程式碼裡有 `0xAAA` 這種假位址，
     * `addressLookupForms` 對它們回單一元素 —— 這條把那個行為釘住，
     * 免得日後有人「順手」在 repo 裡改成無條件 `getAddress()` 而在執行期拋錯。
     */
    await accountBookRepo.getMemberRoleByAddress(BOOK, "0xAAA");
    expect(addressCondition()).toEqual({ in: ["0xaaa"] });
  });

  it("帳本與軟刪除的條件沒有被動到", async () => {
    await accountBookRepo.getMemberRoleByAddress(BOOK, LOWER);
    const args = findFirst.mock.calls[0]?.[0] as {
      where: { team: unknown };
      select: unknown;
    };
    expect(args.where.team).toEqual({
      accountBooks: { some: { id: BOOK, deletedAt: null } },
    });
    expect(args.select).toEqual({ role: true });
  });
});
