// Info: (20260716 - Tzuhan) #52 碳盤查存取裁決測試:個人/帳本雙軌 × 角色 × 讀寫層級矩陣
// Info: (20260717 - Tzuhan) 重要:next/jest(SWC)只 hoist「全域 jest」的 jest.mock 呼叫;
// Info: (20260717 - Tzuhan) 若 jest 是 @jest/globals 的 import 綁定,mock 不會被 hoist → 真實 repository/prisma
// Info: (20260717 - Tzuhan) 先被載入(pg Pool 開啟導致 worker 無法退出、mockReset 不存在)。
// Info: (20260717 - Tzuhan) 故比照 allocation_engine.test.ts:declare 全域 jest,只 import 型別。

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { chatroomRepo } from "@/repositories/chatroom.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import {
  resolveCarbonAccess,
  canBindAccountBook,
  CarbonAccessLevelEnum,
} from "@/services/carbon_access.guard";

jest.mock("@/repositories/chatroom.repo", () => ({
  chatroomRepo: { findAccountBookIdByChannel: jest.fn() },
}));
jest.mock("@/repositories/account_book.repo", () => ({
  accountBookRepo: { getMemberRoleByAddress: jest.fn() },
}));

// Info: (20260716 - Tzuhan) mock 取用(型別化,不使用 any)
const mockFindAccountBookId =
  chatroomRepo.findAccountBookIdByChannel as unknown as ReturnType<
    typeof jest.fn<() => Promise<string | null>>
  >;
const mockGetRole =
  accountBookRepo.getMemberRoleByAddress as unknown as ReturnType<
    typeof jest.fn<() => Promise<string | null>>
  >;

const OWNER_ADDRESS = "0xaaa";
const OWN_CHANNEL = `carbon-chat-${OWNER_ADDRESS}-s1`;
const OTHERS_CHANNEL = "carbon-chat-0xbbb-s9";

describe("resolveCarbonAccess", () => {
  beforeEach(() => {
    mockFindAccountBookId.mockReset();
    mockGetRole.mockReset();
  });

  it("personal session: only the channel owner has access", async () => {
    mockFindAccountBookId.mockResolvedValue(null);

    const own = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OWN_CHANNEL,
      CarbonAccessLevelEnum.EDIT,
    );
    expect(own).toEqual({ allowed: true, canEdit: true, accountBookId: null });

    const other = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OTHERS_CHANNEL,
      CarbonAccessLevelEnum.VIEW,
    );
    expect(other.allowed).toBe(false);
  });

  it("nonexistent chatroom falls back to prefix ownership (first save path)", async () => {
    mockFindAccountBookId.mockResolvedValue(null);
    const own = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OWN_CHANNEL,
      CarbonAccessLevelEnum.EDIT,
    );
    expect(own.allowed).toBe(true);
  });

  it("book session: VIEWER can view but not edit; EDITOR+ can edit; non-member denied", async () => {
    mockFindAccountBookId.mockResolvedValue("book-1");

    mockGetRole.mockResolvedValue("VIEWER");
    const viewerView = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OTHERS_CHANNEL,
      CarbonAccessLevelEnum.VIEW,
    );
    expect(viewerView).toEqual({
      allowed: true,
      canEdit: false,
      accountBookId: "book-1",
    });
    const viewerEdit = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OTHERS_CHANNEL,
      CarbonAccessLevelEnum.EDIT,
    );
    expect(viewerEdit.allowed).toBe(false);

    // Info: (20260819 - Luphia) EDITOR / OWNER 皆可編輯（團隊 ADMIN 已取消）
    await ["EDITOR", "OWNER"].reduce(async (previous, role) => {
      await previous;
      mockGetRole.mockResolvedValue(role);
      const decision = await resolveCarbonAccess(
        OWNER_ADDRESS,
        OTHERS_CHANNEL,
        CarbonAccessLevelEnum.EDIT,
      );
      expect(decision).toEqual({
        allowed: true,
        canEdit: true,
        accountBookId: "book-1",
      });
    }, Promise.resolve());

    mockGetRole.mockResolvedValue(null);
    const outsider = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OTHERS_CHANNEL,
      CarbonAccessLevelEnum.VIEW,
    );
    expect(outsider.allowed).toBe(false);
  });

  it("book session: channel owner always has full access regardless of role lookup", async () => {
    mockFindAccountBookId.mockResolvedValue("book-1");
    const own = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OWN_CHANNEL,
      CarbonAccessLevelEnum.EDIT,
    );
    expect(own).toEqual({
      allowed: true,
      canEdit: true,
      accountBookId: "book-1",
    });
    expect(mockGetRole).not.toHaveBeenCalled();
  });
});

