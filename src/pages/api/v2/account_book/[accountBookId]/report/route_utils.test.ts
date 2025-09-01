import { ReportSheetType } from '@/constants/report';
import {
  getReportFilterByReportType,
  transformAccountsMapToFilterSequence,
  transformAccountsToMap,
} from '@/pages/api/v2/account_book/[accountBookId]/report/route_utils';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

describe('account_book/[accountBookId]/v2/report/route_utils unit test', () => {
  describe('getMappingByReportType unit test', () => {
    it('should return map For balance sheet', () => {
      const mapping = getReportFilterByReportType(ReportSheetType.BALANCE_SHEET);
      expect(mapping).toBeDefined();
      expect(mapping.general).toBeDefined();
      expect(mapping.detail).toBeDefined();

      expect(mapping.general[0].code).toBeDefined();
      expect(mapping.detail[0].code).toBeDefined();
    });

    it('should return map For income statement', () => {
      const mapping = getReportFilterByReportType(ReportSheetType.INCOME_STATEMENT);
      expect(mapping).toBeDefined();
      expect(mapping.general).toBeDefined();
      expect(mapping.detail).toBeDefined();

      expect(mapping.general[0].code).toBeDefined();
      expect(mapping.detail[0].code).toBeDefined();
    });

    it('should return map For balance sheet', () => {
      const mapping = getReportFilterByReportType(ReportSheetType.CASH_FLOW_STATEMENT);
      expect(mapping).toBeDefined();
      expect(mapping.general).toBeDefined();
      expect(mapping.detail).toBeDefined();

      expect(mapping.general[0].code).toBeDefined();
      expect(mapping.detail[0].code).toBeDefined();
    });

    it('should throw error if type not support ex 401', () => {
      expect(() => getReportFilterByReportType(ReportSheetType.REPORT_401)).toThrow();
    });
  });

  describe('getMappingByReportType unit test', () => {
    const mockAccount: IAccountReadyForFrontend = {
      accountId: 1,
      code: '4000',
      name: '營業收入合計',
      curPeriodAmount: '1000',
      curPeriodAmountString: '1,000',
      curPeriodPercentage: '10',
      curPeriodPercentageString: '10',
      prePeriodAmount: '500',
      prePeriodAmountString: '500',
      prePeriodPercentage: '5',
      prePeriodPercentageString: '5',
      indent: 1,
      children: [],
    };
    it('It should return map', () => {
      const mockAccounts: IAccountReadyForFrontend[] = [mockAccount];

      const map = transformAccountsToMap(mockAccounts);
      const account = map.get(mockAccount.code);
      expect(account).toBeDefined();
      expect(account);
    });
  });

  describe('transformAccountMapToFilterSequence', () => {
    const mockAccounts: IAccountReadyForFrontend[] = [
      {
        accountId: 1,
        code: '4000',
        name: '營業收入合計',
        curPeriodAmount: '1000',
        curPeriodAmountString: '1,000',
        curPeriodPercentage: '10',
        curPeriodPercentageString: '10',
        prePeriodAmount: '500',
        prePeriodAmountString: '500',
        prePeriodPercentage: '5',
        prePeriodPercentageString: '5',
        indent: 1,
        children: [],
      },
      {
        accountId: 2,
        code: '2128',
        name: '按攤銷後成本衡量之金融負債－流動',
        curPeriodAmount: '1000',
        curPeriodAmountString: '1,000',
        curPeriodPercentage: '10',
        curPeriodPercentageString: '10',
        prePeriodAmount: '500',
        prePeriodAmountString: '500',
        prePeriodPercentage: '5',
        prePeriodPercentageString: '5',
        indent: 1,
        children: [],
      },
    ];
    const mockFilter = [
      {
        code: '4000',
        name: '營業收入合計',
        indent: 2,
      },
    ];
    it('should create correct sequence', () => {
      const accountsMap = transformAccountsToMap(mockAccounts);
      const newAccounts = transformAccountsMapToFilterSequence({
        filter: mockFilter,
        accountsMap,
      });

      expect(newAccounts.length).toBe(mockFilter.length);

      // Info: (20241016 - Murky) 不在filter裡的不應該出現
      expect(newAccounts.find((account) => account.code === '2128')).toBeUndefined();
    });
  });
});
