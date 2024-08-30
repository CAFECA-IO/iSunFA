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
  code: 'Empty Account',
  name: 'Empty Account',
  curPeriodAmount: 0,
  curPeriodAmountString: '0',
  curPeriodPercentage: 0,
  prePeriodAmount: 0,
  prePeriodAmountString: '0',
  prePeriodPercentage: 0,
  indent: 0,
};
