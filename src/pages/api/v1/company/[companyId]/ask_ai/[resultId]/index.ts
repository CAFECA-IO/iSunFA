import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse, isParamString } from '@/lib/utils/common';
import { ILineItem, ILineItemFromAICH } from '@/interfaces/line_item';
import { fuzzySearchAccountByName } from '@/lib/utils/repo/account.repo';
import { isILineItem } from '@/lib/utils/type_guard/line_item';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IContract } from '@/interfaces/contract';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getAichUrl } from '@/lib/utils/aich';
import { AICH_APIS_TYPES } from '@/constants/aich';
import { STATUS_MESSAGE } from '@/constants/status_code';

type ApiResponseType = IVoucherDataForSavingToDB | IContract | null;
// Info: （ 20240522 - Murky）目前只可以使用Voucher Return

export async function fetchResultFromAICH(fetchUrl: string) {
  let response: Response;
  try {
    response = await fetch(fetchUrl);
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
    switch (aiApi) {
      case 'vouchers': {
        const fetchUrl = getAichUrl(AICH_APIS_TYPES.GET_INVOICE_RESULT, resultId);
        const fetchResult = fetchResultFromAICH(fetchUrl);
        const { lineItems: rawLineItems } = (await getPayloadFromResponseJSON(fetchResult)) as {
          lineItems: ILineItemFromAICH[];
        };

        const lineItems = await formatLineItemsFromAICH(rawLineItems);
        const voucher = {
          lineItems,
        } as IVoucherDataForSavingToDB;
        if (!isIVoucherDataForSavingToDB(voucher)) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
          break;
        }
        payload = voucher;
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        break;
      }
      case 'contracts': {
        const fetchUrl = getAichUrl(AICH_APIS_TYPES.GET_INVOICE_RESULT, resultId);
        const fetchResult = fetchResultFromAICH(fetchUrl);
        payload = (await fetchResult) as IContract;
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    }
  }

  return {
    payload,
    statusMessage,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  let payload: IVoucherDataForSavingToDB | IContract | null = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          const result = await handleGetRequest(req);
          payload = result.payload;
          statusMessage = result.statusMessage;
          break;
        }
        default: {
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          break;
        }
      }
    } catch (_error) {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  const { httpCode, result } = formatApiResponse(statusMessage, payload);
  res.status(httpCode).json(result);
}
