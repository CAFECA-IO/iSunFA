import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILedgerPayload } from '@/interfaces/ledger';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { formatPaginatedLedger } from '@/lib/utils/formatter/ledger.formatter';
import { LabelType } from '@/constants/ledger';
import {
  calculateTotals,
  filterByAccountRange,
  fetchLineItems,
  fetchCurrencyAlias,
  filterByLabelType,
  sortAndCalculateBalances,
  validatePagination,
} from '@/lib/utils/ledger';

interface IPayload extends ILedgerPayload {}

interface IResponse {
  statusMessage: string;
  payload: IPayload | null;
}

/**
 * Info: (20241224 - Shirley)
 * - 取得分類帳資料的主要功能：
 *    1. 驗證分頁參數是否有效
 *    2. 獲取公司的會計幣別設定
 *    3. 根據指定的日期範圍獲取分錄明細
 *
 * - 資料處理流程：
 *    1. 篩選分錄（lineItem）根據開始日期和結束日期
 *    2. 篩選會計科目根據科目代號範圍（startAccountNo ~ endAccountNo）
 *    3. 根據標籤類型（labelType）進一步篩選會計科目：
 *       - GENERAL: 顯示不包含 '-' 的科目
 *       - DETAILED: 顯示包含 '-' 的科目
 *       - ALL: 顯示所有科目
 *    4. 按照科目代號和傳票日期排序分錄（lineItem），並計算每個科目的餘額變化
 *    5. 計算所有科目的借方和貸方總額
 *    6. 對處理後的分錄（lineItem）進行分頁處理
 */
// TODO: (20241224 - Shirley) 寫測試
export const handleGetRequest: IHandleRequest<APIName.LEDGER_LIST, IPayload> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;
  const { companyId, startDate, endDate, page, pageSize, labelType, startAccountNo, endAccountNo } =
    query;

  const pageNumber = page;

  try {
    validatePagination(pageNumber);

    const currencyAlias = await fetchCurrencyAlias(companyId);
    let lineItems = await fetchLineItems(companyId, startDate, endDate);

    lineItems = filterByAccountRange(lineItems, startAccountNo, endAccountNo);
    lineItems = filterByLabelType(lineItems, labelType as LabelType);
    const processedLineItems = sortAndCalculateBalances(lineItems);
    const sumUpData = calculateTotals(processedLineItems);
    const paginatedLedger = formatPaginatedLedger(processedLineItems, pageNumber, pageSize);

    payload = {
      currencyAlias,
      items: paginatedLedger,
      total: sumUpData,
    };
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  } catch (error) {
    const err = error as Error;
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req, res) => withRequestValidation(APIName.LEDGER_LIST, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPayload | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IPayload | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
