import fs from 'fs';
import path from 'path';

export interface TestLineItem {
  id: number;
  accountId: number;
  amount: string;
  debit: boolean;
  description: string;
}

export interface TestVoucher {
  id: number;
  no: string;
  date: number;
  createdAt: number;
  lineItems: TestLineItem[];
  totalDebits: string;
  totalCredits: string;
  isBalanced: boolean;
}

export interface TestAccount {
  id: number;
  code: string;
  name: string;
  type: string;
}

export interface TestAccountBook {
  id: number;
  name: string;
  teamId: number;
  userId: number;
  createdAt: number;
}

export interface RealAccountingTestData {
  metadata: {
    extractedAt: string;
    description: string;
    purpose: string;
  };
  accountBook: TestAccountBook;
  accounts: TestAccount[];
  vouchers: TestVoucher[];
  statistics: {
    totalVouchers: number;
    totalLineItems: number;
    balancedVouchers: number;
    totalAmountRange: {
      min: number;
      max: number;
    };
  };
}

/**
 * Info: (20250813 - Shirley)
 * Load real accounting test data from AccountBook 10000007
 */
export function loadRealAccountingTestData(): RealAccountingTestData {
  const testDataPath = path.join(__dirname, 'account_book_10000007_test_data.json');

  if (!fs.existsSync(testDataPath)) {
    throw new Error(`Test data file not found: ${testDataPath}`);
  }

  const rawData = fs.readFileSync(testDataPath, 'utf-8');
  return JSON.parse(rawData) as RealAccountingTestData;
}

/**
 * Info: (20250813 - Shirley)
 * Get specific voucher test data by ID
 */
export function getVoucherTestData(voucherId: number): TestVoucher | null {
  const testData = loadRealAccountingTestData();
  return testData.vouchers.find((v) => v.id === voucherId) || null;
}

/**
 * Info: (20250813 - Shirley)
 * Get balanced vouchers for testing
 */
export function getBalancedVouchers(): TestVoucher[] {
  const testData = loadRealAccountingTestData();
  return testData.vouchers.filter((v) => v.isBalanced);
}

/**
 * Info: (20250813 - Shirley)
 * Get unbalanced vouchers for negative testing
 */
export function getUnbalancedVouchers(): TestVoucher[] {
  const testData = loadRealAccountingTestData();
  return testData.vouchers.filter((v) => !v.isBalanced);
}

/**
 * Info: (20250813 - Shirley)
 * Get all line item amounts as string array
 */
export function getAllAmounts(): string[] {
  const testData = loadRealAccountingTestData();
  return testData.vouchers.flatMap((v) => v.lineItems.map((li) => li.amount));
}

/**
 * Info: (20250813 - Shirley)
 * Get debit amounts from a specific voucher
 */
export function getVoucherDebits(voucherId: number): string[] {
  const voucher = getVoucherTestData(voucherId);
  if (!voucher) return [];
  return voucher.lineItems.filter((li) => li.debit).map((li) => li.amount);
}

/**
 * Info: (20250813 - Shirley)
 * Get credit amounts from a specific voucher
 */
export function getVoucherCredits(voucherId: number): string[] {
  const voucher = getVoucherTestData(voucherId);
  if (!voucher) return [];
  return voucher.lineItems.filter((li) => !li.debit).map((li) => li.amount);
}

/**
 * Info: (20250813 - Shirley)
 * Get test data for specific amount ranges
 */
export function getAmountsByRange(min: number, max: number): string[] {
  const allAmounts = getAllAmounts();
  return allAmounts.filter((amount) => {
    const num = Number(amount);
    return num >= min && num <= max;
  });
}

/**
 * Info: (20250813 - Shirley)
 * Get sample voucher IDs for testing
 */
export function getSampleVoucherIds(): number[] {
  const testData = loadRealAccountingTestData();
  return testData.vouchers.slice(0, 5).map((v) => v.id);
}

/**
 * Info: (20250813 - Shirley)
 * Generate test cases for decimal precision testing
 */
export function generateDecimalPrecisionTestCases(): Array<{
  description: string;
  amounts: string[];
  expectedSum: string;
}> {
  const testData = loadRealAccountingTestData();

  return [
    {
      description: 'Small amounts precision test',
      amounts: testData.vouchers
        .flatMap((v) => v.lineItems)
        .filter((li) => Number(li.amount) < 1000)
        .slice(0, 5)
        .map((li) => li.amount),
      expectedSum: testData.vouchers
        .flatMap((v) => v.lineItems)
        .filter((li) => Number(li.amount) < 1000)
        .slice(0, 5)
        .reduce((sum, li) => sum + Number(li.amount), 0)
        .toString(),
    },
    {
      description: 'Large amounts precision test',
      amounts: testData.vouchers
        .flatMap((v) => v.lineItems)
        .filter((li) => Number(li.amount) > 10000)
        .slice(0, 3)
        .map((li) => li.amount),
      expectedSum: testData.vouchers
        .flatMap((v) => v.lineItems)
        .filter((li) => Number(li.amount) > 10000)
        .slice(0, 3)
        .reduce((sum, li) => sum + Number(li.amount), 0)
        .toString(),
    },
    {
      description: 'Mixed amounts precision test',
      amounts: testData.vouchers
        .slice(0, 2)
        .flatMap((v) => v.lineItems)
        .map((li) => li.amount),
      expectedSum: testData.vouchers
        .slice(0, 2)
        .flatMap((v) => v.lineItems)
        .reduce((sum, li) => sum + Number(li.amount), 0)
        .toString(),
    },
  ];
}
