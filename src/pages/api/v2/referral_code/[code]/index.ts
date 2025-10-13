import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkRequestData, logUserAction } from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';

interface IReferralCode {
  userId: number;
  code: string;
  discountPercentage: number;
  discountAmount: number;
}

const REFERRAL_CODE: IReferralCode[] = [
  { userId: 10000002, code: 'WELCOME3037', discountPercentage: 0.9, discountAmount: 10 },
];

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  // Info: (20250925 - Luphia) 檢驗 Input Data 格式
  const { query } = checkRequestData(APIName.GET_REFERRAL_CODE, req, session);

  // Info: (20250925 - Luphia) 商業邏輯：找尋是否存在此推薦碼
  const { code } = query;
  const referralCode = REFERRAL_CODE.find((item) => item.code === code) || {
    userId: 0,
    code,
    discountPercentage: 0,
    discountAmount: 0,
  };
  const statusMessage = STATUS_MESSAGE.SUCCESS;

  // Info: (20250925 - Luphia) 檢驗 Output Data 格式
  const result = validateOutputData(APIName.GET_REFERRAL_CODE, referralCode);

  const payload = result.outputData;
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.USER_ROLE_LIST;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.GET_REFERRAL_CODE;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
