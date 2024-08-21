import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse, isParamString } from '@/lib/utils/common';
import { ILineItem, ILineItemFromAICH } from '@/interfaces/line_item';
import { fuzzySearchAccountByName } from '@/pages/api/v1/company/[companyId]/ask_ai/[resultId]/index.repository';
import { isILineItem } from '@/lib/utils/type_guard/line_item';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IContract } from '@/interfaces/contract';
import { AICH_URI } from '@/constants/config';

type ApiResponseType = IVoucherDataForSavingToDB | IContract | null;

async function fetchResultFromAICH(aiApi: string, resultId: string) {
  let response: Response;
  try {
    response = await fetch(`${AICH_URI}/api/v1/${aiApi}/${resultId}/result`);
  } catch (error) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }
  if (response.status === 404) {
    throw new Error(STATUS_MESSAGE.AICH_API_NOT_FOUND);
  }
  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }
  return response.json() as Promise<{ payload?: unknown } | null>;
}

async function getPayloadFromResponseJSON(responseJSON: Promise<{ payload?: unknown } | null>) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload;
}

async function formatLineItemsFromAICH(rawLineItems: ILineItemFromAICH[]) {
  const lineItems = await Promise.all(
    rawLineItems.map(async (rawLineItem) => {
      const { lineItemIndex, account, description, debit, amount } = rawLineItem;
      const accountInDB = await fuzzySearchAccountByName(account);

      if (!accountInDB) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }

      const resultAccount = {
        lineItemIndex,
        account: accountInDB?.name || account,
        description,
        debit,
        amount,
        accountId: accountInDB?.id || 0,
      } as ILineItem;

      if (!isILineItem(resultAccount)) {
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }
      return resultAccount;
    })
  );
  return lineItems;
}

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IVoucherDataForSavingToDB | IContract | null = null;
  const { resultId, aiApi = 'vouchers' } = req.query;

  if (!isParamString(resultId) || !isParamString(aiApi)) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const fetchResult = fetchResultFromAICH(aiApi, resultId);

    switch (aiApi) {
      case 'vouchers': {
        const { lineItems: rawLineItems } = (await getPayloadFromResponseJSON(fetchResult)) as {
          lineItems: ILineItemFromAICH[];
        };

        const lineItems = await formatLineItemsFromAICH(rawLineItems);
        const voucher = {
          lineItems,
        } as IVoucherDataForSavingToDB;
        if (!isIVoucherDataForSavingToDB(voucher)) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        } else {
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          payload = voucher;
        }
        break;
      }
      case 'contracts': {
        payload = (await fetchResult) as IContract;
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ApiResponseType }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ApiResponseType = null;

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
    const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
