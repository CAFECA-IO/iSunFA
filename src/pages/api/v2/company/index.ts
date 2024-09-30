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

// Info: (20240924 - Jacky) Implement the logic to get the company list data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICompany[]> | null = null;
  // const session = await getSession(req, res);
  // const { userId } = session;

  // if (!userId) {
  //   statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  // } else {
  //   const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
  //   if (!isAuth) {
  //     statusMessage = STATUS_MESSAGE.FORBIDDEN;
  //   } else {
  const companyList: IPaginatedData<ICompany[]> = {
    data: [
      {
        id: 1,
        taxId: '123456',
        imageId: '123456',
        name: 'Test Company',
        tag: 'Test',
        startDate: 123456,
        createdAt: 123456,
        updatedAt: 123456,
      },
      {
        id: 2,
        taxId: '123456',
        imageId: '123456',
        name: 'Test Company',
        tag: 'Test',
        startDate: 123456,
        createdAt: 123456,
        updatedAt: 123456,
      },
    ],
    page: 1,
    totalPages: 5,
    totalCount: 23,
    pageSize: 5,
    hasNextPage: true,
    hasPreviousPage: false,
    sort: [
      {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    ],
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  payload = companyList;
  //   }
  // }

  return { statusMessage, payload };
}

// ToDo: (20240924 - Jacky) Implement the logic to create a new company record in the database
async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;
  const { taxId, name, regional } = req.body;
  // const isValid = await checkInput(code, name, regional);

  // if (!isValid) {
  //   statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  // } else {
  //   const session = await getSession(req, res);
  //   const { userId } = session;

  //   if (!userId) {
  //     statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  //   } else {
  //     const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });

  //     if (!isAuth) {
  //       statusMessage = STATUS_MESSAGE.FORBIDDEN;
  //     } else {

  // Info: (20240902 - Jacky) Check if company already exist in database
  const getCompany = null;

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
      // Info: (20240830 - Murky) 將圖片存放在database之後 create company
      const createdCompany = {
        id: 1,
        taxId,
        imageId: '123456',
        name,
        regional,
        tag: 'Test',
        startDate: 123456,
        createdAt: 123456,
        updatedAt: 123456,
      };
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = createdCompany;

      // Info: (20240827 - Murky) Generate Company Key , only new company will generate key
      const companyId = createdCompany.id;

      const companyKeyPair = await generateKeyPair();
      await storeKeyByCompany(companyId, companyKeyPair);
    }
    //     }
    //   }
    // }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ICompany | IPaginatedData<ICompany[]> | null;
  }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | IPaginatedData<ICompany[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | IPaginatedData<ICompany[]> | null = null;

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
    const { httpCode, result } = formatApiResponse<ICompany | IPaginatedData<ICompany[]> | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
