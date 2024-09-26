interface ITaxRate {
  taxable: boolean;
  rate: number;
}

interface ITaxSetting {
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
  companyId: number;
  companyName: string;
  taxSettings: ITaxSetting;
  currency: string;
  lastDayOfFiscalYear: number;
  shortcutList: IShortcut[];
}
