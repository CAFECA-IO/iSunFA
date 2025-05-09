import { NextApiRequest, NextApiResponse } from 'next';
// Deprecated: (20250509 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getSession } from '@/lib/utils/session';
// Deprecated: (20250509 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { APIName, HttpMethod } from '@/constants/api_connection';
// Deprecated: (20250509 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import EmailLoginHandler from '@/lib/utils/email_login';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  createEmailLogin,
  deleteEmailLogin,
  verifyEmailLogin,
} from '@/lib/utils/repo/email_login.repo';
import loggerBack from '@/lib/utils/logger_back';
import { emailVerifier } from '@/lib/utils/verifier/email.verifier';
import { EMAIL_LOGIN_ACTION } from '@/constants/email_login';
import { sendEmail } from '@/lib/utils/worker/email_sender.worker';
import { EmailTemplateData, EmailTemplateName } from '@/constants/email_template';

/* Info: (20250429 - Luphia) 註冊 Email 一次性登入密碼
 * 1. 檢驗是否還在註冊冷卻期內
 * 2. 產生一次性登入密碼
 * 3. 寄送一次性登入密碼
 * 4. 回傳註冊成功訊息
 * 5. 建立註冊紀錄
 */
export const handleGetRequest = async (req: NextApiRequest) => {
  const { query } = req;
  const { email } = query;
  const isValidEmail = emailVerifier(email as string);
  if (!isValidEmail) {
    // Info: (20250429 - Luphia) email 格式不正確
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }
  const checkRegisterCooldownResult = await EmailLoginHandler.checkRegisterCooldown(
    email as string
  );
  if (!checkRegisterCooldownResult) {
    // Info: (20250429 - Luphia) 註冊冷卻期內
    throw new Error(STATUS_MESSAGE.EMAIL_LOGIN_REGISTRATION_COOLDOWN);
  }
  const emailLogin = await createEmailLogin(email as string);
  if (!emailLogin) {
    // Info: (20250429 - Luphia) 資料庫新增失敗
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  // Info: (20250429 - Luphia) 寄送一次性登入密碼
  const title = 'iSunFA 一次性登入密碼';
  const expiredAt = new Date(emailLogin.expiredAt * 1000).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
  });
  const loginLink = `${process.env.NEXT_PUBLIC_DOMAIN}/api/v2/email/${email}/one_time_login?hash=${emailLogin.hash}`;
  const data: EmailTemplateData[EmailTemplateName.ONE_TIME_PASSWORD] = {
    receiverName: email as string,
    loginCode: emailLogin.code,
    loginLink,
    expiredAt,
  };
  const emailResult = sendEmail(email as string, title, EmailTemplateName.ONE_TIME_PASSWORD, data);
  if (!emailResult) {
    // Info: (20250429 - Luphia) 寄送 email 失敗
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }
  // Info: (20250429 - Luphia) 記錄 log
  EmailLoginHandler.log(email as string, EMAIL_LOGIN_ACTION.REGISTER);
  const result = {
    statusMessage: STATUS_MESSAGE.SUCCESS_GET,
    result: checkRegisterCooldownResult,
  };
  return result;
};

// Info: (20250429 - Luphia) 執行一次性登入
export const handlePostRequest = async (req: NextApiRequest) => {
  const { body, query } = req;
  const { email } = query;
  const { code } = body;
  const isValidEmail = emailVerifier(email as string);
  if (!isValidEmail) {
    // Info: (20250429 - Luphia) email 格式不正確
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }
  const isAvailable = EmailLoginHandler.checkLoginTimes(email as string);
  if (!isAvailable) {
    // Info: (20250429 - Luphia) 超過登入次數
    throw new Error(STATUS_MESSAGE.EMAIL_LOGIN_TOO_MANY_ATTEMPTS);
  }
  const isValidCode = await verifyEmailLogin(email as string, code as string);
  if (!isValidCode) {
    // Info: (20250429 - Luphia) 驗證碼錯誤，記錄登入失敗
    EmailLoginHandler.log(email as string, EMAIL_LOGIN_ACTION.VERIFY);
    throw new Error(STATUS_MESSAGE.INVALID_ONE_TIME_PASSWORD);
  }
  // Info: (20250429 - Luphia) 驗證成功，清除登入紀錄
  EmailLoginHandler.cleanLogs(email as string);
  const result = {
    statusMessage: STATUS_MESSAGE.SUCCESS,
    result: { email },
  };
  return result;
};

// Info: (20250508 - Luphia) 刪除一次性登入密碼
export const handleDeleteRequest = async (req: NextApiRequest) => {
  const { query } = req;
  const { email } = query;
  const isValidEmail = emailVerifier(email as string);
  if (!isValidEmail) {
    // Info: (20250508 - Luphia) email 格式不正確
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }
  await deleteEmailLogin(email as string);
  const result = {
    statusMessage: STATUS_MESSAGE.SUCCESS,
    result: { email },
  };
  return result;
};

/* Info: (20250113 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
 * 補充說明： API Router 不應該決定 Response 格式與商業邏輯，只負責呼叫對應的流程
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const method = req.method || HttpMethod.GET;
  let httpCode;
  let result;
  let statusMessage;

  try {
    switch (method) {
      case HttpMethod.POST:
        ({ statusMessage, result } = await handlePostRequest(req));
        break;
      case HttpMethod.GET:
      default:
        ({ statusMessage, result } = await handleGetRequest(req));
    }
    ({ httpCode, result } = formatApiResponse(statusMessage, result));
    res.status(httpCode).json(result);
  } catch (error) {
    loggerBack.error(error);
    const err = error as Error;
    statusMessage = err.message;
    ({ httpCode, result } = formatApiResponse(statusMessage, {}));
    res.status(httpCode).json(result);
  }
  // ToDo: (20250509 - Luphia) 需補充 logUserAction 格式
  /*
  await logUserAction(
    session,
    APIName.PAYMENT_METHOD_REGISTER_REDIRECT,
    req,
    statusMessage as string
  );
   */
  res.end();
};

export default handler;
