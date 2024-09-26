import { trialBalanceReturnValidator } from '@/lib/utils/zod_schema/trial_balance';

export const mockTrialBalanceList = [
  {
    id: 1,
    no: '1141',
    accountingTitle: '應收帳款',
    beginningCreditAmount: 0,
    beginningDebitAmount: 1785000,
    midtermCreditAmount: 0,
    midtermDebitAmount: 1785000,
    endingCreditAmount: 0,
    endingDebitAmount: 1785000,
    createAt: 1704067200,
    updateAt: 1704067200,
    subAccounts: [
      {
        id: 2,
        no: '114101',
        accountingTitle: '應收帳款-A公司',
        beginningCreditAmount: 0,
        beginningDebitAmount: 1785000,
        midtermCreditAmount: 0,
        midtermDebitAmount: 1785000,
        endingCreditAmount: 0,
        endingDebitAmount: 1785000,
        createAt: 1704067200,
        updateAt: 1704067200,
        subAccounts: [],
      },
    ],
  },
  {
    id: 3,
    no: '1151',
    accountingTitle: '其他應收款',
    beginningCreditAmount: 0,
    beginningDebitAmount: 500000,
    midtermCreditAmount: 0,
    midtermDebitAmount: 500000,
    endingCreditAmount: 0,
    endingDebitAmount: 500000,
    createAt: 1704067200,
    updateAt: 1704067200,
    subAccounts: [],
  },
];

// Validate the mock data against the schema
mockTrialBalanceList.forEach((item) => {
  trialBalanceReturnValidator.parse(item);
});
