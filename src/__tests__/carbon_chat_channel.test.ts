import { describe, it, expect } from "@jest/globals";
import {
  buildCarbonChatChannel,
  isCarbonChatChannelOwnedBy,
  parseCarbonChatChannel,
} from "@/constants/carbon_chatbot";

/**
 * Info: (20260828 - Julian) 頻道字串是**兩支函式共用的一個格式約定**，
 * 而約定沒有型別 —— `buildCarbonChatChannel` 回的是 `string`，
 * `parseCarbonChatChannel` 收的也是 `string`，改壞一邊 `tsc` 不會說話。
 *
 * 這一檔釘的就是那個約定。它現在有第三個消費者（通知的深連結：
 * 從書籤的 `resourceKey` 切出 sessionId），而那個消費者離這裡很遠 ——
 * 格式改了之後最先發現的不會是工程師，是點了通知去到別人會話的使用者。
 */

const ADDRESS = "0xaaaa000000000000000000000000000000000001";

describe("round-trip", () => {
  it.each([
    ["預設會話", "2025"],
    ["帶連字號的會話 id", "5f1c9d3a-7b2e-4c88-9f10-2ab3c4d5e6f7"],
    ["純數字", "17600000000"],
  ])("%s：parse(build()) 回得來", (unusedLabel, sessionId) => {
    expect(
      parseCarbonChatChannel(buildCarbonChatChannel(ADDRESS, sessionId)),
    ).toEqual({ address: ADDRESS, sessionId });
  });

  /**
   * Info: (20260828 - Julian) 帶連字號的 sessionId 是這一檔存在的主要理由。
   *
   * 直覺的寫法是切最後一個 `-`，而它對 `2025` 那種 id 完全正確 ——
   * 所有現成的測試資料都會綠。uuid 形狀的會話 id 一出現才會壞，
   * 那時錯的是三個月前的一行 `lastIndexOf`。
   */
  it("sessionId 含連字號時不會被切碎", () => {
    const sessionId = "a-b-c";
    expect(
      parseCarbonChatChannel(buildCarbonChatChannel(ADDRESS, sessionId)),
    ).toEqual({ address: ADDRESS, sessionId });
  });
});

describe("不是這個格式就回 null（不猜）", () => {
  it.each([
    ["別的前綴", "faith-chat-0xabc-2025"],
    ["只有前綴", "carbon-chat"],
    ["前綴後面空的", "carbon-chat-"],
    ["有位址沒有會話", "carbon-chat-0xabc"],
    ["會話是空字串", "carbon-chat-0xabc-"],
    ["位址是空字串", "carbon-chat--2025"],
    ["空字串", ""],
  ])("%s", (unusedLabel, channel) => {
    expect(parseCarbonChatChannel(channel)).toBeNull();
  });
});

/**
 * Info: (20260828 - Julian) 解析出來的位址要與所有權檢查對得上。
 *
 * 兩支各自實作了「頻道屬於誰」的一半：一支比前綴，一支切欄位。
 * 分岔的形狀是「檢查說是你的、解析說是別人的」，而那是授權漏洞的原料。
 */
it("解析出的位址與所有權檢查一致", () => {
  const channel = buildCarbonChatChannel(ADDRESS, "2025");
  const parsed = parseCarbonChatChannel(channel);

  expect(parsed).not.toBeNull();
  expect(isCarbonChatChannelOwnedBy(channel, parsed?.address ?? "")).toBe(true);
});
