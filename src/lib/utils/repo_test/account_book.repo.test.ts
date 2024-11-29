import { getAccountBook, getLedger, getTrialBalance } from '@/lib/utils/repo/account_book.repo';
import { AccountBook } from '@/lib/utils/account/accunt_book';
import { IAccountBookNode } from '@/interfaces/account_book_node';

describe('Account Book Repository', () => {
  let accountBook: AccountBook;
  const COMPANY_ID = 10000007; // public_company: 1002

  beforeEach(async () => {
    accountBook = await getAccountBook(COMPANY_ID, 0, 1731524471);
  });

  describe('基本初始化測試', () => {
    it('應該正確初始化 AccountBook 實例', () => {
      expect(accountBook).toBeInstanceOf(AccountBook);
      expect(accountBook.nodes).toBeInstanceOf(Map);
      expect(accountBook.nodes.size).toBeGreaterThan(0);
    });

    it('每個節點應該具有正確的基本屬性', () => {
      accountBook.nodes.forEach((node) => {
        expect(node).toMatchObject({
          id: expect.any(Number),
          companyId: expect.any(Number),
          system: expect.any(String),
          type: expect.any(String),
          debit: expect.any(Boolean),
          liquidity: expect.any(Boolean),
          code: expect.any(String),
          name: expect.any(String),
          forUser: expect.any(Boolean),
          level: expect.any(Number),
          children: expect.any(Array),
          datas: expect.any(Array),
        });
      });
    });
  });

  describe('節點關係測試', () => {
    it('根節點的 parentId 應該等於自己的 id', () => {
      const rootNodes = Array.from(accountBook.nodes.values()).filter(
        (node) => node.parentId === node.id
      );
      rootNodes.forEach((node) => {
        expect(node.parentId).toBe(node.id);
        expect(node.parent).toBeNull();
      });
    });

    it('子節點應該正確連接到父節點', () => {
      const nonRootNodes = Array.from(accountBook.nodes.values()).filter(
        (node) => node.parentId !== node.id
      );
      nonRootNodes.forEach((node) => {
        if (node.parent) {
          expect(node.parent.id).toBe(node.parentId);
          expect(node.parent.children).toContain(node);
        }
      });
    });
  });

  describe('資料操作測試', () => {
    it('findNode 應該能正確查找節點', () => {
      const firstNodeId = accountBook.nodes.values().next().value.id;
      const foundNode = accountBook.findNode(firstNodeId);
      expect(foundNode).toBeTruthy();
      expect(foundNode?.id).toBe(firstNodeId);
    });

    it('findNodes 應該能正確過濾節點', () => {
      const filterByType = (type: string) => {
        return (node: IAccountBookNode) => node.type === type;
      };

      const assetNodes = accountBook.findNodes(filterByType('asset'));
      expect(assetNodes.length).toBeGreaterThan(0);
      assetNodes.forEach((node) => {
        expect(node.type).toBe('asset');
      });
    });
  });

  describe('輸出格式測試', () => {
    it('toJSON 應該輸出正確的試算表格式', async () => {
      const trialBalance = await getTrialBalance(COMPANY_ID, 0, 1731524471);
      expect(trialBalance).toBeInstanceOf(Array);
      trialBalance.forEach((node) => {
        expect(node).toHaveProperty('balance');
        expect(node).toHaveProperty('summary');
        expect(node.summary).toHaveProperty('debit');
        expect(node.summary).toHaveProperty('credit');
      });
    });

    it('toLedgerJSON 應該輸出正確的分類帳格式', async () => {
      const ledger = await getLedger(COMPANY_ID, 0, 1731524471);
      expect(ledger).toBeInstanceOf(Array);
      ledger.forEach((entry) => {
        expect(entry).toHaveProperty('creditAmount');
        expect(entry).toHaveProperty('debitAmount');
        expect(entry).toHaveProperty('balance');
        expect(entry).toHaveProperty('accountId');
        expect(entry).toHaveProperty('amount');
      });
    });
  });

  describe('錯誤處理測試', () => {
    it('查找不存在的節點應該返回 null', () => {
      const nonExistentNode = accountBook.findNode(-1);
      expect(nonExistentNode).toBeNull();
    });

    it('刪除不存在的節點不應拋出錯誤', () => {
      expect(() => {
        accountBook.deleteNode(-1);
      }).not.toThrow();
    });
  });
});
