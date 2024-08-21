import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
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

export async function getPayloadFromResponseJSON(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    // Deprecated: （ 20240522 - Murky）Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
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
        // Deprecated: （ 20240522 - Murkky）Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`Account ${account} not found in database`);
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
        // Deprecated: （ 20240522 - Murky）Debugging purpose
        // eslint-disable-next-line no-console
        console.log(`LineItem ${account} is not valid`);
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }
      return resultAccount;
    })
  );
  return lineItems;
}

export async function handleGetRequest(req: NextApiRequest) {
  let payload: IVoucherDataForSavingToDB | IContract | null = null;
  const { resultId, aiApi = 'vouchers' } = req.query;
  // Info Murky (20240416): Check if resultId is string
  if (!isParamString(resultId) || !isParamString(aiApi)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

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
        // Deprecated: （ 20240522 - Murky）Debugging purpose
        // eslint-disable-next-line no-console
        console.log('Voucher is not valid');
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      }
      payload = voucher;
      break;
    }
    case 'contracts': {
      // Todo (20240625 - Jacky): Implement contract return
      const fetchUrl = getAichUrl(AICH_APIS_TYPES.GET_INVOICE_RESULT, resultId);
      const fetchResult = fetchResultFromAICH(fetchUrl);
      payload = (await fetchResult) as IContract;
      break;
    }
    default:
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  return payload;
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
        case "GET": {
          payload = await handleGetRequest(req);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          break;
        }
        default: {
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          break;
        }
      }
    } catch (_error) {
      const error = _error as Error;
      // Deprecated: （ 20240522 - Murky）Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  const { httpCode, result } = formatApiResponse(statusMessage, payload);
  res.status(httpCode).json(result);
}
