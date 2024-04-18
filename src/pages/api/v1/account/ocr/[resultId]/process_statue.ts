// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';

interface ResponseData extends ResponseType<AccountProgressStatus> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;

  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Reason why request has failed',
    });
  }

  switch (req.method) {
    case 'GET': {
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '200',
        message: `OCR analyzing progress status of id:${resultId} return successfully`,
        payload: 'success',
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '400',
        message: 'Method Not Allowed in ocr process status api',
      });
    }
  }
}
