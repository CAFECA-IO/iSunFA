import type { NextApiRequest, NextApiResponse } from 'next';
// import { AccountResultStatus } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';
import { parseForm } from '@/lib/utils/parse_form_data';
import formidable from 'formidable';
import OCRService from './ocr.service';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

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
      // Info Murky (20240416): Get Images and check if Image exist
      // Images store in array in files.image is an array of Formidable File Object
      // each image in files.image have property filepath

      let files: formidable.Files<string> = {};
      try {
        files = (await parseForm(req)).files;
      } catch (error) {
        return res.status(500).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '500',
          message: 'Internal Server Error in upload invoice to ocr, file cannot be parsed',
        });
      }

      if (!files || !files.image || !files.image.length) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Need to upload at least one invoice',
        });
      }

      // Info Murky (20240416): Extract text from image
      // resultIds is an array of id that can use to extract data from /ocr/:resultId/result
      let resultIds: string[] = [];
      try {
        resultIds = await Promise.all(
          files.image.map(async (image) => {
            const imagePath = image.filepath;
            const generateDescription = await ocrService.extractTextFromImage(imagePath);
            return generateDescription;
          })
        );
      } catch (error) {
        return res.status(500).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '500',
          message: 'Internal Server Error in upload invoice to ocr',
        });
      }

      const response: ResponseData = {
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'upload {numberOfImage} images sucessfully',
        payload: resultIds,
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
