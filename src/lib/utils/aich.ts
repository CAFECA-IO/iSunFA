import { AICH_URI } from '@/constants/config';
import { AI_TYPE, AICH_APIS_TYPES, AICH_PATH } from '@/constants/aich';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILineItemFromAICH } from '@/interfaces/line_item';
import { fuzzySearchAccountByName } from './repo/account.repo';

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

export const fetchResultIdFromAICH = async (key: AI_TYPE, body: object) => {
  const aichPath = AICH_PATH[key];
  const response = await fetch(`${aichPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  const { resultId } = data;
  return resultId;
};

export const fetchResultFromAICH = async (key: AI_TYPE, aichResultId: string) => {
  const aichPath = AICH_PATH[key];
  const response = await fetch(`${aichPath}/${aichResultId}`);
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data;
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
