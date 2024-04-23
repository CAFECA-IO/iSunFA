import type { NextApiRequest, NextApiResponse } from 'next';
// import { AccountResultStatus } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';
import OCRService from './ocr.service';

interface ResponseData extends ResponseType<string[]> {}

// export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
//   // Todo Murky (20240416): Get Images and check if Image exist
//   switch (req.method) {
//     case 'POST': {
//       const data: AccountResultStatus[] = [
//         {
//           resultId: '20240416-001-001',
//           status: 'success',
//         },
//         {
//           resultId: '20240416-001-002',
//           status: 'inProgress',
//         },
//       ];

//       const response: ResponseData = {
//         powerby: `ISunFa api ${version}`,
//         success: true,
//         code: '200',
//         message: 'upload {numberOfImage} images sucessfully',
//         payload: data,
//       };

//       return res.status(200).json(response);
//     }
//     default: {
//       return res.status(405).json({
//         powerby: `ISunFa api ${version}`,
//         success: false,
//         code: '405',
//         message: 'Method Not Allowed in upload images api',
//       });
//     }
//   }
// }
export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const ocrService = OCRService.getInstance();
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'POST': {
      const { description } = req.body;
      if (!description || typeof description !== 'string') {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Bad Request in upload images api',
        });
      }

      const generateDescription = description.split('\n');

      const resultId = await ocrService.tempTestOcr(generateDescription);
      const response: ResponseData = {
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'upload {numberOfImage} images sucessfully',
        payload: [resultId],
      };

      return res.status(200).json(response);
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in upload images api',
      });
    }
  }
}
