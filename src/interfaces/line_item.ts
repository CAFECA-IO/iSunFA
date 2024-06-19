export interface ILineItem {
  lineItemIndex: string;
  account: string;
  description: string;
  debit: boolean;
  amount: number;
  accountId?: number; // Info (20240619 - Murky) to Emily 可以在串完之後幫我把“?”拿掉嗎？
}

// Info: (20240619 - Murky) LineItem that aich produces do not have accountId
export interface ILineItemFromAICH extends Omit<ILineItem, 'accountId'> {

}
