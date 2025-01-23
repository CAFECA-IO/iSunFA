import { NextApiRequest, NextApiResponse } from 'next';
import { IRoom } from '@/interfaces/room';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { roomManager } from '@/lib/utils/room';

/* Info: (20241112 - Jacky)
 * Handles a GET request to retrieve a room by its ID.
 * Use POST because we need to send a password to verify the room.
 */
const handlePostRequest: IHandleRequest<APIName.ROOM_GET_BY_ID, IRoom> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRoom | null = null;

  const { roomId } = query;
  const { password } = body;
  const isPass = roomManager.verifyRoomPassword(roomId, password);
  if (!isPass) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    const room = roomManager.getRoomById(roomId);
    payload = room;
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<APIName.ROOM_DELETE, IRoom> = async (req) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRoom | null = null;

  const { roomId } = req.query;
  const room = roomManager.getRoomById(roomId);

  const { password } = req.body;
  const isPass = roomManager.verifyRoomPassword(roomId, password);
  if (!isPass) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else if (!room) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    const deleted = roomManager.deleteRoom(roomId);
    if (!deleted) {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    } else {
      statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
      payload = room;
    }
  }

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
  POST: (req) => withRequestValidation(APIName.ROOM_GET_BY_ID, req, handlePostRequest),
  DELETE: (req) => withRequestValidation(APIName.ROOM_DELETE, req, handleDeleteRequest),
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
