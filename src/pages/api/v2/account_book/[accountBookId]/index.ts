import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  IGetAccountBookQueryParams,
  IGetAccountBookResponse,
} from '@/lib/utils/zod_schema/account_book';

interface IResponse {
  statusMessage: string;
  payload: IGetAccountBookResponse | null;
}

/**
 * Info: (20250303 - Shirley) 處理 GET 請求，獲取帳本詳細資訊，目前為 mock API
 */
const handleGetRequest: IHandleRequest<
  APIName.GET_ACCOUNT_BOOK_BY_ID,
  IResponse['payload']
> = async ({ query }) => {
  const { accountBookId } = query as IGetAccountBookQueryParams;

  // Info: (20250303 - Shirley) 模擬帳本不存在的情況
  if (accountBookId === 404) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  // Info: (20250227 - Shirley) 模擬獲取帳本詳細資訊
  const payload: IGetAccountBookResponse = {
    id: accountBookId.toString(),
    name: 'Account Book Name',
    taxId: '1234567890',
    taxSerialNumber: '1234567890',
    representativeName: 'Representative Name',
    country: {
      id: '123456',
      code: 'tw',
      name: 'Taiwan',
      localeKey: 'tw',
      currencyCode: 'TWD',
      phoneCode: '+886',
      phoneExample: '0912345678',
    },
    phoneNumber: '0912345678',
    address: 'No. 1, Section 5, Xinyi Road, Xinyi District, Taipei City 110, Taiwan',
    startDate: 1609459200,
    createdAt: 1609459200,
    updatedAt: 1609459200,
  };

  return { statusMessage: STATUS_MESSAGE.SUCCESS_GET, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.GET_ACCOUNT_BOOK_BY_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
