import { AICH_URI } from '@/constants/config';
import { AI_TYPE, AICH_APIS_TYPES, AICH_PATH } from '@/constants/aich';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILineItemFromAICH } from '@/interfaces/line_item';
import { fuzzySearchAccountByName } from '@/lib/utils/repo/account.repo';
import loggerBack from '@/lib/utils/logger_back';

/**
 * Generates the URL for the given endpoint.
 *
 * @param endpoint - The endpoint to fetch. Can be "upload" or "process_status".
 * @param aichResultId - The ID required for the "process_status" endpoint. Must be provided if endpoint is "process_status".
 * @returns The complete URL as a string.
 * @throws Will throw an error if `aichResultId` is not provided when endpoint is "process_status".
 */
export function getAichUrl(endPoint: AICH_APIS_TYPES, aichResultId?: string): string {
  switch (endPoint) {
    case AICH_APIS_TYPES.UPLOAD_OCR:
      return `${AICH_URI}/api/v1/ocr/upload`;
    case AICH_APIS_TYPES.GET_OCR_RESULT_ID:
      if (!aichResultId) {
        throw new Error('AICH Result ID is required');
      }
      return `${AICH_URI}/api/v1/ocr/${aichResultId}/process_status`;
    case AICH_APIS_TYPES.GET_OCR_RESULT:
      if (!aichResultId) {
        throw new Error('AICH Result ID is required');
      }
      return `${AICH_URI}/api/v1/ocr/${aichResultId}/result`;
    case AICH_APIS_TYPES.UPLOAD_INVOICE:
      return `${AICH_URI}/api/v1/invoices/upload`;
    case AICH_APIS_TYPES.GET_INVOICE_RESULT_ID:
      if (!aichResultId) {
        throw new Error('AICH Result ID is required');
      }
      return `${AICH_URI}/api/v1/invoices/${aichResultId}/process_status`;
    case AICH_APIS_TYPES.GET_INVOICE_RESULT:
      if (!aichResultId) {
        throw new Error('AICH Result ID is required');
      }
      return `${AICH_URI}/api/v1/invoices/${aichResultId}/result`;
    case AICH_APIS_TYPES.GET_VOUCHER_RESULT:
      if (!aichResultId) {
        throw new Error('AICH Result ID is required');
      }
      return `${AICH_URI}/api/v1/vouchers/${aichResultId}/result`;
    case AICH_APIS_TYPES.GET_CONTRACT_RESULT:
      if (!aichResultId) {
        throw new Error('AICH Result ID is required');
      }
      return `${AICH_URI}/api/v1/contracts/${aichResultId}/result`;
    default:
      throw new Error('Invalid AICH API Type');
  }
}

export const fetchResultIdFromAICH = async (key: AI_TYPE, formData: FormData): Promise<string> => {
  const aichPath = AICH_PATH[key];

  let resultId = 'fetchAIResultIdError';

  try {
    // Info: (20241125 - Jacky) Don't set headers, let fetch handle it
    const response = await fetch(aichPath, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.payload.resultId) {
        resultId = data.payload.resultId;
      } else {
        loggerBack.error(`AICH resultId error: Missing resultId in response data`);
      }
    } else {
      loggerBack.error(
        `Failed to fetch result ID from AICH server: ${response.status} ${response.statusText}`
      );
    }
  } catch (_error) {
    const error = _error as Error;
    loggerBack.error(`Error fetching result ID from AICH server: ${error.message}`);
  }
  return resultId;
};

export const fetchResultFromAICH = async (key: AI_TYPE, aichResultId: string) => {
  const aichPath = AICH_PATH[key];
  try {
    const response = await fetch(`${aichPath}/${aichResultId}`);
    if (!response.ok) {
      loggerBack.error(
        `Failed to fetch result from AICH server: ${response.status} ${response.statusText}`
      );
      return null;
    }
    const data = await response.json();
    return data;
  } catch (_error) {
    const error = _error as Error;
    loggerBack.error(`Error fetching result from AICH server: ${error.message}`);
    return null;
  }
};

export async function formatLineItemsFromAICH(rawLineItems: ILineItemFromAICH[]) {
  const lineItems = await Promise.all(
    rawLineItems.map(async (rawLineItem) => {
      const { lineItemIndex, account, description, debit, amount } = rawLineItem;
      const accountInDB = await fuzzySearchAccountByName(account);

      if (!accountInDB) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }

      const resultAccount = {
        id: 0,
        voucherId: 0,
        lineItemIndex,
        account: accountInDB,
        description,
        debit,
        amount,
        accountId: accountInDB?.id || 0,
        createdAt: 0,
        updatedAt: 0,
        deletedAt: 0,
      };

      return resultAccount;
    })
  );
  return lineItems;
}
