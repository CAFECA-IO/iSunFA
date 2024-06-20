// Info (20240620 - Murky): 暫時先拆分出不同檔案，避免merge時造成衝突
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { checkAdmin } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { assertIsNumber } from '@/lib/utils/type_guard/common';
import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm } from '@/lib/utils/parse_image_form';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import { AICH_URI } from '@/constants/config';

// Info (20240424 - Murky): To use formidable, bodyParser must be turned off
export const config = {
  api: {
    bodyParser: false,
  },
};

// Depreciated (20240620 - Murky): This function should do other things if not pass session check
async function getCompanyIdFromSession(req: NextApiRequest, res: NextApiResponse) {
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  assertIsNumber(companyId);
  return companyId;
}

export async function readFileFromFilePath(file: formidable.File): Promise<Blob> {
  const fileContent = await fs.readFile(file.filepath);
  return new Blob([fileContent], { type: file.mimetype || undefined });
}

export function isFileMimeTypeAllowed(file: formidable.File): boolean {
  // Info (20240620 - Murky): This function can be used to check if the file is allow to post to AICH
  // But now every mime type is allowed
  if (!file.mimetype) {
    return false;
  }

  // const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  // return allowedMimeTypes.includes(file.mimetype);
  return true;
}

export function isAllFilesMimeTypeAllowed(files: formidable.File[]): boolean {
  return files.every(isFileMimeTypeAllowed);
}

export function getFileName(file: formidable.File) {
  return file.filepath.split('/').pop() || 'unknown';
}

export function createFileFormData(formKeyName: string, fileBlob: Blob, fileName: string) {
  const formData = new FormData();
  formData.append(`${formKeyName}`, fileBlob);
  formData.append(`${formKeyName}Name`, fileName);
  return formData;
}

async function getFormidableFileFromFormData(req: NextApiRequest): Promise<formidable.Files<string>> {
  let files: formidable.Files;

  try {
    const parsedForm = await parseForm(req);
    files = parsedForm.files;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
  }
  return files;
}

function reshapeFormidableFilesToArray(files: formidable.Files<string>): formidable.File[] {
  const filesArray = Object.values(files).filter(Boolean) as formidable.File[][]; // filter out undefined values

  if (!Array.isArray(filesArray)) {
    return [];
  }

  const fileArray = filesArray.flat(1).filter((file) => file instanceof formidable.File);
  return fileArray;
}

export async function postOneFileToAICH(
  formData: FormData,
  aichUrl: string
) {
  let response: Response;
  try {
    // Info: (20240620 - Murky) url be like : `${AICH_URI}/api/v1/ocr/upload`
    response = await fetch(aichUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

export async function getPayloadFromResponseJSON<T>(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as T;
}

async function handlePostOneFileToAICH(file: formidable.File, formKeyName: string, aichUrl: string) {
  const fileBlob = await readFileFromFilePath(file);
  const fileName = getFileName(file);

  const formData = createFileFormData(formKeyName, fileBlob, fileName);
  const postResult = postOneFileToAICH(formData, aichUrl);
  const resultStatus: unknown = await getPayloadFromResponseJSON<unknown>(postResult);
}

async function handlePostRequest(companyId:number, req: NextApiRequest) {
  const formidableFiles = await getFormidableFileFromFormData(req);
  const files = reshapeFormidableFilesToArray(formidableFiles);

  if (!isAllFilesMimeTypeAllowed(files)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_FORM_DATA_FILES);
  }
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<unknown>(
    message,
    {} as unknown
  );
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<unknown>>
) {
  try {
    const companyId = await getCompanyIdFromSession(req, res);
    switch (req.method) {
      case 'POST': {
        const { httpCode, result } = await handlePostRequest(companyId, req);
        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    handleErrorResponse(res, error.message);
  }
}
