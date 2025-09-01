import { DecimalOperations } from '@/lib/utils/decimal_operations';
import {
  loadRealAccountingTestData,
  getBalancedVouchers,
  getUnbalancedVouchers,
  getAllAmounts,
  getVoucherDebits,
  getVoucherCredits,
  generateDecimalPrecisionTestCases,
  getSampleVoucherIds,
  getAmountsByRange,
  type RealAccountingTestData,
  type TestVoucher,
} from '@/tests/fixtures/test_data_loader';

describe('DecimalOperations with Real Accounting Data', () => {
  let testData: RealAccountingTestData;
  let balancedVouchers: TestVoucher[];
  let sampleVoucherIds: number[];

  beforeAll(() => {
    testData = loadRealAccountingTestData();
    balancedVouchers = getBalancedVouchers();
    sampleVoucherIds = getSampleVoucherIds();
  });

  describe('Test Data Validation', () => {
    it('should load real test data successfully', () => {
      expect(testData).toBeDefined();
      expect(testData.accountBook.id).toBe(10000007);
      expect(testData.accountBook.name).toBe('AnnaCryCryCry');
      expect(testData.vouchers.length).toBeGreaterThan(0);
      expect(testData.accounts.length).toBeGreaterThan(0);
    });

    it('should have valid test data statistics', () => {
      expect(testData.statistics.totalVouchers).toBeGreaterThan(0);
      expect(testData.statistics.totalLineItems).toBeGreaterThan(0);
      expect(testData.statistics.balancedVouchers).toBeGreaterThan(0);
      expect(testData.statistics.totalAmountRange.min).toBeGreaterThan(0);
      expect(testData.statistics.totalAmountRange.max).toBeGreaterThanOrEqual(
        testData.statistics.totalAmountRange.min
      );
    });

    it('should have vouchers with line items', () => {
      const vouchersWithItems = testData.vouchers.filter((v) => v.lineItems.length > 0);
      expect(vouchersWithItems.length).toBe(testData.vouchers.length);

      testData.vouchers.forEach((voucher) => {
        expect(voucher.lineItems.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Balance Validation with Real Data', () => {
    it('should validate all balanced vouchers correctly', () => {
      balancedVouchers.forEach((voucher) => {
        const debits = voucher.lineItems.filter((li) => li.debit).map((li) => li.amount);
        const credits = voucher.lineItems.filter((li) => !li.debit).map((li) => li.amount);

        const isBalanced = DecimalOperations.isBalanced(debits, credits);

        expect(isBalanced).toBe(true);
        expect(voucher.isBalanced).toBe(true);

        const totalDebits = DecimalOperations.sum(debits);
        const totalCredits = DecimalOperations.sum(credits);
        expect(DecimalOperations.isEqual(totalDebits, totalCredits)).toBe(true);
      });
    });

    it('should detect unbalanced vouchers if they exist', () => {
      const unbalancedVouchers = getUnbalancedVouchers();

      unbalancedVouchers.forEach((voucher) => {
        const debits = getVoucherDebits(voucher.id);
        const credits = getVoucherCredits(voucher.id);

        const isBalanced = DecimalOperations.isBalanced(debits, credits);
        expect(isBalanced).toBe(false);
        expect(voucher.isBalanced).toBe(false);
      });
    });

    it('should validate specific voucher balance calculations', () => {
      sampleVoucherIds.slice(0, 3).forEach((voucherId) => {
        const debits = getVoucherDebits(voucherId);
        const credits = getVoucherCredits(voucherId);

        const totalDebits = DecimalOperations.sum(debits);
        const totalCredits = DecimalOperations.sum(credits);

        expect(DecimalOperations.isEqual(totalDebits, totalCredits)).toBe(true);
      });
    });
  });

  describe('Arithmetic Operations with Real Amounts', () => {
    it('should sum all amounts correctly', () => {
      const allAmounts = getAllAmounts();

      expect(allAmounts.length).toBeGreaterThan(0);

      const total = DecimalOperations.sum(allAmounts);
      const manualSum = allAmounts.reduce((sum, amount) => {
        return DecimalOperations.add(sum, amount);
      }, '0');

      expect(DecimalOperations.isEqual(total, manualSum)).toBe(true);
      expect(DecimalOperations.isValidDecimal(total)).toBe(true);
    });

    it('should handle small amounts precisely', () => {
      const smallAmounts = getAmountsByRange(1, 1000);

      if (smallAmounts.length > 0) {
        const sum = DecimalOperations.sum(smallAmounts);
        const average = DecimalOperations.average(smallAmounts);
        const min = DecimalOperations.min(smallAmounts);
        const max = DecimalOperations.max(smallAmounts);

        expect(Number(sum)).toBeGreaterThan(0);
        expect(Number(average)).toBeGreaterThan(0);
        expect(Number(min)).toBeLessThanOrEqual(Number(max));

        const expectedAverage = DecimalOperations.divide(sum, smallAmounts.length);
        expect(DecimalOperations.isEqual(average, expectedAverage)).toBe(true);
      }
    });

    it('should handle large amounts precisely', () => {
      const largeAmounts = getAmountsByRange(10000, 1000000);

      if (largeAmounts.length > 0) {
        const sum = DecimalOperations.sum(largeAmounts);
        const product = largeAmounts.reduce((result, amount) => {
          return DecimalOperations.multiply(result, DecimalOperations.divide(amount, amount));
        }, largeAmounts[0]);

        expect(DecimalOperations.isValidDecimal(sum)).toBe(true);
        expect(DecimalOperations.isEqual(product, largeAmounts[0])).toBe(true);
      }
    });

    it('should maintain precision across multiple operations', () => {
      const testCases = generateDecimalPrecisionTestCases();

      testCases.forEach((testCase) => {
        if (testCase.amounts.length > 0) {
          const calculatedSum = DecimalOperations.sum(testCase.amounts);

          const { expectedSum } = testCase;
          const difference = DecimalOperations.abs(
            DecimalOperations.subtract(calculatedSum, expectedSum)
          );

          const isExactMatch = DecimalOperations.isEqual(calculatedSum, expectedSum);
          const isWithinTolerance = DecimalOperations.isLessThan(difference, '0.01');

          expect(isExactMatch || isWithinTolerance).toBe(true);
        }
      });
    });
  });

  describe('Comparison Operations with Real Data', () => {
    it('should compare real amounts correctly', () => {
      const amounts = getAllAmounts().slice(0, 10);

      for (let i = 0; i < amounts.length - 1; i += 1) {
        const current = amounts[i];
        const next = amounts[i + 1];

        const isEqual = DecimalOperations.isEqual(current, next);
        const isGreater = DecimalOperations.isGreaterThan(current, next);
        const isLess = DecimalOperations.isLessThan(current, next);

        const truthCount = [isEqual, isGreater, isLess].filter(Boolean).length;
        expect(truthCount).toBe(1);
      }
    });

    it('should identify zero amounts correctly', () => {
      const allAmounts = getAllAmounts();
      const zeroAmounts = allAmounts.filter((amount) => DecimalOperations.isZero(amount));
      const positiveAmounts = allAmounts.filter((amount) => DecimalOperations.isPositive(amount));
      const negativeAmounts = allAmounts.filter((amount) => DecimalOperations.isNegative(amount));

      expect(zeroAmounts.length + positiveAmounts.length + negativeAmounts.length).toBe(
        allAmounts.length
      );

      expect(positiveAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Formatting with Real Data', () => {
    it('should format real amounts with thousand separators', () => {
      const largeAmounts = getAmountsByRange(1000, 1000000);

      largeAmounts.slice(0, 5).forEach((amount) => {
        const formatted = DecimalOperations.format(amount);

        expect(formatted).toMatch(/^[\d,]+(\.\d+)?$/);

        if (Number(amount) >= 1000) {
          expect(formatted).toContain(',');
        }

        const unformatted = formatted.replace(/,/g, '');
        expect(DecimalOperations.isEqual(amount, unformatted)).toBe(true);
      });
    });

    it('should round real amounts correctly', () => {
      const amounts = getAllAmounts().slice(0, 5);

      amounts.forEach((amount) => {
        const rounded2 = DecimalOperations.round(amount, 2);
        const rounded0 = DecimalOperations.round(amount, 0);

        expect(DecimalOperations.isValidDecimal(rounded2)).toBe(true);
        expect(DecimalOperations.isValidDecimal(rounded0)).toBe(true);

        const diff2 = DecimalOperations.abs(DecimalOperations.subtract(amount, rounded2));
        const diff0 = DecimalOperations.abs(DecimalOperations.subtract(amount, rounded0));

        expect(DecimalOperations.isLessThanOrEqual(diff2, '0.005')).toBe(true);
        expect(DecimalOperations.isLessThanOrEqual(diff0, '0.5')).toBe(true);
      });
    });
  });

  describe('Edge Cases with Real Data', () => {
    it('should handle minimum and maximum amounts', () => {
      const { min, max } = testData.statistics.totalAmountRange;
      const minStr = min.toString();
      const maxStr = max.toString();

      expect(
        DecimalOperations.isLessThan(minStr, maxStr) || DecimalOperations.isEqual(minStr, maxStr)
      ).toBe(true);

      const sum = DecimalOperations.add(minStr, maxStr);
      const product = DecimalOperations.multiply(minStr, '2');

      expect(DecimalOperations.isGreaterThan(sum, maxStr)).toBe(true);
      expect(DecimalOperations.isGreaterThanOrEqual(product, minStr)).toBe(true);
    });

    it('should handle division with real amounts safely', () => {
      const amounts = getAllAmounts()
        .filter((amount) => !DecimalOperations.isZero(amount))
        .slice(0, 5);

      amounts.forEach((amount) => {
        const half = DecimalOperations.divide(amount, '2');
        const doubled = DecimalOperations.multiply(half, '2');

        expect(DecimalOperations.isEqual(amount, doubled)).toBe(true);

        expect(() => DecimalOperations.divide(amount, '0')).toThrow(
          'Division by zero is not allowed'
        );
      });
    });

    it('should maintain precision in complex calculations', () => {
      const firstVoucher = testData.vouchers[0];
      const amounts = firstVoucher.lineItems.map((li) => li.amount);

      if (amounts.length >= 2) {
        const a = amounts[0];
        const b = amounts[1];

        const sum = DecimalOperations.add(a, b);
        const doubled = DecimalOperations.multiply(sum, '2');
        const halved = DecimalOperations.divide(doubled, '2');

        expect(DecimalOperations.isEqual(sum, halved)).toBe(true);

        const bPlusOne = DecimalOperations.add(b, '1');
        const product1 = DecimalOperations.multiply(a, bPlusOne);
        const result1 = DecimalOperations.subtract(product1, a);
        const product2 = DecimalOperations.multiply(a, b);

        expect(DecimalOperations.isEqual(result1, product2)).toBe(true);
      }
    });
  });

  describe('Total Balance Validation Across All Test Data', () => {
    it('should calculate and validate total debit/credit balance across all vouchers', () => {
      const totalDebits: string[] = [];
      const totalCredits: string[] = [];

      testData.vouchers.forEach((voucher) => {
        voucher.lineItems.forEach((lineItem) => {
          if (lineItem.debit) {
            totalDebits.push(lineItem.amount.toString());
          } else {
            totalCredits.push(lineItem.amount.toString());
          }
        });
      });

      const totalDebitSum = DecimalOperations.sum(totalDebits);
      const totalCreditSum = DecimalOperations.sum(totalCredits);

      const allAmounts = [...totalDebits, ...totalCredits];
      const grandTotal = DecimalOperations.sum(allAmounts);

      expect(DecimalOperations.isEqual(totalDebitSum, totalCreditSum)).toBe(true);

      expect(totalDebits.length).toBeGreaterThan(0);
      expect(totalCredits.length).toBeGreaterThan(0);
      expect(DecimalOperations.isPositive(totalDebitSum)).toBe(true);
      expect(DecimalOperations.isPositive(totalCreditSum)).toBe(true);

      const expectedGrandTotal = DecimalOperations.multiply(totalDebitSum, '2');
      expect(DecimalOperations.isEqual(grandTotal, expectedGrandTotal)).toBe(true);
    });

    it('should validate individual voucher contributions to total balance', () => {
      const voucherDetails: Array<{
        id: number;
        debitSum: string;
        creditSum: string;
        isBalanced: boolean;
        difference: string;
      }> = [];

      testData.vouchers.forEach((voucher) => {
        const debits = voucher.lineItems.filter((li) => li.debit).map((li) => li.amount.toString());
        const credits = voucher.lineItems
          .filter((li) => !li.debit)
          .map((li) => li.amount.toString());

        const debitSum = DecimalOperations.sum(debits);
        const creditSum = DecimalOperations.sum(credits);
        const isBalanced = DecimalOperations.isEqual(debitSum, creditSum);
        const difference = DecimalOperations.subtract(debitSum, creditSum);

        voucherDetails.push({
          id: voucher.id,
          debitSum,
          creditSum,
          isBalanced,
          difference,
        });
      });

      const balancedCount = voucherDetails.filter((v) => v.isBalanced).length;
      const unbalancedCount = voucherDetails.filter((v) => !v.isBalanced).length;

      expect(unbalancedCount).toBe(0);
      expect(balancedCount).toBe(testData.vouchers.length);
    });
  });

  describe('Performance with Real Data', () => {
    it('should handle large datasets efficiently', () => {
      const allAmounts = getAllAmounts();

      const startTime = process.hrtime.bigint();

      const sum = DecimalOperations.sum(allAmounts);
      const count = allAmounts.length;
      const average = DecimalOperations.divide(sum, count.toString());

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(DecimalOperations.isValidDecimal(sum)).toBe(true);
      expect(DecimalOperations.isValidDecimal(average)).toBe(true);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle repeated operations consistently', () => {
      const testAmount = testData.vouchers[0].lineItems[0].amount;

      const results = Array(10)
        .fill(null)
        .map(() => {
          return DecimalOperations.multiply(testAmount, '1.5');
        });

      const firstResult = results[0];
      results.forEach((result) => {
        expect(DecimalOperations.isEqual(result, firstResult)).toBe(true);
      });
    });
  });
});
