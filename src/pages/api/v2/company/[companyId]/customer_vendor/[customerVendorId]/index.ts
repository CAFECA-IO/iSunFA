import { NextApiRequest, NextApiResponse } from 'next';
import { ICustomerVendor } from '@/interfaces/customer_vendor';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';

// ToDo: (20240925 - Jacky) Implement the logic to get the customer/vendor data from the database
async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICustomerVendor | null = null;

  // const session = await getSession(req, res);
  // const { userId, companyId } = session;

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
  const customerVendorIdNum = convertStringToNumber(req.query.customerVendorId);
  const customerVendor = {
    id: customerVendorIdNum,
    companyId: 1,
    name: 'Test Client',
    taxId: '123456',
    type: 'Customer',
    note: 'Test Note',
    createdAt: 123456,
    updatedAt: 123456,
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  payload = customerVendor;
  //   }
  // }

  return { statusMessage, payload };
}

// ToDo: (20240925 - Jacky) Implement the logic to update the customer/vendor record in the database
async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICustomerVendor | null = null;

  // const session = await getSession(req, res);
  // const { userId, companyId } = session;

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
  const customerVendorIdNum = convertStringToNumber(req.query.customerVendorId);
  const { name, taxId, type, note } = req.body;
  // ToDo: (20240925 - Jacky) Validate the request body
  const updatedCustomerVendor = {
    id: customerVendorIdNum,
    companyId: 1,
    name,
    taxId,
    type,
    note,
    createdAt: 123456,
    updatedAt: 123456,
  };
  if (!updatedCustomerVendor) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedCustomerVendor;
  }
  //   }
  // }

  return { statusMessage, payload };
}

// ToDo: (20240925 - Jacky) Implement the logic to delete the customer/vendor record in the database
async function handleDeleteRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICustomerVendor | null = null;

  // const session = await getSession(req, res);
  // const { userId, companyId } = session;

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
  const customerVendorIdNum = convertStringToNumber(req.query.customerVendorId);
  const deletedcustomerVendor = {
    id: customerVendorIdNum,
    companyId: 1,
    name: 'Test Client',
    taxId: '123456',
    type: 'Customer',
    note: 'Test Note',
    createdAt: 123456,
    updatedAt: 123456,
  };
  if (!deletedcustomerVendor) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = deletedcustomerVendor;
  }
  //   }
  // }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICustomerVendor | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICustomerVendor | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICustomerVendor | null = null;

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
    const { httpCode, result } = formatApiResponse<ICustomerVendor | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
