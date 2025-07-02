import nodemailer from 'nodemailer';
import { EmailTemplateData, EmailTemplateName } from '@/constants/email_template';
import { compileTemplate } from '@/lib/email/template';
import loggerBack from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: EmailTemplateName,
  data: EmailTemplateData[keyof EmailTemplateData]
): Promise<boolean> => {
  let result = false;
  if (DefaultValue.EMAIL_LOGIN.EMAIL.includes(to)) {
    // Info: (20250624 - Luphia) 測試帳戶不寄送 email
    return true;
  }

  try {
    const html = compileTemplate({
      templateName,
      data,
    });
    const transporter = nodemailer.createTransport({
      service: process.env.MAIL_SERVICE,
      auth: {
        user: process.env.MAIL_CLIENT_ID,
        pass: process.env.MAIL_CLIENT_PASSWORD,
      },
    });
    await transporter.sendMail({
      from: `"iSunFA" <${process.env.MAIL_CLIENT_ID}>`,
      to,
      subject,
      html,
    });
    result = true;
  } catch (error) {
    // Info: (20250113 - Luphia) 寄送 email 失敗
    loggerBack.error('sendEmail error');
    loggerBack.error(error);
    result = false;
  }
  return result;
};
