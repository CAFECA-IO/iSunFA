/* eslint-disable */
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  ILineItemInTrialBalanceItem,
  ITrialBalanceTotal,
  TrialBalanceItem,
} from '@/interfaces/trial_balance';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
import {
  aggregateAmounts,
  convertLineItemsToTrialBalanceAPIFormat,
  convertToAPIFormat,
  convertToTrialBalanceItem,
  getCurrent401Period,
  processLineItems,
} from '@/lib/utils/trial_balance';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { CurrencyType } from '@/constants/currency';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { parseSortOption } from '@/lib/utils/sort';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { buildAccountForestForUser } from '@/lib/utils/account/common';
import { SortOrder } from '@/constants/sort';
import fs from 'fs';
export const handleGetRequest: IHandleRequest<
  APIName.TRIAL_BALANCE_LIST,
  {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  }
> = async ({ query }) => {
  /* Info: (20241227 - Luphia) 指定期間取得有變動的會計科目，分析期初、期中、期末的借方與貸方金額，並總計餘額。
   * 60*(0.5+2+2+2+3+3+5)+10*10=1150 min (20241230 - Shirley)
   * 0.1. 30min)撰寫 common function 取得當下 401 申報週期 (每兩個月為一期，例如當下時間點為 2024/11/01 ~ 2024/12/31)
   * 0.2. 2h)撰寫 Utils 工具，輸入會計分錄清單，將重複的分錄合併並加總其借貸金額，輸出合併後的會計分錄清單
   * 0.3. 2h)撰寫 Utils 工具，輸入會計分錄清單，若科目具有子科目，且該科目借方或貸方金額不為 0，則新增一個「其他」虛擬科目，將該科目借方或貸方金額加入「其他」虛擬科目，列為其子科目，並將自身的金額歸零，輸出整理後的會計分錄清單
   *      e.g. 1101 庫存現金 借方 8,500 貸方 7,000 totalDebit 10,500 totalCredit 10,500、1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
   *      處理後 1101 庫存現金 借方 0 貸方 0 totalDebit 10,500 totalCredit 10,500、1101-0 庫存現金（其他） 借方 8,500 貸方 7,000 totalDebit 8,500 totalCredit 7,000、1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
   *      原本例子
   *      1101 庫存現金           借方 8,500 貸方 7,000 totalDebit 10,500 totalCredit 10,500
   *      1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
   *
   *      原本例子隱含的意思
   *      1101 庫存現金           借方 8,500 貸方 7,000 totalDebit 8,500+2,000 totalCredit 7,000+3,500
   *      1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
   *
   *      新例子
   *      1101 庫存現金           借方 0     貸方 0     totalDebit 10,500 totalCredit 10,500
   *      1101-0 庫存現金（其他）  借方 8,500 貸方 7,000 totalDebit 8,500 totalCredit 7,000
   *      1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
   * 1. 10min)整理用戶輸入參數，取得指定期初時間點 periodBegin、期末時間點 periodEnd，若無指定則預設為當下 401 申報週期
   * 2. 10min)獲得公司貨幣設定
   * 3. 10min)直接撈公司的 line items，使用 line_item.repo
   * 4. 5h)獲取該公司所有會計科目，使用 account.repo，並且根據從屬關係組成會計科目的結構，並且在有子科目的會計科目底下加上虛擬科目（不檢查子科目餘額是否為0）
   * 5. 10min)依照 periodBegin 為區分點，將所有會計分錄分為期初到期中 beginning、期中到期末 midterm 二個部分
   * 6. 10min)使用 Utils 工具合併 beginning line items 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 7. 10min)使用 Utils 工具合併 midterm line items 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 8. 10min)使用 Utils 工具將 beginning 與 midterm 的科目合併加總為期末部份 ending，並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 9. 10min)篩除借方與貸方金額皆為 0 的 line items
   * 10. 3h)複製出三個帳戶樹，為 beginning、midterm、ending，依照 accountId 分別跟 beginning、midterm、ending 的 Line Items 合併，實作加總子科目
   * 11. 30min)篩除借方與貸方金額皆為 0 的科目,需考慮子科目
   * 12. 3h)將三個帳戶樹根據 beginning、midterm、ending 的 creditAmount 跟 debitAmount，整理成 ITrialBalanceData 資料格式
   * 13. 10min)整理資料為 API 回傳格式
   * 14. 2h)整理可能發生的例外情形
   * 15. 10min)回傳 API 回應
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;
  try {
    // TODO: (20240106 - Shirley) 把 nowHrMin 刪掉
    const nowHrMin = `${new Date().getHours()}:${new Date().getMinutes()}`;

    // Info: (20250102 - Shirley) Step 1
    const { periodBegin, periodEnd } = getCurrent401Period();

    const updatedQuery = {
      ...query,
      startDate: query.startDate || periodBegin,
      endDate: query.endDate || periodEnd,
    };

    const { companyId, sortOption, page, pageSize } = updatedQuery;

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    let currencyAlias = CurrencyType.TWD;
    // Info: (20250102 - Shirley) Step 2
    const accountingSettingData = await getAccountingSettingByCompanyId(companyId);
    if (accountingSettingData?.currency) {
      currencyAlias = accountingSettingData.currency as CurrencyType;
    }

    // Info: (20250102 - Shirley) Step 3 撈出在 endDate 之前的所有 line items
    const lineItems = await getAllLineItemsInPrisma(companyId, 0, updatedQuery.endDate);

    fs.writeFileSync(`lineItems_${nowHrMin}.json`, JSON.stringify(lineItems, null, 2));

    const lineItemsWithDebitCredit: ILineItemInTrialBalanceItem[] = lineItems.map((item) => ({
      ...item,
      debitAmount: item.debit ? item.amount : 0,
      creditAmount: !item.debit ? item.amount : 0,
    }));

    // -----新作法：整理會計科目層級-----
    /**
     * 1. 對有line item的會計科目組成從屬關係，需考慮第一種跟第二種

      - 現在的line item有預設科目(parent account)跟子科目

          - 在line item的會計科目A account.code包含 `-` 時，在line item array裡透過 id === account.parentId 找account的parent account，組成  格式的資料，然後將A放到他的parent account的children，然後將A的account.code改為 `${account.code}-0`、[account.name](account.name) 改為 `${`[`account.name`](account.name)`}(虛擬科目)` 複製一份到A的children，然後將原有的A的creditAmount跟debitAmount歸零

      - 現在的line item只有子科目

          - 在line item的會計科目A account.code包含 `-` 時，在完整的account array透過 id === account.parentId 找account的parent account，組成 格式的資料，然後將A放到他的parent account的children，然後將A的account.code改為 `${account.code}-0`、[account.name](account.name) 改為 `${`[`account.name`](account.name)`}(虛擬科目)` 複製一份到A的children

      - 現在的line item只有預設科目

          - 不用處理會計科目層級
     */

    // -----新作法：整理會計科目層級-----

    // Info: (20250102 - Shirley) Step 5, 6, 7, 8, 9
    const threeStagesOfTrialBalance = convertToTrialBalanceItem(
      lineItemsWithDebitCredit,
      updatedQuery.startDate,
      updatedQuery.endDate
    );

    const newNewThreeStagesOfTrialBalance = {
      beginning: processLineItems(threeStagesOfTrialBalance.beginning).arrWithCopySelf,
      midterm: processLineItems(threeStagesOfTrialBalance.midterm).arrWithCopySelf,
      ending: processLineItems(threeStagesOfTrialBalance.ending).arrWithCopySelf,
    };

    // const newTotal = combineThreeStagesToAPIFormat(newNewThreeStagesOfTrialBalance);
    // fs.writeFileSync(`newTotal_${nowHrMin}.json`, JSON.stringify(newTotal, null, 2));

    const newAPIData = convertToAPIFormat(newNewThreeStagesOfTrialBalance);
    fs.writeFileSync(
      `addSubAccounts_newAPIData_${nowHrMin}.json`,
      JSON.stringify(newAPIData, null, 2)
    );

    // ... rest of the code ...
    // for (const [period, array] of Object.entries(threeStagesOfTrialBalance)) {
    //   processLineItems(
    //     array,
    //     newThreeStagesOfTrialBalance,
    //     period as 'beginning' | 'midterm' | 'ending'
    //   );
    // }

    // for (const [period, array] of Object.entries(threeStagesOfTrialBalance)) {
    //   for (const targetItem of array) {
    //     const { account, ...rest } = targetItem;

    //     if (account.code.includes('-')) {
    //       for (const item of array) {
    //         if (account.parentId === item.account.id) {
    //           newThreeStagesOfTrialBalance[
    //             period as keyof typeof newThreeStagesOfTrialBalance
    //           ].push({
    //             ...item,
    //             children: [targetItem],
    //           });
    //         }
    //       }
    //     }
    //   }
    // }

    // Info: 另一種將有line item的會計科目組成從屬關係的作法
    // threeStagesOfTrialBalance.beginning.forEach((targetItem) => {
    //   if (targetItem.account.code.includes('-')) {
    //     for (const item of threeStagesOfTrialBalance.beginning) {
    //       if (targetItem.account.parentId === item.account.id) {
    //         newThreeStagesOfTrialBalance.beginning.push({
    //           ...item,
    //           children: [targetItem],
    //         });
    //       }
    //     }
    //   } else {
    //     newThreeStagesOfTrialBalance.beginning.push({
    //       ...targetItem,
    //       children: [],
    //     });
    //   }
    // });

    // threeStagesOfTrialBalance.midterm.forEach((targetItem) => {
    //   if (targetItem.account.code.includes('-')) {
    //     console.log(
    //       'targetItem',
    //       targetItem,
    //       'targetItem.account.parentId',
    //       targetItem.account.parentId
    //     );
    //     for (const item of threeStagesOfTrialBalance.midterm) {
    //       if (targetItem.account.parentId === item.account.id) {
    //         newThreeStagesOfTrialBalance.midterm.push({
    //           ...item,
    //           children: [targetItem],
    //         });
    //       }
    //     }
    //   } else {
    //     newThreeStagesOfTrialBalance.midterm.push({
    //       ...targetItem,
    //       children: [],
    //     });
    //   }
    // });

    // threeStagesOfTrialBalance.ending.forEach((targetItem) => {
    //   if (targetItem.account.code.includes('-')) {
    //     for (const item of threeStagesOfTrialBalance.ending) {
    //       if (targetItem.account.parentId === item.account.id) {
    //         newThreeStagesOfTrialBalance.ending.push({
    //           ...item,
    //           children: [targetItem],
    //         });
    //       }
    //     }
    //   } else {
    //     newThreeStagesOfTrialBalance.ending.push({
    //       ...targetItem,
    //       children: [],
    //     });
    //   }
    // });

    fs.writeFileSync(
      `reassign_newNewThreeStagesOfTrialBalance_${nowHrMin}.json`,
      JSON.stringify(newNewThreeStagesOfTrialBalance, null, 2)
    );

    // const lineItemsWithHierarchy: ILineItemInTrialBalanceItemWithHierarchy[] = [];

    // for (const targetItem of lineItemsWithDebitCredit) {
    //   const { account, ...rest } = targetItem;

    //   if (account.code.includes('-')) {
    //     for (const item of lineItemsWithDebitCredit) {
    //       if (account.parentId === item.account.id) {
    //         lineItemsWithHierarchy.push({
    //           ...item,
    //           children: [targetItem],
    //         });
    //       }
    //     }
    //   }
    // }
    // console.log('lineItemsWithHierarchy', lineItemsWithHierarchy);

    // -----老作法：整理會計科目層級-----
    // Info: (20250102 - Shirley) Step X 如果預設會計科目底下有自訂子科目，並且子科目credit or debit不為0，則新增一個虛擬科目
    // 則新增一個「其他」虛擬科目，將該科目借方或貸方金額加入「其他」虛擬科目，列為其子科目，並將自身的金額歸零，輸出整理後的會計分錄清單
    const accounts = await findManyAccountsInPrisma({
      companyId,
      includeDefaultAccount: true,
      page: 1,
      limit: 9999999,
      sortBy: 'code',
      sortOrder: SortOrder.ASC,
      forUser: true,
    });
    const accountForest = buildAccountForestForUser(accounts.data);

    // Info: (20241230 - Shirley) Step 4 新增虛擬科目
    const newAccountForestWithCopySelf = accountForest.map((account) => {
      if (account.children.length > 0) {
        const { children, ...rest } = account;
        const copyOfSelf = { ...rest, children: [] };
        // TODO: (20250103 - Shirley) 複製的子科目需改名
        // const { children, id, code, parentId, parentCode, name, ...rest } =
        //   account;
        // const copyOfSelf = {
        //   ...rest,
        //   id: id * 100,
        //   code: `${code}-0`,
        //   name: `${name}（虛擬科目）`,
        //   parentId: id,
        //   parentCode: code,
        //   children: [],
        // };
        account.children.unshift(copyOfSelf);
      }
      return account;
    });

    // TODO: 在將 line item 根據 accountId ，將 debitAmount 跟 creditAmount 合併到 newAccountForestWithCopySelf 裡
    const { beginning, midterm, ending } = threeStagesOfTrialBalance;

    // fs.writeFileSync(
    //   `threeStagesOfTrialBalance_${nowHrMin}.json`,
    //   JSON.stringify(threeStagesOfTrialBalance, null, 2)
    // );

    const rawBeginningAccountForest = [...newAccountForestWithCopySelf];
    const rawMidtermAccountForest = [...newAccountForestWithCopySelf];
    const rawEndingAccountForest = [...newAccountForestWithCopySelf];

    const aggregatedBeginningAccountForest = aggregateAmounts(rawBeginningAccountForest, beginning);
    const aggregatedMidtermAccountForest = aggregateAmounts(rawMidtermAccountForest, midterm);
    const aggregatedEndingAccountForest = aggregateAmounts(rawEndingAccountForest, ending);

    // fs.writeFileSync(
    //   `aggregatedBeginningAccountForest_${nowHrMin}.json`,
    //   JSON.stringify(aggregatedBeginningAccountForest, null, 2)
    // );

    // fs.writeFileSync(
    //   `aggregatedMidtermAccountForest_${nowHrMin}.json`,
    //   JSON.stringify(aggregatedMidtermAccountForest, null, 2)
    // );

    // fs.writeFileSync(
    //   `aggregatedEndingAccountForest_${nowHrMin}.json`,
    //   JSON.stringify(aggregatedEndingAccountForest, null, 2)
    // );
    // -----老作法：整理會計科目層級-----

    // TODO: (20250103 - Shirley) 將三個 account forest 合併成 ITrialBalanceData 資料格式
    // const leveledAccountForest = {
    //   beginning: aggregatedBeginningAccountForest,
    //   midterm: aggregatedMidtermAccountForest,
    //   ending: aggregatedEndingAccountForest,
    // };

    /**
     * 將現有的 line item 組成從屬關係
     * 撈出所有會計科目，去找 id === x.parentId
     *
     */

    // Info: (20250102 - Shirley) Step 11
    const trialBalanceAPIFormat =
      convertLineItemsToTrialBalanceAPIFormat(threeStagesOfTrialBalance);

    fs.writeFileSync(
      `trialBalanceAPIFormat_${nowHrMin}.json`,
      JSON.stringify(trialBalanceAPIFormat, null, 2)
    );

    if (newAPIData) {
      const paginatedTrialBalance = formatPaginatedTrialBalance(
        newAPIData.items,
        parsedSortOption,
        page ?? DEFAULT_PAGE_NUMBER,
        pageSize ?? DEFAULT_PAGE_LIMIT
      );
      payload = {
        currencyAlias,
        items: paginatedTrialBalance,
        total: newAPIData.total,
      };
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }

    // if (trialBalanceAPIFormat) {
    //   const paginatedTrialBalance = formatPaginatedTrialBalance(
    //     trialBalanceAPIFormat.items,
    //     parsedSortOption,
    //     page ?? DEFAULT_PAGE_NUMBER,
    //     pageSize ?? DEFAULT_PAGE_LIMIT
    //   );

    //   payload = {
    //     currencyAlias,
    //     items: paginatedTrialBalance,
    //     total: trialBalanceAPIFormat.total,
    //   };
    //   statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    // }
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
