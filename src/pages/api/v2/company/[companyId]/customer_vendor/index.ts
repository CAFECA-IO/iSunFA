import { NextApiRequest, NextApiResponse } from 'next';
import { ICustomerVendor } from '@/interfaces/customer_vendor';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { IPaginatedData } from '@/interfaces/pagination';

// ToDo: (20240925 - Jacky) Implement the logic to get the customer/vendor data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICustomerVendor[]> | null = null;
  // ToDo: (20240925 - Jacky) Get session data from the request
  // const session = await getSession(req, res);
  // const { userId, companyId } = session;

  // ToDo: (20240925 - Jacky) Check if the user is authorized to access this API
  // if (!userId) {
  //   statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  // } else {
  //   const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
  //     userId,
  //     companyId,
  //   });
  //   if (!isAuth) {
  //     statusMessage = STATUS_MESSAGE.FORBIDDEN;
  //   } else {
  const customerVendorList: IPaginatedData<ICustomerVendor[]> = {
    data: [
      {
        id: 1,
        companyId: 1,
        name: 'Test Customer',
        taxId: '123456',
        type: 'Customer',
        note: 'Test Note',
        createdAt: 123456,
        updatedAt: 123456,
      },
      {
        id: 2,
        companyId: 1,
        name: 'Test Vendor',
        taxId: '123456',
        type: 'Vendor',
        note: 'Test Note',
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
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = customerVendorList;
  //   }
  // }

  return { statusMessage, payload };
}

// ToDo: (20240925 - Jacky) Implement the logic to create a new customer/vendor record in the database
async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICustomerVendor | null = null;

  const { name, taxId, type, note } = req.body;
  // ToDo: (20240925 - Jacky) Validate the request body
  // const isValid = checkInput(name, taxId, favorite);

  // if (!isValid) {
  //   statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  // } else {
  //   const session = await getSession(req, res);
  //   const { userId, companyId } = session;

  //   if (!userId) {
  //     statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  //   } else {
  //     const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], {
  //       userId,
  //       companyId,
  //     });
  //     if (!isAuth) {
  //       statusMessage = STATUS_MESSAGE.FORBIDDEN;
  //     } else {
  const newClient = {
    id: 3,
    companyId: 1,
    name,
    taxId,
    type,
    note,
    createdAt: 123456,
    updatedAt: 123456,
  };
  statusMessage = STATUS_MESSAGE.CREATED;
  payload = newClient;
  //     }
  //   }
  // }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ICustomerVendor | IPaginatedData<ICustomerVendor[]> | null;
  }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICustomerVendor | IPaginatedData<ICustomerVendor[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICustomerVendor | IPaginatedData<ICustomerVendor[]> | null = null;

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
      ICustomerVendor | IPaginatedData<ICustomerVendor[]> | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
