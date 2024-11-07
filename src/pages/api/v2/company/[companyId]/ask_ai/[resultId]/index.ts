import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IVoucherEntity } from '@/interfaces/voucher';
import { JOURNAL_EVENT } from '@/constants/journal';
import { AccountType, EventType } from '@/constants/account';
import { CounterpartyType } from '@/constants/counterparty';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { AI_TYPE } from '@/constants/aich';

type CertificateAiResponse = {
  aiType: AI_TYPE; // Info: (20241107 - Murky) For zod discriminator
  [key: string]: unknown;
};

type VoucherAiResponse = IVoucherEntity & {
  aiType: AI_TYPE; // Info: (20241107 - Murky) For zod discriminator
  counterParty: ICounterPartyEntity;
  lineItems: (ILineItemEntity & { account: IAccountEntity })[];
};

// type APIResponse = CertificateAiResponse | VoucherAiResponse | null;
type APIResponse = VoucherAiResponse | CertificateAiResponse | null;

const DEFAULT_STATUS_MESSAGE = STATUS_MESSAGE.BAD_REQUEST;
const DEFAULT_PAYLOAD = null;

// Info: (20241004 - Murky) Mock promise to simulate fetching AI result
const mockFetchAIResult = new Promise((resolve) => {
  resolve(true);
});

// Info: (20241004 - Murky) Handler for the 'certificate' endpoint
async function certificateHandler() {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Simulate fetching data from an AI service
  const resultFromAI = await mockFetchAIResult;
  if (resultFromAI) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;

    // Info: (20241004 - Murky) Populate the payload with certificate details
    payload = {
      aiType: AI_TYPE.CERTIFICATE,
      inputOrOutput: 'input',
      certificateDate: 10000001, // Info: (20241004 - Murky) Example certificate date
      certificateNo: 'AB-12345678', // Info: (20241004 - Murky) Certificate number
      currencyAlias: 'TWD', // Info: (20241004 - Murky) Currency code
      priceBeforeTax: 4000, // Info: (20241004 - Murky) Price before tax
      taxRatio: 5, // Info: (20241004 - Murky) Tax percentage
      taxPrice: 200, // Info: (20241004 - Murky) Tax amount
      totalPrice: 4200, // Info: (20241004 - Murky) Total price including tax
      counterPartyId: 1, // Info: (20241004 - Murky) ID of the counterparty
      invoiceType: 'triplicate_uniform_invoice', // Info: (20241004 - Murky) Type of invoice
      deductible: true, // Info: (20241004 - Murky) Whether the amount is deductible
    };
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Handler for the 'voucher' endpoint
// ASK_AI_RESULT_V2 希望可以回 IAIResultVoucher
async function voucherHandler() {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Simulate fetching data from an AI service
  const resultFromAI = await mockFetchAIResult;
  if (resultFromAI) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;

    /**
     * Info: (20241107 - Murky)
     * @description 需要在AI回傳Counterparty 公司之後，從database裡面撈一個公司出來
     */
    const mockCounterParty: ICounterPartyEntity = {
      id: 1,
      companyId: 1003,
      name: '原價屋',
      taxId: '27749036',
      type: CounterpartyType.CLIENT,
      note: '買電腦',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    /**
     * Info: (20241107 - Murky)
     * @description AI回傳account 名稱或是code之後，需要在database 中match一個account出來
     */
    const mockLineItems: (ILineItemEntity & { account: IAccountEntity })[] = [
      {
        id: -1, // Info: (20241107 - Murky) AI拿不到, 寫死
        description: '存入銀行',
        amount: 600,
        debit: true,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 1,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1103',
          name: '銀行存款',
          forUser: true,
          parentCode: '1100',
          rootCode: '1100',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
      {
        id: -1, // Info: (20241107 - Murky) AI拿不到, 寫死
        description: '存入銀行',
        amount: 600,
        debit: true,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 2,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1101',
          name: '庫存現金',
          forUser: true,
          parentCode: '1100',
          rootCode: '1100',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
      {
        id: -1, // Info: (20241107 - Murky) AI拿不到, 寫死
        description: '原價屋',
        amount: 1000,
        debit: false,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 1,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1172',
          name: '應收帳款',
          forUser: true,
          parentCode: '1170',
          rootCode: '1170',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
    ];

    const mockVoucher: VoucherAiResponse = {
      aiType: AI_TYPE.VOUCHER,
      id: -1, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      issuerId: -1, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      counterPartyId: -1, // Info: (20241107 - Murky) AI拿不到, 但是前端要知道, 用fuzzy search
      companyId: -1, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      status: JOURNAL_EVENT.UPLOADED, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      editable: true, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      no: '',
      date: 100000000, // Info: (20241107 - Murky) AI必須轉換出來
      type: EventType.INCOME, // Info: (20241107 - Murky) 可以讓AI轉換
      note: 'this is note',
      counterParty: mockCounterParty,
      createdAt: -1, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      updatedAt: -1, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      deletedAt: null, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      lineItems: mockLineItems, // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      readByUsers: [], // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      originalEvents: [], // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      resultEvents: [], // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      certificates: [], // Info: (20241107 - Murky) AI拿不到, 寫死就可以
      asset: [], // Info: (20241107 - Murky) AI拿不到, 寫死就可以
    };

    // Info: (20241004 - Murky) Populate the payload with voucher details
    payload = mockVoucher;
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Map of handlers for different request types
const getHandlers: {
  [key: string]: () => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  [AI_TYPE.CERTIFICATE]: certificateHandler,
  [AI_TYPE.VOUCHER]: voucherHandler,
};

// Info: (20241004 - Murky) Function to handle GET requests
export const handleGetRequest: IHandleRequest<APIName.ASK_AI_RESULT_V2, APIResponse> = async ({
  query,
}) => {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) If query is valid, call the appropriate handler
  const { reason } = query;
  const postHandler = getHandlers[reason];
  ({ statusMessage, payload } = await postHandler());

  return {
    statusMessage,
    payload,
  };
};

// Info: (20241004 - Murky) Map of method handlers for different HTTP methods

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.ASK_AI_RESULT_V2, req, res, handleGetRequest),
};

// Info: (20241004 - Murky) Main handler function for the API route
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;
  const userId: number = -1;

  try {
    // Info: (20241004 - Murky) Determine the request method and call the appropriate handler
    const method = req.method ?? 'UNKNOWN';
    const handleRequest = methodHandlers[method];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      // Info: (20241004 - Murky) Set status message if method is not allowed
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    // Info: (20241004 - Murky) Handle any errors that occur during request processing
    const error = _error as Error;
    const logger = loggerError(userId, error.name, error.message);
    logger.error({
      error,
      requestMethod: req.method, // Info: (20241004 - Murky) Log the HTTP method
      requestUrl: req.url, // Info: (20241004 - Murky) Log the request URL
      requestBody: '[REDACTED]', // Info: (20241004 - Murky) Mask sensitive information in the request body
      queryParams: req.query, // Info: (20241004 - Murky) Log the query parameters
    });
    statusMessage = error.message;
  }

  // Info: (20241004 - Murky) Format and send the response
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
