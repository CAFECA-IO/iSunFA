import { NextApiRequest, NextApiResponse } from 'next';
import { FileFolder, UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { addPrefixToFile, parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import path from 'path';
import { uploadFile } from '@/lib/utils/google_image_upload';
import { updateCompanyById } from '@/lib/utils/repo/company.repo';
import { updateUserById } from '@/lib/utils/repo/user.repo';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import formidable from 'formidable';
import { isEnumValue } from '@/lib/utils/type_guard/common';
import logger from '@/lib/utils/logger';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function authorizeUser(
  type: UploadType,
  userId: number,
  companyId?: number
): Promise<boolean> {
  let isAuthorized: boolean;

  if (type === UploadType.USER) {
    isAuthorized = await checkAuthorization([AuthFunctionsKeys.user], { userId });
  } else {
    const company = companyId ?? 0;
    isAuthorized = await checkAuthorization([AuthFunctionsKeys.admin], {
      userId,
      companyId: company,
    });
  }

  return isAuthorized;
}

async function ocrUploadLogic(file: formidable.File[]) {
  const fileName = file[0].newFilename;

  if (!fileName) {
    logger.info(file, `API POST File: OCR upload failed: No file name in file `);
    throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
  }
  return fileName;
}

/**
 * Info: (20240829 - Murky)
 * Handle different logic for different file upload type
 * @param type - the type of the file upload
 */
async function handleFileUpload(type: UploadType, file: formidable.File[], targetIdNum: number) {
  let fileId = '';
  switch (type) {
    case UploadType.KYC: {
      const targetIdStr = targetIdNum.toString();
      const ext = file[0].originalFilename ? path.extname(file[0].originalFilename).slice(1) : '';
      await addPrefixToFile(FileFolder.TMP, file[0].newFilename, targetIdStr, ext);
      fileId = file[0].newFilename;
      break;
    }
    case UploadType.COMPANY: {
      const iconUrl = await uploadFile(file[0]);
      await updateCompanyById(targetIdNum, undefined, undefined, undefined, iconUrl);
      fileId = iconUrl;
      break;
    }
    case UploadType.USER: {
      const iconUrl = await uploadFile(file[0]);
      await updateUserById(targetIdNum, undefined, undefined, undefined, undefined, iconUrl);
      fileId = iconUrl;
      break;
    }
    case UploadType.PROJECT: {
      const iconUrl = await uploadFile(file[0]);
      await updateProjectById(targetIdNum, undefined, iconUrl);
      fileId = iconUrl;
      break;
    }
    case UploadType.INVOICE: {
      fileId = await ocrUploadLogic(file);
      break;
    }
    default:
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
  return {
    fileId,
  };
}

function formatPostQuery(req: NextApiRequest) {
  const { type, targetId } = req.query;

  // Info: (20240829 - Murky) Check if type is upload type
  const isTypeValid = isEnumValue(UploadType, type);
  if (!isTypeValid) {
    logger.info(`API POST File: Invalid type: ${type}`);
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }

  const targetIdNum = convertStringToNumber(targetId);

  return { type, targetId: targetIdNum };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const { type, targetId } = formatPostQuery(req);
    const isAuth = await authorizeUser(type, userId, companyId);

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const parsedForm = await parseForm(req, UPLOAD_TYPE_TO_FOLDER_MAP[type]);
        const { files } = parsedForm;
        const { file } = files;

        if (!file) {
          statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
          logger.info(`API POST File: No file uploaded`);
        } else {
          const { fileId } = await handleFileUpload(type, file, targetId);
          payload = { id: fileId, size: file[0].size, existed: true };
          statusMessage = STATUS_MESSAGE.CREATED;
        }
      } catch (_error) {
        const error = _error as Error;
        logger.error(error, `API POST File: ${error.message}`);
        statusMessage = error.message;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IFile | null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IFile | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
