import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILedgerItem, ILedgerPayload, ILedgerTotal } from '@/interfaces/ledger';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { formatPaginatedLedger } from '@/lib/utils/formatter/ledger.formatter';
import { EVENT_TYPE_TO_VOUCHER_TYPE_MAP, EventType } from '@/constants/account';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { LabelType } from '@/constants/ledger';
import { CurrencyType } from '@/constants/currency';

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
    if (pageNumber < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const accountingSettingData = await getAccountingSettingByCompanyId(companyId);

    let currencyAlias = CurrencyType.TWD;
    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency as CurrencyType;
    }

    const lineItems = await getAllLineItemsInPrisma(companyId, startDate, endDate, false);

    // Info: (20241224 - Shirley) 篩選科目範圍
    let filteredLineItems = lineItems;
    if (startAccountNo || endAccountNo) {
      filteredLineItems = lineItems.filter((item) => {
        const no = item.account.code;
        if (startAccountNo && endAccountNo) {
          return no >= startAccountNo && no <= endAccountNo;
        } else if (startAccountNo) {
          return no >= startAccountNo;
        } else if (endAccountNo) {
          return no <= endAccountNo;
        }
        return true;
      });
    }

    // Info: (20241224 - Shirley) 根據 labelType 篩選
    if (labelType !== LabelType.ALL) {
      filteredLineItems = filteredLineItems.filter((item) => {
        if (labelType === LabelType.GENERAL) {
          return !item.account.code.includes('-');
        } else if (labelType === LabelType.DETAILED) {
          return item.account.code.includes('-');
        }
        return true;
      });
    }

    // Info: (20241224 - Shirley) 為每一個科目維護累加的balance
    const accountBalances: { [key: string]: number } = {};
    const processedLineItems: ILedgerItem[] = filteredLineItems
      .sort((a, b) => {
        // Info: (20241224 - Shirley) 先依照 account.code 排序
        const codeCompare = a.account.code.localeCompare(b.account.code);
        // Info: (20241224 - Shirley) 如果 account.code 相同，則依照 voucher date 排序
        if (codeCompare === 0) {
          return a.voucher.date - b.voucher.date;
        }
        return codeCompare;
      })
      .map((item) => {
        const accountKey = item.account.code;
        if (!accountBalances[accountKey]) {
          accountBalances[accountKey] = 0;
        }
        const debit = item.debit ? item.amount : 0;
        const credit = !item.debit ? item.amount : 0;
        const balanceChange = item.debit ? item.amount : -item.amount;
        accountBalances[accountKey] += balanceChange;

        return {
          id: item.id,
          accountId: item.accountId,
          voucherId: item.voucherId,
          voucherDate: item.voucher.date,
          no: item.account.code,
          accountingTitle: item.account.name,
          voucherNumber: item.voucher.no,
          voucherType:
            EVENT_TYPE_TO_VOUCHER_TYPE_MAP[item.voucher.type as EventType] || item.voucher.type,
          particulars: item.description,
          debitAmount: debit,
          creditAmount: credit,
          balance: accountBalances[accountKey],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

    // Info: (20241224 - Shirley) 計算總額
    const sumUpData: ILedgerTotal = processedLineItems.reduce(
      (acc: ILedgerTotal, item: ILedgerItem) => {
        acc.totalDebitAmount += item.debitAmount;
        acc.totalCreditAmount += item.creditAmount;
        return acc;
      },
      {
        totalDebitAmount: 0,
        totalCreditAmount: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    );

    // Info: (20241224 - Shirley) 分頁處理
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
