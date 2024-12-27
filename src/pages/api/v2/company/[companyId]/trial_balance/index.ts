import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ITrialBalanceTotal, TrialBalanceItem } from '@/interfaces/trial_balance';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';

export const handleGetRequest: IHandleRequest<
  APIName.TRIAL_BALANCE_LIST,
  {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  }
> = async ({ query }) => {
  /* Info: (20241227 - Luphia) 指定期間ˊ取得有變動的會計科目，分析期初、期中、期末的借方與貸方金額，並總計餘額。
   * 0.1. 撰寫 common function 取得當下 401 申報週期 (每兩個月為一期，例如當下時間點為 2024/11/01 ~ 2024/12/31)
   * 1. 整理用戶輸入參數，取得指定期初時間點 periodBegin、期末時間點 periodEnd，若無指定則預設為當下 401 申報週期
   * 2. 獲取該公司所有會計科目，使用 account.repo
   * 3. 取得 periodEnd 時間點以前的所有會計傳票並整理傳票 id 清單 voucherIds，使用 voucher.repo
   * 4. 根據 voucherIds 取得所有會計傳票的所有會計分錄，使用 line_item.repo
   * 5. 依照 periodBegin 為區分點，將所有會計分錄分為期初到期中 begining、期中到期末 midterm 二個部分
   * 5.1. 撰寫 Utils 工具，輸入會計分錄清單，將重複的分錄合併並加總其借貸金額，輸出合併後的會計分錄清單
   * 6. 使用 Utils 工具合併 begining 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 7. 使用 Utils 工具合併 midterm 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 8. 使用 Utils 工具將 begining 與 midterm 的科目合併加總為期末部份 ending，並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 9. 整理資料為 API 回傳格式
   * 10. 整理可能發生的例外情形
   * 11. 回傳 API 回應
   */

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;
  try {
    const trialBalanceData = await listTrialBalance(query);
    if (trialBalanceData) {
      payload = trialBalanceData;
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: {
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.TRIAL_BALANCE_LIST, req, res, handleGetRequest),
  // GET: handleGetRequest, // 直接使用 handleGetRequest
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;

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
    const { httpCode, result } = formatApiResponse<{
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
