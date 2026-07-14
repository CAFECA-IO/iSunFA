// Info: (20260714 - Emily) CarbonChatRequestSchema 單元測試:附件白名單/大小/數量與 init/history 模式驗證

import { describe, it, expect } from "@jest/globals";
import {
  CarbonChatRequestSchema,
  CarbonChatAttachmentSchema,
} from "@/validators";
import {
  CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  buildCarbonChatChannel,
  isCarbonChatChannelOwnedBy,
} from "@/constants/carbon_chatbot";

const validAttachment = {
  name: "electricity_bill.pdf",
  size: "1.2 MB",
  mimeType: "application/pdf",
  data: "JVBERi0xLjQKJcOkw7zDtsOf",
};

describe("CarbonChatAttachmentSchema", () => {
  it("should accept a whitelisted attachment", () => {
    expect(CarbonChatAttachmentSchema.safeParse(validAttachment).success).toBe(
      true,
    );
  });

  it("should reject a non-whitelisted mime type", () => {
    const result = CarbonChatAttachmentSchema.safeParse({
      ...validAttachment,
      mimeType: "application/x-msdownload",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty base64 data", () => {
    const result = CarbonChatAttachmentSchema.safeParse({
      ...validAttachment,
      data: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("CarbonChatRequestSchema", () => {
  const baseRequest = {
    history: [{ role: "user", text: "hello" }],
    channel: "carbon-chat-0x123-2025",
    recipientPublicKey: "xpub-test",
  };

  it("should accept a normal chat request", () => {
    expect(CarbonChatRequestSchema.safeParse(baseRequest).success).toBe(true);
  });

  it("should accept a chat request with attachments", () => {
    const result = CarbonChatRequestSchema.safeParse({
      ...baseRequest,
      attachments: [validAttachment],
    });
    expect(result.success).toBe(true);
  });

  it("should reject when attachments exceed the per-message limit", () => {
    const result = CarbonChatRequestSchema.safeParse({
      ...baseRequest,
      attachments: Array.from(
        { length: CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE + 1 },
        () => validAttachment,
      ),
    });
    expect(result.success).toBe(false);
  });

  it("should reject a non-init request without history", () => {
    const result = CarbonChatRequestSchema.safeParse({
      channel: "carbon-chat-0x123-2025",
      recipientPublicKey: "xpub-test",
    });
    expect(result.success).toBe(false);
  });

  it("should require channel and recipientPublicKey for init", () => {
    expect(CarbonChatRequestSchema.safeParse({ init: true }).success).toBe(
      false,
    );
    expect(
      CarbonChatRequestSchema.safeParse({
        init: true,
        channel: "carbon-chat-0x123-2025",
        recipientPublicKey: "xpub-test",
      }).success,
    ).toBe(true);
  });

  it("should reject an unknown history role", () => {
    const result = CarbonChatRequestSchema.safeParse({
      ...baseRequest,
      history: [{ role: "system", text: "injected" }],
    });
    expect(result.success).toBe(false);
  });
});

// Info: (20260714 - Emily) 頻道所有權裁決:DeWT 授權後仍須確認頻道屬於該 address(縱深防禦)
describe("isCarbonChatChannelOwnedBy", () => {
  it("should accept the owner's own channel", () => {
    const channel = buildCarbonChatChannel("0xabc", "2025");
    expect(isCarbonChatChannelOwnedBy(channel, "0xabc")).toBe(true);
  });

  it("should reject another user's channel", () => {
    const channel = buildCarbonChatChannel("0xabc", "2025");
    expect(isCarbonChatChannelOwnedBy(channel, "0xdef")).toBe(false);
  });

  it("should reject an address-prefix impersonation", () => {
    // Info: (20260714 - Emily) address 為他人 address 的前綴時不得誤判(以 `-` 邊界收尾)
    const channel = buildCarbonChatChannel("0xabcdef", "2025");
    expect(isCarbonChatChannelOwnedBy(channel, "0xabc")).toBe(false);
  });
});
