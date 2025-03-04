import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountBookForUser } from '@/interfaces/account_book';
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
  listCompanyAndRoleSimple,
} from '@/lib/utils/repo/admin.repo';
import { Company, Role, File } from '@prisma/client';
import { createAccountingSetting } from '@/lib/utils/repo/accounting_setting.repo';

const handleGetRequest: IHandleRequest<
  APIName.LIST_USER_COMPANY,
  | Array<{
      company: Company & { imageFile: File | null };
      role: Role;
      tag: string;
      order: number;
    }>
  | IPaginatedData<
      Array<{
        company: Company & { imageFile: File | null };
        role: Role;
        tag: string;
        order: number;
      }>
    >
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | Array<{
        company: Company & { imageFile: File | null };
        role: Role;
        tag: string;
        order: number;
      }>
    | IPaginatedData<
        Array<{
          company: Company & { imageFile: File | null };
          role: Role;
          tag: string;
          order: number;
        }>
      >
    | null = null;
  const { simple, userId, pageSize, page, searchQuery } = query;
  if (simple) {
    const listedCompanyAndRole = await listCompanyAndRoleSimple(userId);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = listedCompanyAndRole;
  } else {
    const listedCompanyAndRole = await listCompanyAndRole(userId, page, pageSize, searchQuery);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = listedCompanyAndRole;
  }

  return { statusMessage, payload };
};

/* Info: (20250124 - Shirley) 建立帳本
 * 1. 搜尋是帳號下是否有相同統編的公司帳本，若有則取消創建
 * 2. 建立公司帳本 icon
 * 3. 建立將此用戶設定為公司帳本管理者角色
 * 4. 建立帳本公私鑰對用於加解密
 * 5. 建立公司設定
 */
const handlePostRequest: IHandleRequest<
  APIName.CREATE_USER_COMPANY,
  {
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
    teamId: number;
    // isPrivate: boolean;
  }
> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    company: Company & { imageFile: File | null };
    role: Role;
    tag: string;
    order: number;
    teamId: number;
    // isPrivate: boolean;
  } | null = null;
  const { userId } = query;
  const { taxId, name, tag, teamId, isPrivate } = body;

  // Info: (20250124 - Shirley) Step 1.
  const getCompany = await getCompanyAndRoleByTaxId(userId, taxId);

  if (getCompany) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_COMPANY;
  } else {
    // Info: (20250124 - Shirley) Step 2.
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
      // Info: (20250124 - Shirley) Step 3.
      const teamIdParam = teamId ?? undefined;
      const result = await createCompanyAndRole(
        userId,
        taxId,
        name,
        file.id,
        tag,
        isPrivate,
        undefined,
        teamIdParam
      );
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = result;

      const companyId = result.company.id;
      // Info: (20250124 - Shirley) Step 4.
      const companyKeyPair = await generateKeyPair();
      await storeKeyByCompany(companyId, companyKeyPair);
      // Info: (20250124 - Shirley) Step 5.
      await createAccountingSetting(companyId);
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
      | IAccountBookForUser
      | IAccountBookForUser[]
      | IPaginatedData<IAccountBookForUser[]>
      | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.LIST_USER_COMPANY, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.CREATE_USER_COMPANY, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<
      IAccountBookForUser | IAccountBookForUser[] | IPaginatedData<IAccountBookForUser[]> | null
    >
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | IAccountBookForUser
    | IAccountBookForUser[]
    | IPaginatedData<IAccountBookForUser[]>
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
      IAccountBookForUser | IAccountBookForUser[] | IPaginatedData<IAccountBookForUser[]> | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
