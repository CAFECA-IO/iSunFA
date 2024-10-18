import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
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
import { IRole } from '@/interfaces/role';
import {
  formatCompanyAndRole,
  formatCompanyAndRoleList,
} from '@/lib/utils/formatter/admin.formatter';

const handleGetRequest: IHandleRequest<
  APIName.COMPANY_LIST,
  IPaginatedData<{ company: ICompany; role: IRole }[]>
> = async ({ query, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<{ company: ICompany; role: IRole }[]> | null = null;
  const { pageSize, targetPage } = query;
  const { userId } = session;

  const listedCompanyAndRole = await listCompanyAndRole(userId, targetPage, pageSize);
  const companyList = {
    ...listedCompanyAndRole,
    data: formatCompanyAndRoleList(listedCompanyAndRole.data),
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  payload = companyList;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<
  APIName.COMPANY_ADD,
  { company: ICompany; role: IRole }
> = async ({ body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { company: ICompany; role: IRole } | null = null;
  const { taxId, name, tag } = body;
  const { userId } = session;

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
      const newCompanyAndRole = formatCompanyAndRole(createdCompanyAndRole);
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = newCompanyAndRole;

      const companyId = newCompanyAndRole.company.id;
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
    payload:
      | { company: ICompany; role: IRole }
      | IPaginatedData<{ company: ICompany; role: IRole }[]>
      | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.COMPANY_LIST, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.COMPANY_ADD, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<
      | { company: ICompany; role: IRole }
      | IPaginatedData<{ company: ICompany; role: IRole }[]>
      | null
    >
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | { company: ICompany; role: IRole }
    | IPaginatedData<{ company: ICompany; role: IRole }[]>
    | null = null;

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
      | { company: ICompany; role: IRole }
      | IPaginatedData<{ company: ICompany; role: IRole }[]>
      | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
