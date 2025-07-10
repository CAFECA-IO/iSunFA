import fs from 'fs';
import path from 'path';
import mustache from 'mustache';
import mjml2html from 'mjml';
import loggerBack from '@/lib/utils/logger_back';
import { EmailTemplateData } from '@/constants/email_template';

/**
 * Info: (20250421 - Tzuhan) 這邊的 templateName 是指 email template 的檔名
 * 根據 template 名稱與傳入資料，回傳編譯後的 HTML 字串
 */
export const compileTemplate = <T extends keyof EmailTemplateData>({
  templateName,
  data,
}: {
  templateName: T;
  data: EmailTemplateData[T];
}): string => {
  const filePath = path.resolve(process.cwd(), 'src/email', `${templateName}.mjml`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }
  // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 讀圖)
  const mjmlContent = fs.readFileSync(filePath, 'utf-8');
  const renderedMJML = mustache.render(mjmlContent, data);
  const { html, errors } = mjml2html(renderedMJML);

  if (errors.length > 0) {
    loggerBack.error(`[MJML Error] in template "${templateName}":`, errors);
  }

  return html;
};
