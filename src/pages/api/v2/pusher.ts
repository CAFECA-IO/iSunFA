import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICertificateMeta } from '@/interfaces/certificate';
import { formatApiResponse } from '@/lib/utils/common';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPusherInstance } from '@/lib/pusher'; // Info: (20241009-tzuhan) 使用封裝好的 Pusher singleton instance
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  try {
    if (req.method !== 'POST') {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    } else {
      const { token, certificates } = req.body;

      if (!token || !certificates || !Array.isArray(certificates)) {
        statusMessage = STATUS_MESSAGE.BAD_REQUEST;
      } else {
        const pusher = getPusherInstance();
        const certificatePromises = certificates.map(async (certificate: ICertificateMeta) => {
          return pusher.trigger(PRIVATE_CHANNEL.CERTIFICATE, CERTIFICATE_EVENT.UPLOAD, {
            certificate,
            token,
          });
        });

        await Promise.all(certificatePromises);

        statusMessage = STATUS_MESSAGE.SUCCESS;
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
