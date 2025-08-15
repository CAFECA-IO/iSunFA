import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IAIResultVoucher } from '@/interfaces/voucher';
import { EventType } from '@/constants/account';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { AI_TYPE } from '@/constants/aich';
import { fetchResultFromAICH, formatLineItemsFromAICH } from '@/lib/utils/aich';
import { ISessionData } from '@/interfaces/session';
import { fuzzySearchCounterpartyByName } from '@/lib/utils/repo/counterparty.repo';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { IAIInvoice, IInvoiceEntity } from '@/interfaces/invoice';
import { createManyInvoice } from '@/lib/utils/repo/invoice.repo';
import { DefaultValue } from '@/constants/default_value';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';

// ToDo: (20241128 - Luphia) Check this API carefully

type CertificateAiResponse = {
  aiType: AI_TYPE; // Info: (20241107 - Murky) For zod discriminator
  [key: string]: unknown;
};

// ToDo: (20241126 - Jacky) Should be moved to interfaces with valid type
type APIResponse = IAIResultVoucher | CertificateAiResponse | null;

const DEFAULT_STATUS_MESSAGE = STATUS_MESSAGE.BAD_REQUEST;
const DEFAULT_PAYLOAD = null;

// Info: (20241004 - Murky) Handler for the 'certificate' endpoint
async function certificateHandler(key: AI_TYPE, resultId: string, session: ISessionData) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  const resultFromAI = await fetchResultFromAICH(key, resultId);
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;

  if (resultFromAI.payload && resultFromAI.payload.length > 0) {
    const { payload: aiPayload } = resultFromAI;
    const { status, value } = aiPayload;
    const { accountBookId } = session;
    const invoiceList: IInvoiceEntity[] = await Promise.all(
      value.map(async (invoice: IAIInvoice) => {
        const counterparty = await fuzzySearchCounterpartyByName(
          invoice.counterpartyName,
          accountBookId
        );
        const nowTimestamp = getTimestampNow();
        const certificateParsedResult = {
          certificateId: invoice.certificateId || DefaultValue.CERTIFICATE_ID.UNKNOWN,
          counterPartyId: counterparty?.id || DefaultValue.COUNTER_PARTY_ID.PROCESSING,
          inputOrOutput: invoice.inputOrOutput || InvoiceTransactionDirection.INPUT,
          date: invoice.date || nowTimestamp,
          no: invoice.no || 'AI00000000',
          currencyAlias: invoice.currencyAlias || CurrencyType.TWD,
          priceBeforeTax: invoice.priceBeforeTax || 0,
          taxType: invoice.taxType || InvoiceTaxType.TAXABLE,
          taxRatio: invoice.taxRatio || 5,
          taxPrice: invoice.taxPrice || 0,
          totalPrice: invoice.totalPrice || 0,
          type: invoice.type || InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
          deductible: invoice.deductible || false,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        };
        return certificateParsedResult;
      })
    );

    const { count } = await createManyInvoice(invoiceList);
    payload = {
      aiStatus: status,
      aiType: AI_TYPE.CERTIFICATE,
      count,
    };
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Handler for the 'voucher' endpoint
async function voucherHandler(key: AI_TYPE, resultId: string, session: ISessionData) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  const { accountBookId: companyId } = session;

  const resultFromAI = await fetchResultFromAICH(key, resultId);
  if (resultFromAI) {
    const { payload: aiPayload } = resultFromAI;
    const { status, value } = aiPayload;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    const counterpartyFromDB = await fuzzySearchCounterpartyByName(
      value.counterpartyName,
      companyId
    );
    const counterparty = counterpartyFromDB
      ? parsePrismaCounterPartyToCounterPartyEntity(counterpartyFromDB)
      : null;
    const lineItems = await formatLineItemsFromAICH(value.lineItems);

    const nowTimestamp = getTimestampNow();
    const voucher: IAIResultVoucher = {
      aiStatus: status,
      aiType: AI_TYPE.VOUCHER,
      voucherDate: value.date || nowTimestamp, // Info: (20241107 - Murky) AI必須轉換出來
      type: value.type || EventType.INCOME, // Info: (20241107 - Murky) 可以讓AI轉換
      note: value.note || 'this is note',
      counterParty: counterparty || PUBLIC_COUNTER_PARTY,
      lineItems,
    };

    // Info: (20241004 - Murky) Populate the payload with voucher details
    payload = voucher;
  } else {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Map of handlers for different request types
const getHandlers: {
  [key: string]: (
    key: AI_TYPE,
    resultId: string,
    session: ISessionData
  ) => Promise<{
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
  session,
}) => {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) If query is valid, call the appropriate handler
  const { reason, resultId } = query;
  const postHandler = getHandlers[reason];
  ({ statusMessage, payload } = await postHandler(reason, resultId, session));

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
  GET: (req) => withRequestValidation(APIName.ASK_AI_RESULT_V2, req, handleGetRequest),
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
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }

  // Info: (20241004 - Murky) Format and send the response
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
