export interface IOperatingCashFlowMapping {
  fromCode: string[];
  // toCode: string;
  name: string;
  debit: boolean; // Info: (20240708 - Murky) 這個項目原始應該要是借方還是貸方, 項目加總時如果該科目是相反的方向, 需要改用減的
  operatingFunction: (...args: number[]) => number;
  child?: Map<string, IOperatingCashFlowMapping>;
}

export type VoucherPattern = AndPattern | OrPattern | CodePattern;

export interface AndPattern {
  type: 'AND';
  patterns: VoucherPattern[];
}

export interface OrPattern {
  type: 'OR';
  patterns: VoucherPattern[];
}

export interface CodePattern {
  type: 'CODE';
  codes: Set<RegExp>;
}

export interface EitherPattern {
  type: 'EITHER';
  debit: VoucherPattern;
  credit: VoucherPattern;
}

export interface IDirectCashFlowMapping {
  name: string;
  cashInflow: boolean;
  voucherPattern: {
    debit: VoucherPattern;
    credit: VoucherPattern;
  };
  either?: EitherPattern;
}
