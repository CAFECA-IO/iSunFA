interface ITaxRate {
  taxable: boolean;
  rate: number;
}

export interface ITaxSetting {
  salesTax: ITaxRate;
  purchaseTax: ITaxRate;
  returnPeriodicity: string;
}

interface IField {
  name: string;
  value: string;
}

interface IAction {
  name: string;
  description: string;
  fieldList: IField[];
}

interface IShortcut {
  action: IAction;
  keyList: string[];
}

export interface IAccountingSetting {
  id: number;
  accountBookId: number;
  taxSettings: ITaxSetting;
  currency: string; // ToDo: (20241210 - tzuhan) @Murky 這裡的 currency 是不是應該是 CurrencyType？
  shortcutList: IShortcut[];
}
