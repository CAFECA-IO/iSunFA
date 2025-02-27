import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IUpdateMemberBody, IUpdateMemberResponse } from '@/lib/utils/zod_schema/team';

interface IResponse {
  statusMessage: string;
  payload: IUpdateMemberResponse | null;
}

/**
 * Info: (20250227 - Shirley) 處理 PUT 請求，更新團隊成員角色，目前為 mock API
 */
const handlePutRequest: IHandleRequest<APIName.UPDATE_MEMBER_BY_ID, IResponse['payload']> = async ({
  query,
  body,
}) => {
  const { teamId, memberId } = query;

  const updateData = body as IUpdateMemberBody;

  // Info: (20250227 - Shirley) 模擬團隊或成員不存在的情況
  if (teamId === 404 || memberId === 404) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  // Info: (20250227 - Shirley) 模擬更新成員角色
  const payload: IUpdateMemberResponse = {
    id: memberId,
    userId: 456,
    teamId,
    role: updateData.role,
    email: 'default@isuncloud.com',
    name: 'Default User',
    createdAt: 1633036800,
    updatedAt: getTimestampNow(),
  };

  return { statusMessage: STATUS_MESSAGE.SUCCESS_UPDATE, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  PUT: (req) => withRequestValidation(APIName.UPDATE_MEMBER_BY_ID, req, handlePutRequest),
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
