import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

export function flattenAccounts(accounts: IAccountReadyForFrontend[]): IAccountReadyForFrontend[] {
  const result: IAccountReadyForFrontend[] = [];

  const traverse = (list: IAccountReadyForFrontend[]) => {
    list.forEach((acc) => {
      result.push(acc);
      if (acc.children?.length) {
        traverse(acc.children);
      }
    });
  };

  traverse(accounts);
  return result;
}
