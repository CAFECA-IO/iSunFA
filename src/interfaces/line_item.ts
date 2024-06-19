export interface ILineItem {
  lineItemIndex: string;
  account: string;
  description: string;
  debit: boolean;
  amount: number;
  accountId: number;
}

// Info: (20240619 - Murky) LineItem that aich produces do not have accountId
export interface ILineItemFromAICH extends Omit<ILineItem, 'accountId'> {

}
