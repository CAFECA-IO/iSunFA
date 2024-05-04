import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountResultStatus } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';
import formidable from 'formidable';
import { parseForm } from '@/lib/utils/parse_image_form';
import { promises as fs } from 'fs';
import { AICH_URI } from '@/constants/config';

interface ResponseData extends ResponseType<AccountResultStatus[]> {}

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'POST': {
      let files: formidable.Files;
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
          message: 'Need to upload at least one invoice, file need to have key "image"',
        });
      }

      // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
      const imageContent = await fs.readFile(files.image[0].filepath);
      const imageBlob = new Blob([imageContent], { type: files.image[0].mimetype || undefined });

      const formData = new FormData();
      formData.append('image', imageBlob);

      const result = await fetch(`${AICH_URI}/api/v1/ocr/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        return res.status(500).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '500',
          message:
            'Internal Server Error in upload invoice to ocr, happpend when sending Image to AICH',
        });
      }

      const resultJson: AccountResultStatus[] = (await result.json()).payload;

      const response: ResponseData = {
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'upload {numberOfImage} images sucessfully',
        payload: resultJson,
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
