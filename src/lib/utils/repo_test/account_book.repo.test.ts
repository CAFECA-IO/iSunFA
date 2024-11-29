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
  });
});
