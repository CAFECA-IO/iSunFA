// Info: (20260907 - Emily) 附件 cid 的歸屬裁決(#6748;一次收 #6625 / #6613)。
//
// Info: (20260907 - Emily) 比照 carbon_import_channel_guard.test.ts:declare 全域 jest、只 import 型別,
// Info: (20260907 - Emily) 讓 next/jest 把 jest.mock 提升到 import 之前(否則真的 repository → prisma 先被載入)。

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

import { NextRequest } from "next/server";
import { POST as importRoute } from "@/app/api/v1/chat/carbon/import/route";
import { POST as chatRoute } from "@/app/api/v1/chat/carbon/route";
import { carbonAttachmentOwnerRepo } from "@/repositories/carbon_attachment_owner.repo";
import { storageService } from "@/services/storage.service";
import { chatroomService } from "@/services/chatroom.service";
import { canReadAttachmentCid } from "@/services/carbon_access.guard";
import { AttachmentSecurityService } from "@/services/attachment_security.service";
import { buildCarbonChatChannel } from "@/constants/carbon_chatbot";
import { VirusScanStatusEnum } from "@/lib/virus_scanner";
import type { IVirusScanner } from "@/lib/virus_scanner";
import type { StorageService } from "@/services/storage.service";

/**
 * Info: (20260907 - Emily) 為什麼呼叫真的 route handler。
 *
 * 缺陷的形狀是「讀取端拿使用者送來的 cid 直接 recoverLaria」——
 * 掃源碢驗不出「呼叫了裁決但沒有 return」。所以匯入兩個真的 handler,
 * 裁決用真的(`carbon_access.guard` 不 mock),mock 落在裁決之外的外部世界:
 * 擁有者 repository(碰 DB)、Laria 儲存、聊天室服務、LLM 與計費。
 *
 * 判準:被擋回 AU000005 **且 recoverLaria 沒被呼叫**;放行則 recoverLaria 被呼叫
 * (之後流程走到哪不是這裡的事)。把 guard 整段刪掉時「被擋」那幾條會變成
 * recoverLaria 被呼叫而紅。
 */
jest.mock("@/repositories/carbon_attachment_owner.repo", () => ({
  carbonAttachmentOwnerRepo: {
    findOwnerAddress: jest.fn(),
    recordOwner: jest.fn(),
  },
}));
jest.mock("@/repositories/chatroom.repo", () => ({
  chatroomRepo: {
    findAccountBookIdByChannel: jest.fn(async () => null),
  },
}));
jest.mock("@/repositories/account_book.repo", () => ({
  accountBookRepo: { getMemberRoleByAddress: jest.fn(async () => null) },
}));
jest.mock("@/lib/auth/dewt", () => ({
  getIdentityFromDeWT: jest.fn(async () => ({
    id: "user-1",
    address: "0xAAA",
  })),
}));
jest.mock("@/services/report_import.service", () => ({
  ReportImportService: jest.fn(() => ({
    resolveSource: jest.fn(async () => null),
  })),
}));
jest.mock("@/services/storage.service", () => ({
  storageService: {
    recoverLaria: jest.fn(async () => Buffer.from("%PDF-1.4")),
    uploadLaria: jest.fn(async () => "cid-new"),
  },
  StorageService: class StorageService {},
}));
jest.mock("@/services/carbon_billing.service", () => ({
  /*
   * Info: (20260907 - Emily) 放行那條會一路走到 LLM 回覆的解構;給一個最小合法形狀,
   * 讓「通過裁決」與「後面流程掛掉」分得開 —— 這裡要驗的只有前者。
   */
  runBilledCarbonTask: jest.fn(async ({ run }: { run: () => unknown }) => ({
    result: (await run()) ?? {
      reply: "",
      readyParagraphId: null,
      extraction: null,
      revisionParagraphId: null,
      chartRequest: null,
    },
  })),
}));
jest.mock("@/services/chatroom.service", () => ({
  chatroomService: {
    recordUserMessage: jest.fn(async () => undefined),
    recordAndPublishAiReply: jest.fn(async () => ({})),
  },
}));
jest.mock("@/services/chat.service", () => ({
  ChatService: jest.fn(() => ({
    generateCarbonChatbotGreeting: jest.fn(async () => "hi"),
    generateCarbonChatbotStructuredResponse: jest.fn(async () => ({
      reply: "",
      readyParagraphId: null,
      extraction: null,
      revisionParagraphId: null,
      chartRequest: null,
    })),
  })),
  isLlmQuotaError: () => false,
  isLlmTimeoutError: () => false,
}));
jest.mock("@/services/paragraph_draft.service", () => ({
  ParagraphDraftService: jest.fn(() => ({})),
  isDraftQuantityGateError: () => false,
}));
jest.mock("@/services/attachment_extraction.service", () => ({
  AttachmentExtractionService: jest.fn(() => ({
    runAttachmentToParagraphPipeline: jest.fn(async () => ({
      drafts: [],
      facts: [],
    })),
  })),
}));

const mockFindOwner =
  carbonAttachmentOwnerRepo.findOwnerAddress as unknown as ReturnType<
    typeof jest.fn<() => Promise<string | null>>
  >;
const mockRecover = storageService.recoverLaria as unknown as ReturnType<
  typeof jest.fn
>;
const mockRecordUserMessage =
  chatroomService.recordUserMessage as unknown as ReturnType<typeof jest.fn>;

const CALLER = "0xAAA";
const PERMISSION_DENIED = "AU000005";

