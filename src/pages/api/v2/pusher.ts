import { STATUS_MESSAGE } from '@/constants/status_code';
import { IFileUIBeta } from '@/interfaces/file';
import { formatApiResponse } from '@/lib/utils/common';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPusherInstance } from '@/lib/utils/pusher'; // Info: (20241009-tzuhan) 使用封裝好的 Pusher singleton instance
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

const handerCertificteChannel = async (event: string, data: object) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  switch (event) {
    case CERTIFICATE_EVENT.UPLOAD: {
      const { token, files } = data as { token: string; files: IFileUIBeta[] };

      if (!token || !files || !Array.isArray(files)) {
        statusMessage = STATUS_MESSAGE.BAD_REQUEST;
      } else {
        const pusher = getPusherInstance();
        const certificatePromises = files.map(async (file: IFileUIBeta) => {
          return pusher.trigger(PRIVATE_CHANNEL.CERTIFICATE, CERTIFICATE_EVENT.UPLOAD, {
            token,
            file,
          });
        });

        await Promise.all(certificatePromises);

        statusMessage = STATUS_MESSAGE.SUCCESS;
      }
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.BAD_REQUEST;
      break;
  }
  return statusMessage;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  try {
    if (req.method !== 'POST') {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    } else {
      const { channel, event } = req.query;
      // Info: (20241022 - tzuhan) @Murky, 這裡是讓這隻API可以接收不同的channel和event，並且做不同的處理
      switch (channel) {
        case PRIVATE_CHANNEL.CERTIFICATE:
          statusMessage = await handerCertificteChannel(event as string, req.body);
          break;
        default:
          statusMessage = STATUS_MESSAGE.BAD_REQUEST;
          break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<null>(statusMessage, null);
    res.status(httpCode).json(result);
  }
}
