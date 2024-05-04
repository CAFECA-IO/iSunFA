// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';
import { AICH_URI } from '@/constants/config';

interface ResponseData extends ResponseType<AccountProgressStatus> {}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;

  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid resultId',
    });
  }

  switch (req.method) {
    case 'GET': {
      const result = await fetch(`${AICH_URI}/api/v1/ocr/${resultId}/process_status`);

      if (!result.ok) {
        return res.status(500).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '500',
          message:
            'Internal Server Error in ocr process status api, error in fetching OCR process status from AICH',
        });
      }

      const resultJson: AccountProgressStatus = (await result.json()).payload;

      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '200',
        message: `OCR analyzing progress status of id:${resultId} return successfully`,
        payload: resultJson,
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in ocr process status api',
      });
    }
  }
}
