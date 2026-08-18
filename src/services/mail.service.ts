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

export interface IMailMessage {
  to: string;
  subject: string;
  html: string;
  // Info: (20260815 - Luphia) 純文字備援：不少信箱客戶端與過濾器只讀這一份
  text: string;
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

  await transporter.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  /**
   * Info: (20260815 - Luphia) 只記收件者與主旨，不記內文——
   * 邀請信裡帶著一次性 token，寫進 log 等於把它留在第二個地方。
   */
  logger.info("mail sent", { to: message.to, subject: message.subject });
}
