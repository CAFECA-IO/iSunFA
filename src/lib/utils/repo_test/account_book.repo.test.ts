import { getAccountBook, getLedger, getTrialBalance } from '@/lib/utils/repo/account_book.repo';
import { AccountBook } from '@/lib/utils/account/accunt_book';
// import { AccountBookNode } from '@/lib/utils/account/account_book_node';

describe('Account Book Repository', () => {
  describe('initializeAccountBook', () => {
    it('should initialize the account book with correct data', async () => {
      const accountBook = await getAccountBook(10000007);

      expect(accountBook).toBeInstanceOf(AccountBook);
      expect(accountBook.nodes.size).toBeGreaterThan(0);

      // TODO: test nodes in next step
      accountBook.nodes.forEach((node) => {
        expect(node.id).toBeGreaterThan(0);
        expect(node.companyId).toBeGreaterThan(0);
        expect(node.system).toBeDefined();
        expect(node.type).toBeDefined();
        expect(typeof node.debit).toBe('boolean');
        expect(typeof node.liquidity).toBe('boolean');
        expect(node.code).toBeDefined();
        expect(node.name).toBeDefined();
        expect(typeof node.forUser).toBe('boolean');
        expect(node.parentCode).toBeDefined();
        expect(node.rootCode).toBeDefined();
        expect(node.parentId).toBeGreaterThanOrEqual(0);
        expect(node.rootId).toBeGreaterThanOrEqual(0);
        expect(node.level).toBeGreaterThanOrEqual(0);
        expect(node.children).toBeInstanceOf(Array);
        expect(node.amount).toBe(0);
      });
    });

    // test trial balance
    it('should get trial balance correctly', async () => {
      const trialBalance = await getTrialBalance(10000007);
      expect(trialBalance).toBeInstanceOf(Array);
    });

    // test ledger
    it('should get ledger correctly', async () => {
      const ledger = await getLedger(10000007);
      expect(ledger).toBeInstanceOf(Array);
    });

    //   it('should establish parent-child relationships correctly', async () => {
    //     const accountBook = await initializeAccountBook();

    //     accountBook.nodes.forEach((node) => {
    //       if (node.parentId !== 0) {
    //         const parentNode = accountBook.nodes.get(node.parentId);
    //         expect(parentNode).toBeDefined();
    //         expect(parentNode?.children).toContain(node);
    //         expect(node.parent).toBe(parentNode);
    //       } else {
    //         expect(node.parent).toBeNull();
    //       }
    //     });
    //   });

    //   it('should handle missing parent nodes gracefully', async () => {
    //     const accountBook = await initializeAccountBook();

    //     const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    //     accountBook.nodes.forEach((node) => {
    //       if (node.parentId !== 0 && !accountBook.nodes.has(node.parentId)) {
    //         expect(consoleWarnSpy).toHaveBeenCalledWith(`父節點 ID ${node.parentId} 不存在。`);
    //       }
    //     });

    //     consoleWarnSpy.mockRestore();
    //   });

    //   it('should initialize initial balances correctly', async () => {
    //     const accountBook = await initializeAccountBook();

    //     accountBook.nodes.forEach((node) => {
    //       if (isProfitAndLossAccount(node)) {
    //         expect(node.initialCredit).toBe(0);
    //         expect(node.initialDebit).toBe(0);
    //       } else {
    //         expect(node.initialCredit).toBeGreaterThanOrEqual(0);
    //         expect(node.initialDebit).toBeGreaterThanOrEqual(0);
    //       }
    //     });
    //   });

    //   it('should set up data associations correctly', async () => {
    //     const accountBook = await initializeAccountBook();

    //     accountBook.nodes.forEach((node) => {
    //       node.lineItems.forEach((lineItem) => {
    //         expect(lineItem.accountId).toBe(node.id);
    //         expect(lineItem.voucherId).toBeGreaterThan(0);
    //       });
    //     });
    //   });

    //   it('should handle empty account records gracefully', async () => {
    //     jest.spyOn(PrismaClient.prototype.account, 'findMany').mockResolvedValueOnce([]);

    //     const accountBook = await initializeAccountBook();

    //     expect(accountBook.nodes.size).toBe(0);
    //   });

    //   it('should handle database errors gracefully', async () => {
    //     jest
    //       .spyOn(PrismaClient.prototype.account, 'findMany')
    //       .mockRejectedValueOnce(new Error('Database error'));

    //     await expect(initializeAccountBook()).rejects.toThrow('Database error');
    //   });
  });
});
