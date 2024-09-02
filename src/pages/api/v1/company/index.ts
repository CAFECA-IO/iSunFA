import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { IRole } from '@/interfaces/role';
import { formatApiResponse } from '@/lib/utils/common';
import {
  formatCompanyAndRole,
  formatCompanyAndRoleList,
} from '@/lib/utils/formatter/admin.formatter';
import { createCompanyAndRole, listCompanyAndRole } from '@/lib/utils/repo/admin.repo';
import { getCompanyByCode } from '@/lib/utils/repo/company.repo';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { connectFileById, createFile } from '@/lib/utils/repo/file.repo';
import { Company } from '@prisma/client';
import { FileDatabaseConnectionType, FileFolder } from '@/constants/file';

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
      const listedCompanyAndRole = await listCompanyAndRole(userId);
      const companyAndRoleList = await formatCompanyAndRoleList(listedCompanyAndRole);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = companyAndRoleList;
    }
  }

  return { statusMessage, payload };
}

async function createFileAndConnectCompany(
  companyIcon: {
    iconUrl: string;
    mimeType: string;
    size: number;
  },
  company: Company
) {
  const { iconUrl, mimeType, size } = companyIcon;
  const imageName = company.name + '_icon';
  const file = await createFile({
    name: imageName,
    companyId: company.id,
    size,
    mimeType,
    type: FileFolder.TMP,
    url: iconUrl,
    isEncrypted: false,
    encryptedSymmetricKey: '',
  });

  if (file) {
    await connectFileById(FileDatabaseConnectionType.COMPANY_IMAGE, file.id, company.id);
  }
  return file;
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
        const getCompany = await getCompanyByCode(code);

        if (getCompany) {
          statusMessage = getCompany.kycStatus
            ? STATUS_MESSAGE.DUPLICATE_COMPANY_KYC_DONE
            : STATUS_MESSAGE.DUPLICATE_COMPANY;
        } else {
          const companyIcon = await generateIcon(name);
          const createdCompanyRoleList = await createCompanyAndRole(userId, code, name, regional);

          // Info: (20240830 - Murky) 將圖片存放在database之後connect company
          await createFileAndConnectCompany(companyIcon, createdCompanyRoleList.company);
          const newCompanyRoleList = await formatCompanyAndRole(createdCompanyRoleList);
          statusMessage = STATUS_MESSAGE.CREATED;
          payload = newCompanyRoleList;

          // Info: (20240827 - Murky) Generate Company Key , only new company will generate key
          const companyId = createdCompanyRoleList.company.id;

          const companyKeyPair = await generateKeyPair();
          await storeKeyByCompany(companyId, companyKeyPair);
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
