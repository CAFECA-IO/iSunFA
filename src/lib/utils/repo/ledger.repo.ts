/* eslint-disable no-console */
// FIXME: 刪掉 disable
import prisma from '@/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILedgerPayload } from '@/interfaces/ledger';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { VoucherType } from '@/constants/account';
import { buildAccountForestForUser } from '@/lib/utils/account/common';
// Deprecated: (20241115 - Shirley) 開發完成後要刪掉
import fs from 'fs';
import path from 'path';

interface ListLedgerParams {
  companyId: number;
  startDate: number;
  endDate: number;
  startAccountNo?: string;
  endAccountNo?: string;
  labelType?: 'general' | 'detailed' | 'all';
  page?: number;
  pageSize?: number | 'infinity';
}

interface ILedgerItemForCalculation {
  id: number;
  accountId: number;
  voucherDate: number;
  no: string;
  accountingTitle: string;
  voucherNumber: string;
  particulars: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  voucherType: VoucherType;
  createAt: number;
  updateAt: number;
}

/* TODO: (20241111 - Shirley)
1. Implement label type filtering (general/detailed/all)
2. Fix balance calculation based on account type
3. Add secondary sorting for same date entries
4. Optimize query performance with SQL-level pagination
5. Enhance error handling with specific error codes

1. **標籤類型處理 (Label Type)**
    - 目前程式碼中的 labelType 參數只有記錄在 console.log，沒有實際處理
    - 需要根據 'general'、'detailed' 和 'all' 三種類型來過濾或格式化輸出資料
2. **餘額計算邏輯修正**
    - 目前的餘額計算是累加的，但根據圖片顯示，不同日期的餘額計算應該要考慮借貸方向
    - 需要根據會計科目的性質（資產、負債、收入、費用等）來決定餘額的增減方向
3. **分類帳排序優化**
    - 目前只有按照 voucherDate 排序
    - 需要增加相同日期時的次要排序條件（如傳票編號）
4. **效能優化**
    - 目前的查詢方式是先取得所有資料再做記憶體處理
    - 建議改用 SQL 層級的分頁和排序
    - 移除不必要的 fs 寫入操作（目前的 sortedAccounts.json）
5. **錯誤處理完善**
    - 需要更詳細的錯誤訊息分類
    - 對各種可能的錯誤情況提供明確的錯誤代碼和訊息
*/

