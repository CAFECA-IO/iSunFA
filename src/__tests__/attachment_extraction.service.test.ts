// Info: (20260714 - Emily) AttachmentExtractionService 單元測試:mock ChatService/ParagraphDraftService/StorageService,
// Info: (20260714 - Emily) 驗證白名單過濾、graceful fallback(取回失敗/大檔/缺 cid)、段落數上限與單段失敗跳過

import { describe, it, expect, jest } from "@jest/globals";
import { AttachmentExtractionService } from "@/services/attachment_extraction.service";
import { ChatService } from "@/services/chat.service";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import { StorageService } from "@/services/storage.service";
import {
  CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
  CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS,
  CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES,
} from "@/constants/carbon_chatbot";
import { IParagraphDraft } from "@/interfaces/carbon_paragraph_draft";

const buildMockStorage = (result: Buffer | Error): StorageService => {
  const recoverLaria = jest.fn<() => Promise<Buffer>>();
  if (result instanceof Error) {
    recoverLaria.mockRejectedValue(result);
  } else {
    recoverLaria.mockResolvedValue(result);
  }
  return { recoverLaria } as unknown as StorageService;
};

const buildMockChatService = (responses: (string | Error)[]): ChatService => {
  const generateRawWithImages = jest.fn<() => Promise<string>>();
  responses.forEach((res) => {
    if (res instanceof Error) {
      generateRawWithImages.mockRejectedValueOnce(res);
    } else {
      generateRawWithImages.mockResolvedValueOnce(res);
    }
  });
  return { generateRawWithImages } as unknown as ChatService;
};

const buildMockDraftService = (
  failForIds: string[] = [],
): ParagraphDraftService => {
  const generateParagraphDraft = jest.fn(
    async (input: { paragraphId: string }): Promise<IParagraphDraft> => {
      if (failForIds.includes(input.paragraphId)) {
        throw new Error("draft failed");
      }
      return {
        paragraphId: input.paragraphId,
        code: input.paragraphId,
        title: `title-${input.paragraphId}`,
        content: `content-${input.paragraphId}`,
        citedFacts: [],
      };
    },
  );
  return { generateParagraphDraft } as unknown as ParagraphDraftService;
};

const attachment = {
  name: "bill.pdf",
  size: "1.0 MB",
  mimeType: "application/pdf",
  cid: "cid-metadata-hash",
};

const smallBuffer = Buffer.from("fake-pdf-bytes");

const extractionResponse = (ids: string[], confidence = "high") =>
  JSON.stringify({
    facts: [{ label: "外購電力", value: "1,200,000 度" }],
    suggestedParagraphIds: ids,
    confidence,
  });

describe("AttachmentExtractionService", () => {
  it("should generate drafts for whitelisted suggested paragraphs", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([extractionResponse(["ch3-2", "ch2-2"])]),
      buildMockDraftService(),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(false);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      "ch3-2",
      "ch2-2",
    ]);
    expect(result.facts[0].source).toBe("bill.pdf");
  });

  it("should filter out fabricated paragraph ids and fall back when none remain", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([extractionResponse(["ch99-9", "made-up"])]),
      buildMockDraftService(),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
    ]);
  });

  it("should degrade to filename facts when extraction throws", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([new Error("Gemini unavailable")]),
      buildMockDraftService(),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
    ]);
    expect(result.facts).toEqual([
      { label: "上傳檔案", value: "bill.pdf", source: "bill.pdf" },
    ]);
  });

  it("should mark degraded on low confidence and use the fallback paragraph", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([extractionResponse(["ch3-2"], "low")]),
      buildMockDraftService(),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
    ]);
  });

  it("should cap generated paragraphs at the pipeline maximum", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([
        extractionResponse(["ch1-1", "ch1-2", "ch1-3", "ch1-4", "ch1-5"]),
      ]),
      buildMockDraftService(),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.drafts).toHaveLength(
      CARBON_ATTACHMENT_PIPELINE_MAX_PARAGRAPHS,
    );
  });

  it("should skip a failing draft, keep the rest, and mark degraded", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([extractionResponse(["ch3-2", "ch2-2"])]),
      buildMockDraftService(["ch3-2"]),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual(["ch2-2"]);
  });

  it("should degrade when laria recovery fails", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([]),
      buildMockDraftService(),
      buildMockStorage(new Error("storage unreachable")),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
    ]);
  });

  it("should degrade oversized files without calling extraction", async () => {
    const oversized = Buffer.alloc(CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES + 1);
    const chatService = buildMockChatService([]);
    const service = new AttachmentExtractionService(
      chatService,
      buildMockDraftService(),
      buildMockStorage(oversized),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [attachment],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(chatService.generateRawWithImages).not.toHaveBeenCalled();
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
    ]);
  });

  it("should degrade attachments without a cid", async () => {
    const service = new AttachmentExtractionService(
      buildMockChatService([]),
      buildMockDraftService(),
      buildMockStorage(smallBuffer),
    );

    const result = await service.runAttachmentToParagraphPipeline({
      attachments: [{ ...attachment, cid: undefined }],
      conversationContext: [],
    });

    expect(result.degraded).toBe(true);
    expect(result.drafts.map((d) => d.paragraphId)).toEqual([
      CARBON_ATTACHMENT_FALLBACK_PARAGRAPH_ID,
    ]);
  });
});
