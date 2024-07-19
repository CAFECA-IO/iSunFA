import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';
import formidable from 'formidable';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { IFile } from '@/interfaces/file';
import { FileFolder } from '@/constants/file';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
) {
  try {
    // Info: (20240419 - Jacky) K012001 - POST /kyc/entity
    if (req.method === 'POST') {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkUserAdmin({ userId, companyId });
      let payload: IFile | null = null;
      if (isAuth) {
        let files: formidable.Files;
        let fields: formidable.Fields;
        try {
          const parsedForm = await parseForm(req, FileFolder.TMP);
          files = parsedForm.files;
          fields = parsedForm.fields;
        } catch (error) {
          throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
        }
        const { file } = files;
        const { type } = fields;
        if (file && type) {
          const id = file[0].newFilename.split('.')[0];
          payload = {
            id,
            size: file[0].size,
          };
        }
        const { httpCode, result } = formatApiResponse<IFile | null>(
          STATUS_MESSAGE.CREATED,
          payload
        );
        res.status(httpCode).json(result);
      }
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IFile>(error.message, {} as IFile);
    res.status(httpCode).json(result);
  }
}
