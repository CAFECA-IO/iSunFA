import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAccountingSetting } from '@/interfaces/accounting_setting';

// ToDo: (20240924 - Jacky) Implement the logic to get the accounting settings data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Implement the logic to get the accounting settings data from the database
  // ToDo: (20240924 - Jacky) Format the accounting settings data to the IAccountingSetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  payload = {
    companyId: 1,
    companyName: 'Company A',
    taxSettings: {
      salesTax: { taxable: true, rate: 0.07 },
      purchaseTax: { taxable: true, rate: 0.05 },
      returnPeriodicity: 'Monthly',
    },
    currency: 'USD',
    lastDayOfFiscalYear: 31,
    shortcutList: [
      {
        action: {
          name: 'Save',
          description: 'Save the current document',
          fieldList: [{ name: 'Ctrl', value: 'S' }],
        },
        keyList: ['Ctrl', 'S'],
      },
    ],
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

// ToDo: (20240924 - Jacky) Implement the logic to create a new accounting setting in the database
async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Validate the request body
  // ToDo: (20240924 - Jacky) Implement the logic to create a new accounting setting in the database
  // ToDo: (20240924 - Jacky) Format the accounting settings data to the IAccountingSetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  const newSetting: IAccountingSetting = {
    companyId: 2,
    companyName: req.body.companyName,
    taxSettings: req.body.taxSettings,
    currency: req.body.currency,
    lastDayOfFiscalYear: req.body.lastDayOfFiscalYear,
    shortcutList: req.body.shortcutList,
  };

  payload = newSetting;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAccountingSetting | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountingSetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

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
    const { httpCode, result } = formatApiResponse<IAccountingSetting | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
