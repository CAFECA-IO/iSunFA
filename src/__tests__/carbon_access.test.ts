// Info: (20260716 - Tzuhan) #52 碳盤查存取裁決測試:個人/帳本雙軌 × 角色 × 讀寫層級矩陣
// Info: (20260716 - Tzuhan) jest.mock 由 jest 自動 hoist 至 import 前,故 import 可正常置頂(不需關閉 lint 規則)

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { accountBookRepo } from "@/repositories/account_book.repo";
import {
  resolveCarbonAccess,
  canBindAccountBook,
  CarbonAccessLevelEnum,
} from "@/lib/carbon_access";

jest.mock("@/lib/prisma", () => ({
  prisma: { chatroom: { findUnique: jest.fn() } },
}));
jest.mock("@/repositories/account_book.repo", () => ({
  accountBookRepo: { getMemberRoleByAddress: jest.fn() },
}));

// Info: (20260716 - Tzuhan) mock 取用(型別化,不使用 any)
const mockFindUnique = prisma.chatroom.findUnique as unknown as jest.Mock<
  () => Promise<{ accountBookId: string | null } | null>
>;
const mockGetRole = accountBookRepo.getMemberRoleByAddress as unknown as jest.Mock<
  () => Promise<string | null>
>;

const OWNER_ADDRESS = "0xaaa";
const OWN_CHANNEL = `carbon-chat-${OWNER_ADDRESS}-s1`;
const OTHERS_CHANNEL = "carbon-chat-0xbbb-s9";

describe("resolveCarbonAccess", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockGetRole.mockReset();
  });

  it("personal session: only the channel owner has access", async () => {
    mockFindUnique.mockResolvedValue({ accountBookId: null });

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
    mockFindUnique.mockResolvedValue(null);
    const own = await resolveCarbonAccess(
      OWNER_ADDRESS,
      OWN_CHANNEL,
      CarbonAccessLevelEnum.EDIT,
    );
    expect(own.allowed).toBe(true);
  });

  it("book session: VIEWER can view but not edit; EDITOR+ can edit; non-member denied", async () => {
    mockFindUnique.mockResolvedValue({ accountBookId: "book-1" });

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

    // Info: (20260716 - Tzuhan) EDITOR/ADMIN/OWNER 皆可編輯
    await ["EDITOR", "ADMIN", "OWNER"].reduce(async (previous, role) => {
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
    mockFindUnique.mockResolvedValue({ accountBookId: "book-1" });
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
