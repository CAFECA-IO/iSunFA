import { NextApiRequest, NextApiResponse } from 'next';
import { IRoomWithKeyChain } from '@/interfaces/room';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { roomManager } from '@/lib/utils/room';

/* Info: (20241112 - Jacky)
 * Handles a GET request to retrieve a room public key by its ID.
 * please use importPublicKey to transform the public key back to CryptoKey.
 */
const handleGetRequest: IHandleRequest<APIName.ROOM_GET_PUBLIC_KEY_BY_ID, JsonWebKey> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: JsonWebKey | null = null;

  const { roomId } = query;

  const room: IRoomWithKeyChain | null = roomManager.getRoomWithKeyChainById(roomId);
  if (!room) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    payload = room.publicKey;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: JsonWebKey | null;
  }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.ROOM_GET_PUBLIC_KEY_BY_ID, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<JsonWebKey | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: JsonWebKey | null = null;

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
    const { httpCode, result } = formatApiResponse<JsonWebKey | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