export async function listLedger(params: ListLedgerParams): Promise<ILedgerPayload | null> {
  const {
    companyId,
    startDate,
    endDate,
    startAccountNo,
    endAccountNo,
    // FIXME: 預設值先設定為 general
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    labelType = 'general',
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_LIMIT,
  } = params;

  const pageNumber = page;
  let size: number | undefined;
  let skip: number = 0;

  if (pageSize !== 'infinity') {
    size = pageSize;
    skip = pageToOffset(pageNumber, size);
  }

  let ledgerPayload: ILedgerPayload | null = null;

  try {
    // TODO: 寫在 zod 裡驗證
    if (pageNumber < 1 && pageSize !== 'infinity') {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    // 1. 取得會計設定的貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { id: companyId },
    });

    let currencyAlias = 'TWD';
    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    const commonQueryConditions = {
      deletedAt: null,
    };

    const commonVoucherConditions = (startTimestamp: number, endTimestamp: number) => ({
      ...commonQueryConditions,
      date: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
    });
    // 2. 取得符合條件的會計科目
    const accountsQuery = {
      where: {
        ...commonQueryConditions,
        OR: [{ companyId }, { companyId: PUBLIC_COMPANY_ID }],
        /** FIXME:
         * 如果 startAccountNo 為 111A 、 endAccountNo 為 111D 的話，應該要包含 111A, 111B, 111C, 111D 的科目
         * 如果 startAccountNo 為 1110 、 endAccountNo 為 111D 的話，應該要包含 1110, 1111, 1112, 1113, 1114, 1115, 1116, 1117, 1118, 1119, 111A, 111B, 111C, 111D 的科目
         */
        ...(startAccountNo && endAccountNo
          ? {
              code: {
                gte: startAccountNo,
                lte: endAccountNo,
              },
            }
          : {}),
        forUser: true,
        // rootCode: '1100',
        // parentCode: '1103',
        // code: '1103-5',
      },
      include: {
        lineItem: {
          where: {
            ...commonQueryConditions,
            voucher: commonVoucherConditions(startDate, endDate),
            // deletedAt: null,
            // voucher: {
            //   date: {
            //     gte: startDate,
            //     lte: endDate,
            //   },
            //   deletedAt: null,
            // },
          },
          include: {
            voucher: true,
          },
        },
      },
    };

    const accounts = await prisma.account.findMany(accountsQuery);

    console.log('accountsInPrismaLength', accounts.length);

    // search voucher by the sort order of Ascending
    const allVoucherData = await prisma.voucher.findMany({
      where: {
        companyId,
        deletedAt: null,
        // ...commonQueryConditions,
      },
      select: {
        id: true,
      },
      // orderBy: {
      //   id: 'asc', // 按照 id 進行升序排序
      //   createdAt: 'asc',
      // },
      orderBy: [{ id: 'asc' }, { createdAt: 'asc' }],
    });

    console.log('allVoucherDataLength', allVoucherData.length);

    const allVoucherIds = allVoucherData.map((voucher) => voucher.id);

    const additionalLineItems = await prisma.lineItem.findMany({
      where: {
        voucherId: { in: allVoucherIds },
        deletedAt: null,

        // ...commonQueryConditions,
      },
      include: {
        voucher: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(
      'allVoucherData',
      allVoucherData,
      'allVoucherIds',
      allVoucherIds,
      'additionalLineItemsLength',
      additionalLineItems.length
      // 'additionalLineItems',
      // additionalLineItems
    );

    // const accounts = await prisma.account.findMany(accountsQuery);

    const sortedAccounts = buildAccountForestForUser(accounts);

    const newSortedAccounts = sortedAccounts.map((account) => {
      /*
      console.log('account in the iterative sortedAccounts', account);

      // 資料結構如下
      account in the iterative sortedAccounts：
      {
        id: 10001447,
        companyId: 1002,
        system: 'IFRS',
        type: 'equity',
        debit: false,
        liquidity: false,
        code: '345C',
        name: '對交易相關之被避險項目進行避險之選擇權時間價值-母公司',
        forUser: true,
        parentCode: '3451',
        rootCode: '3450',
        createdAt: 0,
        updatedAt: 0,
        level: 4,
        deletedAt: null,
        lineItem: [],
        children: [],
        amount: 0
      }
      */
      return {
        ...account,
        lineItem: additionalLineItems.filter((lineItem) => {
          return lineItem.accountId === account.id;
        }),
        // newLineItem: additionalLineItems.filter((lineItem) => lineItem.accountId === account.id),
      };
    });
    // eslint-disable-next-line no-console
    console.log(
      'newSortedAccounts',
      newSortedAccounts.length
      // 'last one',
      // newSortedAccounts[newSortedAccounts.length - 1]
    );

    // // Deprecated: (20241115 - Shirley) 開發完成後要刪掉
    const DIR_NAME = 'tmp';
    const NEW_FILE_NAME = 'sortedAccounts.json';
    const logDir = path.join(process.cwd(), DIR_NAME);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath = path.join(logDir, NEW_FILE_NAME);
    fs.writeFileSync(logPath, JSON.stringify(newSortedAccounts, null, 2), 'utf-8');

    // Deprecated: (20241115 - Shirley) 開發完成後要刪掉
    // const DIR_NAME_1 = 'tmp';
    // const NEW_FILE_NAME_1 = 'additionalLineItems.json';
    // const logDir1 = path.join(process.cwd(), DIR_NAME_1);
    // if (!fs.existsSync(logDir1)) {
    //   fs.mkdirSync(logDir1, { recursive: true });
    // }

    // const logPath1 = path.join(logDir1, NEW_FILE_NAME_1);
    // fs.writeFileSync(logPath1, JSON.stringify(additionalLineItems, null, 2), 'utf-8');

    // 3. 整理分類帳資料
    const ledgerItems: ILedgerItemForCalculation[] = [];
    let balance = 0;
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;

    newSortedAccounts.forEach((account) => {
      account.lineItem.forEach((item) => {
        if (item.debit) {
          balance += item.amount;
          totalDebitAmount += item.amount;
        } else {
          balance -= item.amount;
          totalCreditAmount += item.amount;
        }

        ledgerItems.push({
          accountId: account.id,

          id: item.id,
          voucherDate: item.voucher.date,
          no: account.code,
          accountingTitle: account.name,
          voucherNumber: item.voucher.no,
          voucherType: item.voucher.type as VoucherType,

          particulars: item.description,
          debitAmount: item.debit ? item.amount : 0,
          creditAmount: item.debit ? 0 : item.amount,
          balance,
          // FIXME: 改成 createdAt, updatedAt
          createAt: item.createdAt,
          updateAt: item.updatedAt,
        });
      });
    });

    // 4. 排序
    ledgerItems.sort((a, b) => a.voucherDate - b.voucherDate);
    // ledgerItems.sort((a, b) => a.accountId - b.accountId);

    // Deprecated: (20241115 - Shirley) 開發完成後要刪掉
    const DIR_NAME_2 = 'tmp';
    const NEW_FILE_NAME_2 = 'ledgerItems.json';
    const logDir2 = path.join(process.cwd(), DIR_NAME_2);
    if (!fs.existsSync(logDir2)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath2 = path.join(logDir2, NEW_FILE_NAME_2);
    fs.writeFileSync(logPath2, JSON.stringify(ledgerItems, null, 2), 'utf-8');

    // 5. 分頁處理
    let paginatedData = ledgerItems;
    let totalCount = ledgerItems.length;
    let totalPages = 1;
    let hasNextPage = false;
    let hasPreviousPage = false;

    if (pageSize !== 'infinity') {
      paginatedData = ledgerItems.slice(skip, skip + (size || DEFAULT_PAGE_LIMIT));
      totalCount = ledgerItems.length;
      totalPages = Math.ceil(totalCount / (size || DEFAULT_PAGE_LIMIT));
      hasNextPage = skip + (size || DEFAULT_PAGE_LIMIT) < totalCount;
      hasPreviousPage = pageNumber > 1;
    }

    const now = getTimestampNow();

    ledgerPayload = {
      currencyAlias,
      items: {
        data: paginatedData,
        page: pageNumber,
        totalPages,
        totalCount,
        pageSize: pageSize === 'infinity' ? totalCount : size || DEFAULT_PAGE_LIMIT,
        hasNextPage,
        hasPreviousPage,
        sort: [
          {
            sortBy: 'voucherDate',
            sortOrder: SortOrder.ASC,
          },
        ],
      },
      total: {
        totalDebitAmount,
        totalCreditAmount,
        createAt: now,
        updateAt: now,
      },
    };

    // Deprecated: (20241115 - Shirley) 開發完成後要刪掉

    fs.writeFileSync('tmp/ledgerPayload.json', JSON.stringify(ledgerPayload, null, 2), 'utf-8');
  } catch (error) {
    const logError = loggerError(0, 'listLedger in ledger.repo.ts failed', error as Error);
    logError.error('Prisma related listLedger in ledger.repo.ts failed');
  }

  return ledgerPayload;
}
