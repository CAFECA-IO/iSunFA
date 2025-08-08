import { NextApiRequest, NextApiResponse } from 'next';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { uploadFile } from '@/lib/utils/google_image_upload';
import { updateCompanyById } from '@/lib/utils/repo/account_book.repo';
import { updateUserById } from '@/lib/utils/repo/user.repo';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import formidable from 'formidable';
import { isEnumValue } from '@/lib/utils/type_guard/common';
import loggerBack from '@/lib/utils/logger_back';
import { uint8ArrayToBuffer } from '@/lib/utils/crypto';
import { createFile } from '@/lib/utils/repo/file.repo';
import { generateFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';

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

  if (type === UploadType.USER && userId > 0 && companyId && companyId > 0) {
    isAuthorized = true;
  } else {
    isAuthorized = false;
  }

  return isAuthorized;
}

/**
 * Info: (20240829 - Murky)
 * Handle different logic for different file upload type
 * @param type - the type of the file upload
 */
async function handleFileUpload(
  type: UploadType,
  file: formidable.File[],
  targetIdNum: number,
  isEncrypted: boolean,
  encryptedSymmetricKey: string,
  iv: Uint8Array
) {
  const ivBuffer = uint8ArrayToBuffer(iv);
  const fileForSave = file[0];
  const fileName = fileForSave.newFilename;
  const fileMimeType = fileForSave.mimetype || 'image/jpeg';
  const fileSize = fileForSave.size;

  let fileUrl = '';

  switch (type) {
    case UploadType.KYC:
    case UploadType.INVOICE: {
      const localUrl = generateFilePathWithBaseUrlPlaceholder(
        fileName,
        UPLOAD_TYPE_TO_FOLDER_MAP[type]
      );
      fileUrl = localUrl || '';
      break;
    }
    case UploadType.COMPANY:
    case UploadType.USER:
    case UploadType.PROJECT: {
      const googleBucketUrl = await uploadFile(fileForSave);
      fileUrl = googleBucketUrl;
      break;
    }
    default:
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }

  const fileInDB = await createFile({
    name: fileName,
    size: fileSize,
    mimeType: fileMimeType,
    type: UPLOAD_TYPE_TO_FOLDER_MAP[type],
    url: fileUrl,
    isEncrypted,
    encryptedSymmetricKey,
    iv: ivBuffer,
  });

  if (!fileInDB) {
    throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
  }

  const fileId = fileInDB.id;

  switch (type) {
    // case UploadType.KYC: {
    //   const targetIdStr = targetIdNum.toString();
    //   const ext = fileForSave.originalFilename ? path.extname(fileForSave.originalFilename).slice(1) : '';
    //   await addPrefixToFile(FileFolder.TMP, fileForSave.newFilename, targetIdStr, ext);
    //   fileId = fileForSave.newFilename;
    //   break;
    // }
    case UploadType.COMPANY: {
      await updateCompanyById(targetIdNum, undefined, undefined, fileId);
      break;
    }
    case UploadType.USER: {
      await updateUserById(targetIdNum, undefined, undefined, fileId);
      break;
    }
    case UploadType.PROJECT: {
      await updateProjectById(targetIdNum, undefined, fileId);
      break;
    }
    case UploadType.KYC:
    case UploadType.INVOICE: {
      // Info: (20240830 - Murky) Do nothing
      break;
    }
    default:
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
  return {
    fileId,
    fileName: fileInDB.name,
  };
}

function formatPostQuery(req: NextApiRequest) {
  const { type, targetId } = req.query;

  // Info: (20240829 - Murky) Check if type is upload type
  const isTypeValid = isEnumValue(UploadType, type);
  if (!isTypeValid) {
    loggerBack.info(`API POST File: Invalid type: ${type}`);
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }

  const targetIdNum = convertStringToNumber(targetId);

  return { type, targetId: targetIdNum };
}

function extractKeyAndIvFromFields(fields: formidable.Fields) {
  // Info: (20240830 - Murky) iv is uint8Array
  const { encryptedSymmetricKey, iv } = fields;
  const keyStr =
    encryptedSymmetricKey && encryptedSymmetricKey.length ? encryptedSymmetricKey[0] : '';
  const ivStr = iv ? iv[0] : '';

  const ivUnit8: Uint8Array = new Uint8Array(ivStr.split(',').map((num) => parseInt(num, 10)));

  const isEncrypted = !!(keyStr && ivUnit8.length > 0);

  return {
    isEncrypted,
    encryptedSymmetricKey: keyStr,
    iv: ivUnit8,
  };
}

async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req);
  const { userId, accountBookId: companyId } = session;

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
        const { files, fields } = parsedForm;
        const { file } = files;
        const { isEncrypted, encryptedSymmetricKey, iv } = extractKeyAndIvFromFields(fields);

        if (!file) {
          statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
          loggerBack.info(`API POST File: No file uploaded`);
        } else {
          // ToDo: (20241108 - Jacky) Use createmany to create multiple files once
          const { fileId, fileName } = await handleFileUpload(
            type,
            file,
            targetId,
            isEncrypted,
            encryptedSymmetricKey,
            iv
          );
          // ToDo: (20241108 - Jacky) return file list instead of single file
          payload = { id: fileId, name: fileName, size: file[0].size, existed: true };
          statusMessage = STATUS_MESSAGE.CREATED;
        }
      } catch (_error) {
        const error = _error as Error;
        loggerBack.error(`error: ${JSON.stringify(error)}`);
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
