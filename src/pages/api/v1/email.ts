import { NextApiRequest, NextApiResponse } from 'next';
import MailService from '@/lib/utils/mail_service';
import { SendMailOptions } from 'nodemailer';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

// Info: (20240823 - Julian) Handle POST request for sending email
export async function handlePostRequest(
  req: NextApiRequest
): Promise<{ statusMessage: string; payload: boolean | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: boolean | null = null;

  try {
    // Info: (20240823 - Julian) 設置郵件內容
    const mailOptions: SendMailOptions = {
      from: process.env.MAIL_CLIENT_ID,
      to: process.env.REACT_APP_RECEPIENT_EMAIL,
      subject: 'iSunFA Contact Form',
      text: req.body.comment, // Info: (20240823 - Julian) 純文字
      html: `<p>${req.body.comment}</p>`, // Info: (20240823 - Julian) HTML
    };

    // Info: (20240823 - Julian) 發送郵件
    const mailServiceInstance = MailService.getInstance();
    const success = await mailServiceInstance.sendMail(mailOptions);

    if (success) {
      // Info: (20240823 - Julian) 回應成功
      statusMessage = STATUS_MESSAGE.SUCCESS;
      payload = true;
    } else {
      // Info: (20240823 - Julian) 回應失敗
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      payload = false;
    }
  } catch (error) {
    // Info: (20240823 - Julian) 回應失敗
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = false;
  }

  return { statusMessage, payload };
}

// Info: (20240823 - Julian) Define method handlers
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: boolean | null }>;
} = {
  POST: handlePostRequest,
};

// Info: (20240823 - Julian) Main handler function
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
