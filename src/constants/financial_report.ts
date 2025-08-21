import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

export enum LifeCycleType {
  INTRODUCTION = '初創期',
  GROTH = '成長期',
  MATURITY = '成熟期',
  DECLINE = '衰退期',
  RENEWAL = '重生期',
  UNKNOWN = '未知',
}

export const EMPTY_I_ACCOUNT_READY_FRONTEND: IAccountReadyForFrontend = {
  accountId: 0,
  code: 'Empty Account',
  name: 'Empty Account',
  curPeriodAmount: '0',
  curPeriodAmountString: '-',
  curPeriodPercentage: '0',
  curPeriodPercentageString: '-',
  prePeriodAmount: '0',
  prePeriodAmountString: '-',
  prePeriodPercentage: '0',
  prePeriodPercentageString: '-',
  indent: 0,
  children: [],
};
