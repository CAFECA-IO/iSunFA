import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompanyAndRole } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder } from '@/constants/file';
import { IPaginatedData } from '@/interfaces/pagination';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  createCompanyAndRole,
  getCompanyAndRoleByTaxId,
  listCompanyAndRole,
} from '@/lib/utils/repo/admin.repo';
import { Company, Role, File } from '@prisma/client';

const handleGetRequest: IHandleRequest<
  APIName.LIST_USER_COMPANY,
  IPaginatedData<
    Array<{
      company: Company & { imageFile: File | null };
      role: Role;
      tag: string;
      order: number;
    }>
  >
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<
    Array<{
      company: Company & { imageFile: File | null };
      role: Role;
      tag: string;
      order: number;
    }>
  > | null = null;
  const { userId, pageSize, page, searchQuery } = query;

  const listedCompanyAndRole = await listCompanyAndRole(userId, page, pageSize, searchQuery);
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  payload = listedCompanyAndRole;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<
  APIName.CREATE_USER_COMPANY,
  {
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
  }
> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
  } | null = null;
  const { userId } = query;
  const { taxId, name, tag } = body;

  const getCompany = await getCompanyAndRoleByTaxId(userId, taxId);

  if (getCompany) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_COMPANY;
  } else {
    const companyIcon = await generateIcon(name);
    const nowInSecond = getTimestampNow();
    const imageName = name + '_icon' + nowInSecond;
    const file = await createFile({
      name: imageName,
      size: companyIcon.size,
      mimeType: companyIcon.mimeType,
      type: FileFolder.TMP,
      url: companyIcon.iconUrl,
      isEncrypted: false,
      encryptedSymmetricKey: '',
    });
    if (file) {
      const createdCompanyAndRole = await createCompanyAndRole(userId, taxId, name, file.id, tag);
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = createdCompanyAndRole;

      const companyId = createdCompanyAndRole.company.id;
      const companyKeyPair = await generateKeyPair();
      await storeKeyByCompany(companyId, companyKeyPair);
    }
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ICompanyAndRole | IPaginatedData<ICompanyAndRole[]> | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.LIST_USER_COMPANY, req, res, handleGetRequest),
  POST: (req, res) =>
    withRequestValidation(APIName.CREATE_USER_COMPANY, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyAndRole | IPaginatedData<ICompanyAndRole[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanyAndRole | IPaginatedData<ICompanyAndRole[]> | null = null;

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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<
      ICompanyAndRole | IPaginatedData<ICompanyAndRole[]> | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
