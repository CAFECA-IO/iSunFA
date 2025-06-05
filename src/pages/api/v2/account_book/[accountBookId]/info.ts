import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { HttpMethod } from '@/constants/api_connection';

/**
 * Info: (20250519 - Shirley) 該 API 已移動到 /api/v2/account_book/[accountBookId]
 * 此處僅做重定向，保持向後兼容性
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<unknown>>
) {
  const method = req.method || HttpMethod.GET;

  // Info: (20250521 - Shirley) 將請求重定向到新的 API 端點
  if (method === HttpMethod.GET || method === HttpMethod.PUT) {
    const { accountBookId } = req.query;
    res.redirect(301, `/api/v2/account_book/${accountBookId}`);
  } else {
    const response = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null);
    res.status(response.httpCode).json(response.result);
  }
}
