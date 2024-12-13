import { ITrialBalanceHeader } from '@/interfaces/export_trial_balance';
import { exportTrialBalanceFieldsSchema } from '@/lib/utils/zod_schema/export_trial_balance';

export enum ExportTrialBalanceFileType {
  CSV = 'csv',
}

export const TrialBalanceFieldsMap: Record<ITrialBalanceHeader, string> = {
  accountingTitle: '會計科目',
  beginningCreditAmount: '期初借方餘額',
  beginningDebitAmount: '期初貸方餘額',
  midtermCreditAmount: '期中借方餘額',
  midtermDebitAmount: '期中貸方餘額',
  endingCreditAmount: '期末借方餘額',
  endingDebitAmount: '期末貸方餘額',
};

export const trialBalanceAvailableFields = exportTrialBalanceFieldsSchema.options.map(
  (option) => option
);
