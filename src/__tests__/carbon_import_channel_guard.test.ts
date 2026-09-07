// Info: (20260831 - Emily) `/import` 的 channel 歸屬裁決(#6625 的 A 半)。
//
// Info: (20260831 - Emily) 重要:next/jest(SWC)只 hoist「全域 jest」的 jest.mock 呼叫;
// Info: (20260831 - Emily) 若 jest 是 @jest/globals 的 import 綁定,mock 不會被 hoist
// Info: (20260831 - Emily) → 真實 repository/prisma 先被載入(pg Pool 開啟導致 worker 無法退出)。
// Info: (20260831 - Emily) 故比照 carbon_access.test.ts:declare 全域 jest,只 import 型別。

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { NextRequest } from "next/server";
import { POST as importRoute } from "@/app/api/v1/chat/carbon/import/route";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { buildCarbonChatChannel } from "@/constants/carbon_chatbot";

/**
 * Info: (20260831 - Emily) 為什麼直接呼叫 route handler,而不是掃源碼。
 *
 * 這個缺陷的形狀正是「函式存在、但沒有擋在使用者走的那條路徑上」——
 * `resolveCarbonAccess` 一直都在,碳盤查其他五個端點都用了,只有匯入這條沒接。
 * 掃描測試(`toContain("resolveCarbonAccess")`)擋不住「呼叫了但沒有 return」
 * 這種形狀,所以照 `invite_route_wiring.test.ts` 的先例,匯入真的 handler 來跑。
 *
 * **裁決用真的**(`carbon_access.guard` 不 mock):要證明的是「請求走到這個 handler
 * 時會不會被那個真的裁決擋下」。mock 的邊界落在裁決之外的外部世界 ——
 * 兩個 repository(碰 DB)、儲存與 LLM 服務(碰網路與錢)。
 *
 * 判準取巧但精確:**這三個案例都不帶檔案**。guard 在檔案處理之前,
 * 所以「被擋」回 AU000005、「放行」回 VA000020(缺檔)——
 * 兩者分得開,而且把 guard 整段刪掉時「被擋」那幾條會變成 VA000020 而紅。
 */
jest.mock("@/repositories/chatroom.repo", () => ({
  chatroomRepo: { findAccountBookIdByChannel: jest.fn() },
}));
jest.mock("@/repositories/account_book.repo", () => ({
  accountBookRepo: { getMemberRoleByAddress: jest.fn() },
}));
jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xaaa",
  })),
}));
jest.mock("@/services/report_import.service", () => ({
  ReportImportService: jest.fn(() => ({
    resolveSource: jest.fn(async () => null),
  })),
}));
jest.mock("@/services/storage.service", () => ({
  storageService: { recoverLaria: jest.fn(async () => Buffer.from("")) },
}));
jest.mock("@/services/carbon_billing.service", () => ({
  runBilledCarbonTask: jest.fn(async () => ({ result: null })),
}));

const mockFindAccountBookId =
  chatroomRepo.findAccountBookIdByChannel as unknown as ReturnType<
    typeof jest.fn<() => Promise<string | null>>
  >;
const mockGetRole =
  accountBookRepo.getMemberRoleByAddress as unknown as ReturnType<
    typeof jest.fn<() => Promise<string | null>>
  >;

const CALLER = "0xaaa";
const OWN_CHANNEL = buildCarbonChatChannel(CALLER, "s1");
const OTHERS_CHANNEL = buildCarbonChatChannel("0xbbb", "s9");

const PERMISSION_DENIED = "AU000005";
const NO_FILE = "VA000020";

const callImport = async (channel?: string): Promise<{ errorCode: string }> => {
  const form = new FormData();
  if (channel !== undefined) form.set("channel", channel);
  const request = new NextRequest(
    "http://localhost/api/v1/chat/carbon/import",
    {
      method: "POST",
      body: form,
      headers: { Authorization: "Bearer test" },
    },
  );
  const response = await importRoute(request);
  return (await response.json()) as { errorCode: string };
};

describe("/import 的 channel 歸屬裁決(#6625-A)", () => {
  beforeEach(() => {
    mockFindAccountBookId.mockReset();
    mockGetRole.mockReset();
  });

  it("帶別人的 channel → 拒絕(否則是拿別人的團隊額度付自己的匯入)", async () => {
    mockFindAccountBookId.mockResolvedValue(null);
    const body = await callImport(OTHERS_CHANNEL);
    expect(body.errorCode).toBe(PERMISSION_DENIED);
  });

  it("帶自己的 channel → 放行(流程繼續走到缺檔)", async () => {
    mockFindAccountBookId.mockResolvedValue(null);
    const body = await callImport(OWN_CHANNEL);
    expect(body.errorCode).toBe(NO_FILE);
  });

  /**
   * Info: (20260831 - Emily) 這兩條釘住「用 EDIT 不是 VIEW」——
   * 花掉帳本的額度是寫入行為。只用 VIEW 的話 VIEWER 那條會變成放行。
   */
  it("帳本會話 + 呼叫者是 VIEWER → 拒絕(額度是寫入行為)", async () => {
    mockFindAccountBookId.mockResolvedValue("book-1");
    mockGetRole.mockResolvedValue("VIEWER");
    const body = await callImport(OTHERS_CHANNEL);
    expect(body.errorCode).toBe(PERMISSION_DENIED);
  });

  it("帳本會話 + 呼叫者是 EDITOR → 放行", async () => {
    mockFindAccountBookId.mockResolvedValue("book-1");
    mockGetRole.mockResolvedValue("EDITOR");
    const body = await callImport(OTHERS_CHANNEL);
    expect(body.errorCode).toBe(NO_FILE);
  });

  /**
   * Info: (20260831 - Emily) 沒帶 channel 是合法狀態(無帳本會話 → 個人鏈上點數),
   * 不能被這道 guard 擋掉 —— 擋了就是把「還沒綁帳本的人不能匯入」變成新規則。
   */
  it("沒帶 channel → 不擋(那條路走個人點數,不是缺權限)", async () => {
    const body = await callImport();
    expect(body.errorCode).toBe(NO_FILE);
    expect(mockFindAccountBookId).not.toHaveBeenCalled();
  });
});
