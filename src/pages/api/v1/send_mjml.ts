import { NextApiRequest, NextApiResponse } from 'next';
import MailService from '@/lib/utils/mail_service';
import { SendMailOptions } from 'nodemailer';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';
import Mustache from 'mustache';
import { MJML_FILE } from '@/constants/email';

export async function handlePostRequest(
  req: NextApiRequest
): Promise<{ statusMessage: string; payload: boolean | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: boolean | null = null;

  const { templateData } = req.body;

  try {
    // Info: (20250421 - Julian) 1. 讀取 MJML 檔案
    const rawMjml = fs.readFileSync(path.resolve(process.cwd(), MJML_FILE.FREE), 'utf8');

    // Info: (20250421 - Julian) 2. 使用 Mustache 注入變數
    const renderedMjml = Mustache.render(rawMjml, templateData);

    // Info: (20250421 - Julian) 3. 轉成 HTML
    const { html, errors } = mjml2html(renderedMjml);
    if (errors.length) {
      statusMessage = STATUS_MESSAGE.API_NOT_DEFINED;
      payload = null;
      return { statusMessage, payload };
    }

    // Info: (20250421 - Julian) 設置郵件內容
    const mailOptions: SendMailOptions = {
      from: process.env.MAIL_CLIENT_ID,
      to: 'julian.hsu@mermer.cc',
      subject: '測試郵件',
      text: JSON.stringify({ html }), // Info: (20250421 - Julian) 文字內容
      html, // Info: (20250421 - Julian) HTML
    };

    // Info: (20250421 - Julian) 發送郵件
    const mailServiceInstance = MailService.getInstance();
    const success = await mailServiceInstance.sendMail(mailOptions);

    if (success) {
      // Info: (20250421 - Julian) 回應成功
      statusMessage = STATUS_MESSAGE.SUCCESS;
      payload = true;
    } else {
      // Info: (20250421 - Julian) 回應失敗
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      payload = false;
    }
  } catch (error) {
    // Info: (20250421 - Julian) 回應失敗
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = false;
  }

  return { statusMessage, payload };
}

// Info: (20250421 - Julian) Define method handlers
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: boolean | null }>;
} = {
  POST: handlePostRequest,
};

// Info: (20250421 - Julian) Main handler function
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<boolean | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: boolean | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (error) {
    statusMessage = (error as Error).message;
  }

  const { httpCode, result } = formatApiResponse<boolean | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
