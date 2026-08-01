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