const callImport = async (cid: string): Promise<{ errorCode: string }> => {
  const form = new FormData();
  form.set("channel", buildCarbonChatChannel(CALLER, "s1"));
  form.set("cid", cid);
  form.set("fileName", "report.pdf");
  form.set("mimeType", "application/pdf");
  const request = new NextRequest(
    "http://localhost/api/v1/chat/carbon/import",
    { method: "POST", body: form, headers: { Authorization: "Bearer test" } },
  );
  const response = await importRoute(request);
  return (await response.json()) as { errorCode: string };
};

const callChat = async (cids: string[]): Promise<{ errorCode: string }> => {
  const request = new NextRequest("http://localhost/api/v1/chat/carbon", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      history: [{ role: "user", text: "請看附件" }],
      currentStep: "activity",
      language: "zh-TW",
      channel: buildCarbonChatChannel(CALLER, "s1"),
      recipientPublicKey: "pk",
      ledgerFacts: [],
      attachments: cids.map((cid, index) => ({
        name: `f${index}.pdf`,
        size: "10",
        mimeType: "application/pdf",
        cid,
      })),
    }),
  });
  const response = await chatRoute(request);
  return (await response.json()) as { errorCode: string };
};

beforeEach(() => {
  mockFindOwner.mockReset();
  mockRecover.mockClear();
  mockRecordUserMessage.mockClear();
});

describe("canReadAttachmentCid:只有上傳者本人", () => {
  it("擁有者相同(大小寫不同也算同一人)→ 可讀", async () => {
    mockFindOwner.mockResolvedValue("0xaaa");
    expect(await canReadAttachmentCid("0xAAA", "cid-1")).toBe(true);
  });

  it("擁有者是別人 → 不可讀", async () => {
    mockFindOwner.mockResolvedValue("0xbbb");
    expect(await canReadAttachmentCid("0xAAA", "cid-1")).toBe(false);
  });

  it("查無擁有者(含上線前的舊 cid)→ 不可讀,不放行", async () => {
    /**
     * Info: (20260907 - Emily) 這一條是「查無即拒絕」那個決定的釘子。
     * 改成放行的話,所有沒有紀錄的 cid 永遠留在門外,這道門對它們等於不存在。
     */
    mockFindOwner.mockResolvedValue(null);
    expect(await canReadAttachmentCid("0xAAA", "cid-1")).toBe(false);
  });
});

describe("/import 的 cid 歸屬(#6748)", () => {
  it("別人的 cid → AU000005,而且 recoverLaria 沒被呼叫(拒絕不需要先讀檔)", async () => {
    mockFindOwner.mockResolvedValue("0xbbb");
    const body = await callImport("cid-of-b");
    expect(body.errorCode).toBe(PERMISSION_DENIED);
    expect(mockRecover).not.toHaveBeenCalled();
  });

  it("查無擁有者的 cid → AU000005(不透露存不存在)", async () => {
    mockFindOwner.mockResolvedValue(null);
    const body = await callImport("cid-unknown");
    expect(body.errorCode).toBe(PERMISSION_DENIED);
    expect(mockRecover).not.toHaveBeenCalled();
  });

  it("自己的 cid → 通過裁決,流程走到 recoverLaria", async () => {
    mockFindOwner.mockResolvedValue("0xaaa");
    const body = await callImport("cid-mine");
    expect(body.errorCode).not.toBe(PERMISSION_DENIED);
    expect(mockRecover).toHaveBeenCalledWith("cid-mine");
  });
});

describe("聊天附件的 cid 歸屬(#6748,同一個缺口的另一個讀取端)", () => {
  it("任一附件是別人的 cid → 整則 AU000005,且訊息**沒有**入庫", async () => {
    mockFindOwner.mockResolvedValueOnce("0xaaa").mockResolvedValueOnce("0xbbb");
    const body = await callChat(["cid-mine", "cid-of-b"]);
    expect(body.errorCode).toBe(PERMISSION_DENIED);
    expect(mockRecordUserMessage).not.toHaveBeenCalled();
    expect(mockRecover).not.toHaveBeenCalled();
  });

  it("全部是自己的 cid → 通過裁決,訊息入庫", async () => {
    mockFindOwner.mockResolvedValue("0xaaa");
    const body = await callChat(["cid-mine"]);
    expect(body.errorCode).not.toBe(PERMISSION_DENIED);
    expect(mockRecordUserMessage).toHaveBeenCalledTimes(1);
  });
});

describe("上傳成功就記擁有者(沒有這一筆,上傳者自己也讀不回來)", () => {
  it("processUpload 在 uploadLaria 之後、記用量之前呼叫 recordOwner", async () => {
    const calls: string[] = [];
    const scanner: IVirusScanner = {
      scan: async () => ({ status: VirusScanStatusEnum.CLEAN }),
    };
    const storage = {
      uploadLaria: async () => {
        calls.push("upload");
        return "cid-new";
      },
    } as unknown as StorageService;
    const usageRepo = {
      getUsedBytes: async () => BigInt(0),
      addUsedBytes: async () => {
        calls.push("usage");
      },
    };
    const ownerRepo = {
      recordOwner: async (cid: string, address: string) => {
        calls.push(`owner:${cid}:${address}`);
      },
      findOwnerAddress: async () => null,
    };
    const service = new AttachmentSecurityService({
      scanner,
      storage,
      usageRepo,
      ownerRepo,
    });
    const file = new File([Buffer.from("%PDF-1.4 x")], "a.pdf", {
      type: "application/pdf",
    });
    const result = await service.processUpload({ address: "0xAAA", file });
    expect(result.cid).toBe("cid-new");
    expect(calls).toEqual(["upload", "owner:cid-new:0xAAA", "usage"]);
  });
});
