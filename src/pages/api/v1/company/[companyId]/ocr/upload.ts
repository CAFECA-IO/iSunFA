import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountResultStatus } from '@/interfaces/account';
import version from '@/lib/version';
import formidable from 'formidable';
import { parseForm } from '@/lib/utils/parse_image_form';
import { promises as fs } from 'fs';
import { AICH_URI } from '@/constants/config';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import { IResponseData } from '@/interfaces/response_data';
import { responseStatusCode } from '@/lib/utils/status_code';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<AccountResultStatus[]>>
) {
  try {
    // Todo Murky (20240416): Get Images and check if Image exist
    switch (req.method) {
      case 'POST': {
        let files: formidable.Files;
        try {
          files = (await parseForm(req)).files;
        } catch (error) {
          throw new Error('Internal server error');
        }

        if (!files || !files.image || !files.image.length) {
          throw new Error('Invalid input parameter');
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
          throw new Error('Gateway Timeout');
        }

        const resultJson: AccountResultStatus[] = (await result.json()).payload;

        res.status(responseStatusCode.success).json({
          powerby: `ISunFa api ${version}`,
          success: true,
          code: String(responseStatusCode.success),
          message: 'upload {numberOfImage} images sucessfully',
          payload: resultJson,
        });
        break;
      }
      default: {
        throw new Error('Method Not Allowed');
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
