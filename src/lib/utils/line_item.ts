import { ILineItemIncludeAccount } from "@/interfaces/line_item";

type LineItemBiggest = {
    id: number,
    debit: boolean,
    account: string,
    amount: number
};
export function sumLineItemsAndReturnBiggest(lineItems: ILineItemIncludeAccount[] | null | undefined): {
    credit: LineItemBiggest,
    debit: LineItemBiggest
} {
    let creditLargestAmount = 0;
    let debitLargestAmount = 0;
    const credit = {
        id: 0,
        debit: false,
        account: '',
        amount: 0
    };

    const debit = {
        id: 0,
        debit: true,
        account: '',
        amount: 0
    };

    if (!lineItems) {
        return {
            credit,
            debit
        };
    }

    lineItems.forEach((lineItem) => {
        if (lineItem.debit) {
            if (lineItem.amount > debitLargestAmount) {
                debit.id = lineItem.id;
                debit.account = lineItem.account.name;
                debitLargestAmount = lineItem.amount;
            }
            debit.amount += lineItem.amount;
        } else {
            if (lineItem.amount > creditLargestAmount) {
                credit.id = lineItem.id;
                credit.account = lineItem.account.name;
                creditLargestAmount = lineItem.amount;
            }

            credit.amount = lineItem.amount;
        }
    });

    return {
        credit,
        debit
    };
}
