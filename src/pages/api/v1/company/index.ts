import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { IRole } from '@/interfaces/role';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import {
  formatCompanyAndRole,
  formatCompanyAndRoleList,
} from '@/lib/utils/formatter/admin.formatter';
import {
  createCompanyAndRole,
  getCompanyAndRoleByTaxId,
  listCompanyAndRole,
} from '@/lib/utils/repo/admin.repo';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder } from '@/constants/file';

async function checkInput(code: string, name: string, regional: string): Promise<boolean> {
  return !!code && !!name && !!regional;
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<Array<{ company: ICompany; role: IRole }> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Array<{ company: ICompany; role: IRole }> | null = null;
  const session = await getSession(req, res);
  const { userId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const paginatedCompanyAndRole = await listCompanyAndRole(userId);
      const companyAndRoleList = formatCompanyAndRoleList(paginatedCompanyAndRole.data);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = companyAndRoleList;
    }
  }

  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<{ company: ICompany; role: IRole } | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { company: ICompany; role: IRole } | null = null;
  const { code, name, regional } = req.body;
  const isValid = await checkInput(code, name, regional);

  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId } = session;

    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });

      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        // Info: (20240902 - Jacky) Check if company already exist in database
        const getCompanyAndRole = await getCompanyAndRoleByTaxId(userId, code);

        if (getCompanyAndRole) {
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
            // Info: (20240830 - Murky) 將圖片存放在database之後connect company
            const createdCompanyAndRole = await createCompanyAndRole(userId, code, name, file?.id);
            const newCompanyAndRole = formatCompanyAndRole(createdCompanyAndRole);
            statusMessage = STATUS_MESSAGE.CREATED;
            payload = newCompanyAndRole;

            // Info: (20240827 - Murky) Generate Company Key , only new company will generate key
            const companyId = createdCompanyAndRole.company.id;

            const companyKeyPair = await generateKeyPair();
            await storeKeyByCompany(companyId, companyKeyPair);
          }
        }
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: { company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }> | null;
  }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<
      { company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }> | null
    >
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | { company: ICompany; role: IRole }
    | Array<{ company: ICompany; role: IRole }>
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
      { company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }> | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