/**
 * Info: (20260819 - Luphia) 封存權（DELETE）的角色清單（review #6685 中-4）。
 *
 * `DELETE_CAPABLE_ROLES` 由 `["OWNER","ADMIN"]` 改為 `["OWNER"]`，而本檔原本
 * **沒有任何 `CarbonAccessLevelEnum.DELETE` 的案例**——只測 VIEW / EDIT 與
 * `canBindAccountBook`。因此把清單改成 `["OWNER","EDITOR"]` 也會全綠，
 * 而那意味著每個 EDITOR（含被降級的前 ADMIN）都能封存**別人建立**的碳盤查會話，
 * 把整份報告連活動數據帳本從清單收掉。
 *
 * 這一組同時釘住兩件事：誰能封存、以及**會話擁有者自己一定收得掉**
 * （那條直通在 role 檢查之前，改動 DELETE 清單時很容易一起弄壞）。
 */
describe("resolveCarbonAccess：封存權（DELETE）", () => {
  beforeEach(() => {
    mockFindAccountBookId.mockResolvedValue("book-1");
  });

  it("OWNER 可以封存別人建立的會話", async () => {
    mockGetRole.mockResolvedValue("OWNER");

    const decision = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OTHERS_CHANNEL,
      CarbonAccessLevelEnum.DELETE,
    );

    expect(decision.allowed).toBe(true);
  });

  /**
   * Info: (20260819 - Luphia) EDITOR **不得**封存別人的會話。
   * 這是本組最重要的一條：它是 `DELETE_CAPABLE_ROLES` 的實際邊界，
   * 而先前沒有任何測試釘住它。
   */
  it.each(["EDITOR", "VIEWER", "ADMIN"])(
    "%s 不得封存別人建立的會話",
    async (role) => {
      mockGetRole.mockResolvedValue(role);

      const decision = await resolveCarbonAccess(
        OWNER_ADDRESS,
        OTHERS_CHANNEL,
        CarbonAccessLevelEnum.DELETE,
      );

      expect(decision.allowed).toBe(false);
    },
  );

  // Info: (20260819 - Luphia) 自己建的會話自己收得掉（role 檢查之前的直通路徑）
  it("會話擁有者不受角色限制，收得掉自己建的", async () => {
    mockGetRole.mockResolvedValue("VIEWER");

    const decision = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OWN_CHANNEL,
      CarbonAccessLevelEnum.DELETE,
    );

    expect(decision.allowed).toBe(true);
  });
});

describe("canBindAccountBook", () => {
  beforeEach(() => {
    mockGetRole.mockReset();
  });

  it("requires EDITOR or above", async () => {
    mockGetRole.mockResolvedValue("VIEWER");
    expect(await canBindAccountBook(OWNER_ADDRESS, "book-1")).toBe(false);
    mockGetRole.mockResolvedValue("EDITOR");
    expect(await canBindAccountBook(OWNER_ADDRESS, "book-1")).toBe(true);
    mockGetRole.mockResolvedValue(null);
    expect(await canBindAccountBook(OWNER_ADDRESS, "book-1")).toBe(false);
  });
});
