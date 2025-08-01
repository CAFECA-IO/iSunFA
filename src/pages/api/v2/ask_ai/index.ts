import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { ProgressStatus } from '@/constants/account';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IAskResult } from '@/interfaces/ask_ai';
import { AI_TYPE } from '@/constants/aich';
import { fetchResultIdFromAICH } from '@/lib/utils/aich';
import loggerBack from '@/lib/utils/logger_back';
import { listFileByIdList } from '@/lib/utils/repo/file.repo';
import { readFile } from 'fs/promises';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import { bufferToBlob } from '@/lib/utils/parse_image_form';

// ToDo: (20241128 - Luphia) Check this API carefully
const handleCertificateRequest = async (
  accountBookId: number,
  key: AI_TYPE,
  targetIdList: number[]
) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  const fileList = await listFileByIdList(targetIdList);

  const fileBlobList = await Promise.all(
    fileList.map(async (file) => {
      const filePath = parseFilePathWithBaseUrlPlaceholder(file.url);
      // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: API 讀取本地)
      const fileBuffer = await readFile(filePath);
      const decryptFileBuffer = await decryptImageFile({
        imageBuffer: fileBuffer,
        file,
        companyId: accountBookId,
      });
      const decryptFileBlob = bufferToBlob(decryptFileBuffer, file.mimeType);
      return decryptFileBlob;
    })
  );

  const formData = new FormData();
  fileBlobList.forEach((fileBlob) => {
    formData.append('image', fileBlob);
  });

  try {
    const resultId = await fetchResultIdFromAICH(key, formData);

    statusMessage = STATUS_MESSAGE.CREATED;
    payload = {
      reason: key,
      resultId,
      progressStatus: ProgressStatus.IN_PROGRESS,
    };
  } catch (error) {
    statusMessage = STATUS_MESSAGE.AICH_API_NOT_FOUND;
    loggerBack.error(error);
  }

  return { statusMessage, payload };
};

const handleVoucherRequest = async (
  accountBookId: number,
  key: AI_TYPE,
  targetIdList: number[]
) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  const fileList = await listFileByIdList(targetIdList);

  const fileBlobList = await Promise.all(
    fileList.map(async (file) => {
      const filePath = parseFilePathWithBaseUrlPlaceholder(file.url);
      // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: API 讀取本地)
      const fileBuffer = await readFile(filePath);
      const decryptFileBuffer = await decryptImageFile({
        imageBuffer: fileBuffer,
        file,
        companyId: accountBookId,
      });
      const decryptFileBlob = bufferToBlob(decryptFileBuffer, file.mimeType);
      return decryptFileBlob;
    })
  );

  const formData = new FormData();
  fileBlobList.forEach((fileBlob) => {
    formData.append('image', fileBlob);
  });

  try {
    const resultId = await fetchResultIdFromAICH(key, formData);

    statusMessage = STATUS_MESSAGE.CREATED;
    payload = {
      reason: key,
      resultId,
      progressStatus: ProgressStatus.IN_PROGRESS,
    };
  } catch (error) {
    statusMessage = STATUS_MESSAGE.AICH_API_NOT_FOUND;
    loggerBack.error(error);
  }

  return { statusMessage, payload };
};

const postHandlers: {
  [key: string]: (
    companyId: number,
    key: AI_TYPE,
    targetIdList: number[]
  ) => Promise<{ statusMessage: string; payload: IAskResult | null }>;
} = {
  certificate: handleCertificateRequest,
  voucher: handleVoucherRequest,
};

export const handlePostRequest: IHandleRequest<APIName.ASK_AI_V2, IAskResult | null> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  const { reason } = query;
  const { targetIdList } = body;
  const { accountBookId } = session;

  const postHandler = postHandlers[reason];
  ({ statusMessage, payload } = await postHandler(accountBookId, reason, targetIdList));

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAskResult | null }>;
} = {
  POST: (req) => withRequestValidation(APIName.ASK_AI_V2, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAskResult | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    loggerBack.error(error);
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IAskResult | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
