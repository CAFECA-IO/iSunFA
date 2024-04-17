import type { NextApiRequest, NextApiResponse } from 'next';

type Status = 'success' | 'inProgress' | 'error';

type OcrResultStatus = {
  resultId: string;
  status: string;
};

type ResponseData = {
  message: Status;
  errorReason?: string;
  data: OcrResultStatus[];
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'POST': {
      const status = 'success' as Status;
      const data: OcrResultStatus[] = [
        {
          resultId: '20240416-001-001',
          status: 'success',
        },
        {
          resultId: '20240416-001-002',
          status: 'inProgress',
        },
      ];

      const response: ResponseData = {
        message: status,
        data,
      };

      return res.status(200).json(response);
    }
    default: {
      return res.status(405).json({
        message: 'error',
        errorReason: 'Method Not Allowed',
        data: [],
      });
    }
  }
}
