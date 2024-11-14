import { NextApiRequest, NextApiResponse } from 'next';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFileBeta } from '@/interfaces/file';
import { parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { uploadFile } from '@/lib/utils/google_image_upload';
import { updateCompanyById } from '@/lib/utils/repo/company.repo';
import { updateUserById } from '@/lib/utils/repo/user.repo';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import formidable from 'formidable';
import loggerBack from '@/lib/utils/logger_back';
import { uint8ArrayToBuffer } from '@/lib/utils/crypto';
import { createFile } from '@/lib/utils/repo/file.repo';
import { generateFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { roomManager } from '@/lib/utils/room';
import { File } from '@prisma/client';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handleFileUpload(
  type: UploadType,
  file: formidable.File[],
  targetId: string,
  isEncrypted: boolean,
  encryptedSymmetricKey: string,
  iv: Uint8Array
) {
  const ivBuffer = uint8ArrayToBuffer(iv);
  const fileForSave = file[0];
  const fileName = fileForSave.newFilename;
  const fileMimeType = fileForSave.mimetype || 'image/jpeg';
  const fileSize = fileForSave.size;
  const targetIdNum = type !== UploadType.ROOM ? convertStringToNumber(targetId) : -1;
  let fileUrl = '';

  switch (type) {
    case UploadType.KYC:
    case UploadType.ROOM:
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
  const returnFile: IFileBeta = {
    id: fileId,
    name: fileName,
    size: fileSize,
    url: fileUrl,
    existed: true,
  };

  switch (type) {
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
    case UploadType.ROOM: {
      roomManager.addFileToRoom(targetId, returnFile);
      break;
    }
    case UploadType.INVOICE: {
      break;
    }
    default:
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
  }
  return fileInDB;
}

function extractKeyAndIvFromFields(fields: formidable.Fields) {
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

const handlePostRequest: IHandleRequest<APIName.FILE_UPLOAD, File> = async ({ query, req }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: File | null = null;

  const { type, targetId } = query;

  const parsedForm = await parseForm(req, UPLOAD_TYPE_TO_FOLDER_MAP[type]);
  const { files, fields } = parsedForm;
  const { file } = files;
  const { isEncrypted, encryptedSymmetricKey, iv } = extractKeyAndIvFromFields(fields);

  if (!file) {
    statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
    loggerBack.info(`API POST File: No file uploaded`);
  } else {
    const returnFile = await handleFileUpload(
      type,
      file,
      targetId,
      isEncrypted,
      encryptedSymmetricKey,
      iv
    );
    payload = returnFile;
    statusMessage = STATUS_MESSAGE.CREATED;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IFileBeta | null }>;
} = {
  POST: (req, res) => withRequestValidation(APIName.FILE_UPLOAD, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFileBeta | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFileBeta | null = null;

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
    const { httpCode, result } = formatApiResponse<IFileBeta | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
