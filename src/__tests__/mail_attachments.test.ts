import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";

declare const jest: typeof JestType;

/**
 * Info: (20260902 - Julian) `sendMail` 的附件路徑。
 *
 * 這支服務原本只寄一種信（團隊邀請，無附件）。薪資單是第二個消費者，
 * 而它帶著一份 PDF —— 要釘死的是三件事，每一件失敗時都**不會有人發現**：
 *
 * 1. 附件原樣交給 transporter：少一個欄位就是收件人拿到一封沒有薪資單的信，
 *    而流程回報「寄送成功」
 * 2. 沒有附件時整個欄位不送出：nodemailer 對 `[]` 與 `undefined` 的處理不同，
 *    前者會把單一 part 的信改組成 multipart/mixed —— 團隊邀請信的長相
 *    不該因為別人加了附件支援而改變
 * 3. log 不記檔名：薪資單的檔名帶著員工姓名與月份，寫進 log 等於把
 *    「誰在幾月領了薪水」留在一個讀取權限遠寬於資料庫的地方
 */

jest.mock("nodemailer", () => {
  /**
   * Info: (20260902 - Julian) mock 工廠內部自建把手。
   *
   * 不引用外層變數：import 會被提升到 const 宣告之前，
   * 而工廠在 mail.service 被 require 的當下就執行 —— 那時外層的 const 還在 TDZ。
   */
  const transportSendMail = jest.fn(async () => ({ messageId: "test" }));
  return {
    __esModule: true,
    default: {
      createTransport: jest.fn(() => ({ sendMail: transportSendMail })),
      __transportSendMail: transportSendMail,
    },
  };
});

jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: {
    get: jest.fn(async (key: string) =>
      key.includes("PORT") ? "587" : `configured-${key}`,
    ),
  },
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import nodemailer from "nodemailer";
import { sendMail, type IMailAttachment } from "@/services/mail.service";
import { logger } from "@/lib/utils/logger";

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const transportSendMail = asMock(
  (nodemailer as unknown as { __transportSendMail: unknown })
    .__transportSendMail,
);

const PAY_SLIP: IMailAttachment = {
  filename: "payslip_2026-09_E001_王小明.pdf",
  content: Buffer.from("%PDF-1.4 fake"),
  contentType: "application/pdf",
};

const BASE_MESSAGE = {
  to: "employee@example.com",
  subject: "2026 年 9 月薪資單",
  html: "<p>您的薪資單</p>",
  text: "您的薪資單",
};

const lastPayload = (): Record<string, unknown> =>
  transportSendMail.mock.calls[0][0] as Record<string, unknown>;

beforeEach(() => {
  transportSendMail.mockClear();
  asMock(logger.info).mockClear();
});

describe("sendMail — 有附件", () => {
  it("把附件陣列原樣交給 transporter", async () => {
    await sendMail({ ...BASE_MESSAGE, attachments: [PAY_SLIP] });

    expect(transportSendMail).toHaveBeenCalledTimes(1);
    expect(lastPayload().attachments).toEqual([PAY_SLIP]);
  });

  it("三個欄位逐一原樣傳遞，內容仍是同一個 Buffer", async () => {
    await sendMail({ ...BASE_MESSAGE, attachments: [PAY_SLIP] });

    const [attachment] = lastPayload().attachments as IMailAttachment[];
    expect(attachment.filename).toBe(PAY_SLIP.filename);
    expect(attachment.contentType).toBe("application/pdf");
    /**
     * Info: (20260902 - Julian) 用 `toBe` 比 `toEqual` 嚴格：中間若有人「順手」
     * 把 Buffer 轉成 base64 字串再轉回來，內容相等但已多繞一圈，
     * 而那正是二進位資料被改壞的常見來源。
     */
    expect(attachment.content).toBe(PAY_SLIP.content);
    expect(attachment.content.toString()).toBe("%PDF-1.4 fake");
  });

  it("多個附件全數送出，不只送第一個", async () => {
    const second: IMailAttachment = {
      filename: "payslip_2026-08_E001.pdf",
      content: Buffer.from("second"),
      contentType: "application/pdf",
    };

    await sendMail({ ...BASE_MESSAGE, attachments: [PAY_SLIP, second] });

    expect((lastPayload().attachments as IMailAttachment[]).length).toBe(2);
  });

  it("收件者、主旨與兩種內文照舊送出，加附件不影響既有欄位", async () => {
    await sendMail({ ...BASE_MESSAGE, attachments: [PAY_SLIP] });

    const payload = lastPayload();
    expect(payload.to).toBe(BASE_MESSAGE.to);
    expect(payload.subject).toBe(BASE_MESSAGE.subject);
    expect(payload.text).toBe(BASE_MESSAGE.text);
    expect(payload.html).toBe(BASE_MESSAGE.html);
    expect(payload.from).toBeTruthy();
  });
});

describe("sendMail — 沒有附件時不送出該欄位", () => {
  /**
   * Info: (20260902 - Julian) 用 `in` 而不是比對 undefined。
   *
   * `attachments: undefined` 這個**鍵存在**的物件，與根本沒有這個鍵的物件，
   * 對 `toEqual` 是相等的，對 nodemailer 也大多相同 —— 但這條測試要守的是
   * 「我們沒有多送一個欄位」這件事本身，唯一驗得到的方式是問鍵在不在。
   */
  it("未給 attachments 時，交出去的物件沒有這個鍵", async () => {
    await sendMail(BASE_MESSAGE);

    expect("attachments" in lastPayload()).toBe(false);
  });

  it("給空陣列時，同樣沒有這個鍵", async () => {
    await sendMail({ ...BASE_MESSAGE, attachments: [] });

    expect("attachments" in lastPayload()).toBe(false);
  });

  it("空陣列與未給，交出去的 payload 完全相同", async () => {
    await sendMail(BASE_MESSAGE);
    const withoutKey = lastPayload();
    transportSendMail.mockClear();

    await sendMail({ ...BASE_MESSAGE, attachments: [] });
    const withEmptyArray = lastPayload();

    expect(Object.keys(withEmptyArray).sort()).toEqual(
      Object.keys(withoutKey).sort(),
    );
  });
});

describe("sendMail — log 不洩漏附件內容", () => {
  it("只記收件者、主旨與附件數量", async () => {
    await sendMail({ ...BASE_MESSAGE, attachments: [PAY_SLIP] });

    expect(asMock(logger.info)).toHaveBeenCalledWith("mail sent", {
      to: BASE_MESSAGE.to,
      subject: BASE_MESSAGE.subject,
      attachmentCount: 1,
    });
  });

  /**
   * Info: (20260902 - Julian) 檔名裡有員工姓名。log 的閱讀者是維運，不是人資 ——
   * 而 log 的讀取權限遠寬於資料庫。這條要守的是「連檔名都不記」。
   */
  it("log 內容不含附件檔名，也不含檔案內容", async () => {
    await sendMail({ ...BASE_MESSAGE, attachments: [PAY_SLIP] });

    const logged = JSON.stringify(asMock(logger.info).mock.calls);
    expect(logged).not.toContain("王小明");
    expect(logged).not.toContain(".pdf");
    expect(logged).not.toContain("%PDF");
  });

  it("沒有附件時數量記 0，而不是漏掉這個欄位", async () => {
    await sendMail(BASE_MESSAGE);

    expect(asMock(logger.info)).toHaveBeenCalledWith("mail sent", {
      to: BASE_MESSAGE.to,
      subject: BASE_MESSAGE.subject,
      attachmentCount: 0,
    });
  });
});
