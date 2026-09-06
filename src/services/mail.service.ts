import nodemailer from "nodemailer";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260815 - Luphia) 寄信（規範 §4 / P4：email 邀請）。
 *
 * 設定存於 DB 的簽章式系統設定（ADR 017），可由後台調整、不需重啟。
 *
 * **未設定即明確失敗**，不做「靜靜略過」：邀請信寄不出去而流程照常往下走，
 * 結果是團隊付了一席的錢、受邀者卻永遠收不到信，而系統顯示一切正常。
 * 寧可在建立邀請時就擋下來，讓管理員知道要先設定寄信。
 */

export class MailNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Mail delivery is not configured: missing ${missing.join(", ")}`);
    this.name = "MailNotConfiguredError";
  }
}

/**
 * Info: (20260902 - Julian) 附件。**只開放三個欄位**，不直接露出 nodemailer 的 `Attachment`。
 *
 * 那個型別還收 `path`（從磁碟讀檔）與 `href`（從網址抓）—— 兩者都讓呼叫端可以
 * 用一個字串決定「實際寄出去的是什麼」。這支服務的收件者由別處決定，
 * 內容也應該由別處**產生好**再交進來，不是給它一個位址自己去取。
 */
export interface IMailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface IMailMessage {
  to: string;
  subject: string;
  html: string;
  // Info: (20260815 - Luphia) 純文字備援：不少信箱客戶端與過濾器只讀這一份
  text: string;
  /**
   * Info: (20260902 - Julian) 選填。沒有附件時**不會**出現在交給 nodemailer 的物件裡
   * —— 見 `sendMail` 的說明。
   */
  attachments?: IMailAttachment[];
}

interface IMailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

async function resolveMailConfig(): Promise<IMailConfig> {
  const [host, port, user, password, from] = await Promise.all([
    systemSettingService.get(SystemSettingKey.SMTP_HOST),
    systemSettingService.get(SystemSettingKey.SMTP_PORT),
    systemSettingService.get(SystemSettingKey.SMTP_USER),
    systemSettingService.get(SystemSettingKey.SMTP_PASSWORD),
    systemSettingService.get(SystemSettingKey.SMTP_FROM),
  ]);

  const missing: string[] = [];
  if (!host) missing.push(SystemSettingKey.SMTP_HOST);
  if (!user) missing.push(SystemSettingKey.SMTP_USER);
  if (!password) missing.push(SystemSettingKey.SMTP_PASSWORD);
  if (!from) missing.push(SystemSettingKey.SMTP_FROM);
  if (missing.length > 0) throw new MailNotConfiguredError(missing);

  /**
   * Info: (20260815 - Luphia) 連接埠預設 587（STARTTLS）：
   * 465 是隱式 TLS，兩者的 `secure` 旗標相反，取錯會連不上而不是靜默降級。
   */
  const parsedPort = Number((port ?? "").trim());
  const resolvedPort =
    Number.isSafeInteger(parsedPort) && parsedPort > 0 ? parsedPort : 587;

  return {
    host: host as string,
    port: resolvedPort,
    user: user as string,
    password: password as string,
    from: from as string,
  };
}

export async function sendMail(message: IMailMessage): Promise<void> {
  const config = await resolveMailConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // Info: (20260815 - Luphia) 465 為隱式 TLS，其餘走 STARTTLS
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
  });

  /**
   * Info: (20260902 - Julian) 沒有附件時整個欄位不送出，而不是送一個空陣列。
   *
   * nodemailer 對 `attachments: []` 與 `attachments: undefined` 的處理不同：
   * 前者會讓它走進「有附件」的組裝路徑，把單一 part 的信改組成 multipart/mixed。
   * 團隊邀請信不帶附件，而它是這支服務唯一的既有消費者 ——
   * 加附件支援不該順手改掉它寄出去的信長什麼樣。
   */
  await transporter.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.attachments && message.attachments.length > 0
      ? { attachments: message.attachments }
      : {}),
  });

  /**
   * Info: (20260815 - Luphia) 只記收件者與主旨，不記內文——
   * 邀請信裡帶著一次性 token，寫進 log 等於把它留在第二個地方。
   *
   * Info: (20260902 - Julian) 附件加進來之後這一條更嚴格：**連檔名都不記**。
   * 薪資單的檔名帶著員工姓名與月份，記進 log 等於把「誰在幾月領了薪水」
   * 留在一個讀取權限遠寬於資料庫的地方（checklist §4.1 的同一條理由）。
   * 只記數量 —— 那足以回答「附件有沒有被送出去」，而不洩漏任何身分。
   */
  logger.info("mail sent", {
    to: message.to,
    subject: message.subject,
    attachmentCount: message.attachments?.length ?? 0,
  });
}
