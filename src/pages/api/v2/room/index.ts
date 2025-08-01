import { NextApiRequest, NextApiResponse } from 'next';
import { IRoom } from '@/interfaces/room';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { roomManager } from '@/lib/utils/room';
import loggerBack from '@/lib/utils/logger_back';

const handlePostRequest: IHandleRequest<APIName.ROOM_ADD, IRoom> = async ({ session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRoom | null = null;

  const { accountBookId } = session;

  const newRoom = roomManager.addRoom(accountBookId);
  loggerBack.info(`Room List: ${JSON.stringify(roomManager.getRoomList(), null, 2)}`);
  statusMessage = STATUS_MESSAGE.CREATED;
  payload = newRoom;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IRoom | IRoom[] | null;
  }>;
} = {
  POST: (req) => withRequestValidation(APIName.ROOM_ADD, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IRoom | IRoom[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRoom | IRoom[] | null = null;

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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IRoom | IRoom[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
