import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamString } from '@/lib/utils/common';
import { ILineItem, ILineItemFromAICH } from '@/interfaces/line_item';
import { fuzzySearchAccountByName } from '@/pages/api/v1/company/[companyId]/ask_ai/[resultId]/index.repository';
import { isILineItem } from '@/lib/utils/type_guard/line_item';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';

type ApiResponseType = IVoucherDataForSavingToDB | null;
// Info: （ 20240522 - Murkky）目前只可以使用Voucher Return

export async function fetchResultFromAICH(aiApi: string, resultId: string) {
  let response: Response;
  try {
    response = await fetch(`${AICH_URI}/api/v1/${aiApi}/${resultId}/result`);
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  if (response.status === 404) {
    throw new Error(STATUS_MESSAGE.AICH_API_NOT_FOUND);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

export async function getPayloadFromResponseJSON(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
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
  const { resultId, aiApi = 'vouchers' } = req.query;

  // Info Murky (20240416): Check if resultId is string
  if (!isParamString(resultId) || !isParamString(aiApi)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const fetchResult = fetchResultFromAICH(aiApi, resultId);

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

  const { httpCode, result } = formatApiResponse<ApiResponseType>(
    STATUS_MESSAGE.SUCCESS_GET,
    voucher
  );

  return { httpCode, result };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = await handleGetRequest(req);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    // Deprecated: （ 20240522 - Murky）Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    const { httpCode, result } = formatApiResponse<ApiResponseType>(
      error.message,
      {} as ApiResponseType
    );
    res.status(httpCode).json(result);
  }
}
