/** Info: (20250703 - Shirley)
 * Integration Test Data Factory for Next.js API Testing
 *
 * Provides test data generation utilities using system default values for real user behavior simulation.
 * Implements standardized test data patterns for consistent integration testing.
 *
 * Purpose:
 * - Generate consistent test data for integration tests
 * - Use system default values for realistic testing
 * - Provide standardized authentication data
 * - Abstract test data creation patterns
 *
 * Usage:
 * // Generate OTP request data
 * const otpData = TestDataFactory.createOTPRequest('user@isunfa.com');
 *
 * // Generate authentication request data
 * const authData = TestDataFactory.createAuthenticationRequest('user@isunfa.com', '123456');
 *
 * // Use default test emails
 * const emails = TestDataFactory.DEFAULT_TEST_EMAILS;
 */
import { VoucherType } from '@/constants/account';
import { DefaultValue } from '@/constants/default_value';
import { ILedgerItem } from '@/interfaces/ledger';

export class TestDataFactory {
  // Info: (20250701 - Shirley) Use system default emails and verification codes for testing
  static readonly DEFAULT_TEST_EMAILS = DefaultValue.EMAIL_LOGIN.EMAIL;

  static readonly DEFAULT_VERIFICATION_CODE = DefaultValue.EMAIL_LOGIN.CODE;

  static readonly TEST_EMAIL = DefaultValue.EMAIL_LOGIN.EMAIL;

  // Info: (20250701 - Shirley) Primary test email (first in the list)
  static readonly PRIMARY_TEST_EMAIL = this.DEFAULT_TEST_EMAILS[0]; // Info: (20250701 - Shirley) user@isunfa.com

  // Info: (20250707 - Shirley) Default values for terms agreement and role selection
  static readonly DEFAULT_AGREEMENT_HASH = 'default_test_agreement_hash_v1';

  static readonly DEFAULT_ROLE_NAME = 'INDIVIDUAL';

  // Info: (20250701 - Shirley) Generate authentication request for email login
  static createAuthenticationRequest(
    email?: string,
    code?: string
  ): { email: string; code: string } {
    return {
      email: email || this.PRIMARY_TEST_EMAIL,
      code: code || this.DEFAULT_VERIFICATION_CODE,
    };
  }

  // Info: (20250707 - Shirley) Generate terms agreement request
  static createTermsAgreementRequest(agreementHash?: string): { agreementHash: string } {
    return {
      agreementHash:
        agreementHash ||
        `${this.DEFAULT_AGREEMENT_HASH}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  // Info: (20250707 - Shirley) Generate role creation request
  static createRoleRequest(roleName?: string): { roleName: string } {
    return {
      roleName: roleName || this.DEFAULT_ROLE_NAME,
    };
  }

  /**
   * Info: (20250716 - Shirley) Sample voucher data referring to company_id 10000007
   */
  static sampleVoucherData() {
    const sampleVouchersData = [
      {
        type: 'payment',
        date: 1733900543,
        note: 'Financial report sample voucher 1',
        lineItems: [
          {
            accountId: 1603,
            amount: 100,
            description: '測試1',
            debit: false,
          },
          {
            accountId: 1601,
            amount: 100,
            description: '測試1',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733468990,
        note: 'Financial report sample voucher 2',
        lineItems: [
          {
            accountId: 2108,
            amount: 100,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 2127,
            amount: 100,
            description: '120611111',
            debit: true,
          },
        ],
      },
      {
        type: 'transfer',
        date: 1733467495,
        note: 'Financial report sample voucher 3',
        lineItems: [
          {
            accountId: 2103,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 1603,
            amount: 10000,
            description: '1203',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733467636,
        note: 'Financial report sample voucher 4',
        lineItems: [
          {
            accountId: 2117,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 2121,
            amount: 10000,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733467693,
        note: 'Financial report sample voucher 5',
        lineItems: [
          {
            accountId: 1645,
            amount: 100000,
            description: '',
            debit: false,
          },
          {
            accountId: 1668,
            amount: 100000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733462850,
        note: 'Financial report sample voucher 6',
        lineItems: [
          {
            accountId: 1607,
            amount: 120000,
            description: '',
            debit: false,
          },
          {
            accountId: 1618,
            amount: 120000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1729493349,
        note: 'Financial report sample voucher 7',
        lineItems: [
          {
            accountId: 1601,
            amount: 10000,
            description: '',
            debit: false,
          },
          {
            accountId: 1608,
            amount: 10000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1729494105,
        note: 'Financial report sample voucher 8',
        lineItems: [
          {
            accountId: 1369,
            amount: 10000,
            description: '',
            debit: false,
          },
          {
            accountId: 1603,
            amount: 10000,
            description: '',
            debit: true,
          },
        ],
      },
    ];

    return sampleVouchersData;

    /** Info: (20250721 - Shirley)
     * All vouchers data in company_id 10000007, including customized account (account_id = 10001469)
     * originalWholeVoucherData
     const sampleVouchersData = [
      {
        type: 'payment',
        date: 1727712000,
        note: 'Financial report sample voucher 1 (10000089)',
        lineItems: [
          {
            accountId: 1601,
            amount: 10000,
            description: '',
            debit: false,
          },
          {
            accountId: 1608,
            amount: 10000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1727712000,
        note: 'Financial report sample voucher 2 (10000090)',
        lineItems: [
          {
            accountId: 1369,
            amount: 10000,
            description: '',
            debit: false,
          },
          {
            accountId: 1603,
            amount: 10000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1727712000,
        note: 'Financial report sample voucher 3 (10000097)',
        lineItems: [
          {
            accountId: 1603,
            amount: 10000,
            description: '222',
            debit: true,
          },
          {
            accountId: 2032,
            amount: 5000,
            description: '',
            debit: false,
          },
          {
            accountId: 1568,
            amount: 5000,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1727712000,
        note: 'Financial report sample voucher 4 (10000099)',
        lineItems: [
          {
            accountId: 1568,
            amount: 10000,
            description: '',
            debit: false,
          },
          {
            accountId: 1969,
            amount: 10000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'transfer',
        date: 1733241600,
        note: 'Financial report sample voucher 5 (10000850)',
        lineItems: [
          {
            accountId: 1601,
            amount: 1233,
            description: '',
            debit: true,
          },
          {
            accountId: 1606,
            amount: 1233,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1732982400,
        note: 'Financial report sample voucher 6 (10000935)',
        lineItems: [
          {
            accountId: 1607,
            amount: 120000,
            description: '',
            debit: false,
          },
          {
            accountId: 1618,
            amount: 120000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'transfer',
        date: 1733241600,
        note: 'Financial report sample voucher 7 (10000940)',
        lineItems: [
          {
            accountId: 2103,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 1603,
            amount: 10000,
            description: '1203',
            debit: false,
          },
        ],
      },
      {
        type: 'transfer',
        date: 1733414400,
        note: 'Financial report sample voucher 8 (10000941)',
        lineItems: [
          {
            accountId: 2119,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 2125,
            amount: 10000,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733155200,
        note: 'Financial report sample voucher 9 (10000942)',
        lineItems: [
          {
            accountId: 1601,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 2128,
            amount: 10000,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733328000,
        note: 'Financial report sample voucher 10 (10000943)',
        lineItems: [
          {
            accountId: 2117,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 2121,
            amount: 10000,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733328000,
        note: 'Financial report sample voucher 11 (10000944)',
        lineItems: [
          {
            accountId: 2124,
            amount: 10000,
            description: '',
            debit: true,
          },
          {
            accountId: 2124,
            amount: 10000,
            description: '',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733414400,
        note: 'Financial report sample voucher 12 (10000945)',
        lineItems: [
          {
            accountId: 1645,
            amount: 100000,
            description: '',
            debit: false,
          },
          {
            accountId: 1668,
            amount: 100000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733414400,
        note: 'Financial report sample voucher 13 (10000947)',
        lineItems: [
          {
            accountId: 2108,
            amount: 100,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 2127,
            amount: 100,
            description: '120611111',
            debit: true,
          },
          {
            accountId: 2126,
            amount: 100,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 2109,
            amount: 100,
            description: '120611111',
            debit: true,
          },
          {
            accountId: 1629,
            amount: 100,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 1602,
            amount: 100,
            description: '120611111',
            debit: true,
          },
          {
            accountId: 1609,
            amount: 100,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 10001469,
            amount: 100,
            description: '120611111',
            debit: true,
          },
          {
            accountId: 10001469,
            amount: 10,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 10001469,
            amount: 10,
            description: '120611111',
            debit: true,
          },
          {
            accountId: 2126,
            amount: 100,
            description: '120611111',
            debit: false,
          },
          {
            accountId: 1605,
            amount: 100,
            description: '120611111',
            debit: true,
          },
        ],
      },
      {
        type: 'transfer',
        date: 1733414400,
        note: 'Financial report sample voucher 14 (10000948)',
        lineItems: [
          {
            accountId: 1668,
            amount: 100,
            description: '',
            debit: true,
          },
          {
            accountId: 10001469,
            amount: 100,
            description: '010',
            debit: false,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733414400,
        note: 'Financial report sample voucher 15 (10000949)',
        lineItems: [
          {
            accountId: 2126,
            amount: 1000000,
            description: '',
            debit: false,
          },
          {
            accountId: 10001469,
            amount: 1000000,
            description: '',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1733587200,
        note: 'Financial report sample voucher 16 (10001122)',
        lineItems: [
          {
            accountId: 1603,
            amount: 100,
            description: '測試1',
            debit: false,
          },
          {
            accountId: 1601,
            amount: 100,
            description: '測試1',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1734537600,
        note: 'Financial report sample voucher 17 (10001399)',
        lineItems: [
          {
            accountId: 2108,
            amount: 123,
            description: '',
            debit: false,
          },
          {
            accountId: 1601,
            amount: 123,
            description: '123',
            debit: true,
          },
        ],
      },
      {
        type: 'payment',
        date: 1734537600,
        note: 'Financial report sample voucher 18 (10001400)',
        lineItems: [
          {
            accountId: 1606,
            amount: 1230,
            description: '',
            debit: false,
          },
          {
            accountId: 1604,
            amount: 1230,
            description: '',
            debit: true,
          },
        ],
      },
    ];
     */
  }

  /**
   * Info: (20250721 - Shirley) Expected income statement account items for integration test validation
   * Returns the expected account data that should appear in income statement after posting sample vouchers
   */
  static expectedIncomeStatementItems() {
    return [
      {
        accountId: 1369,
        code: '6213',
        name: '管理費用 - 旅費',
        curPeriodAmount: -10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1056,
        code: '6200',
        name: '管理費用',
        curPeriodAmount: -10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1009,
        code: '6000',
        name: '營業費用合計',
        curPeriodAmount: -10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1011,
        code: '6900',
        name: '營業利益（損失）',
        curPeriodAmount: 10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1013,
        code: '7900',
        name: '繼續營業單位稅前淨利（淨損）',
        curPeriodAmount: 10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1015,
        code: '8000',
        name: '繼續營業單位本期淨利（淨損）',
        curPeriodAmount: 10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1018,
        code: '8200',
        name: '本期淨利（淨損）',
        curPeriodAmount: 10000,
        prePeriodAmount: 0,
      },
      {
        accountId: 1021,
        code: '8500',
        name: '本期綜合損益總額',
        curPeriodAmount: 10000,
        prePeriodAmount: 0,
      },
    ];
  }

  /**
   * Info: (20250721 - Shirley) Expected ledger data for integration test validation
   * Returns the expected ledger data that should appear after posting sample vouchers
   */
  static expectedLedgerData() {
    const ledgerData: ILedgerItem[] = [
      {
        id: 10000430,
        accountId: 1601,
        voucherId: 10000215,
        voucherDate: 1753050000,
        no: '1101',
        accountingTitle: '庫存現金',
        voucherNumber: '20250721001',
        voucherType: VoucherType.EXPENSE,
        particulars: '測試1',
        debitAmount: 100,
        creditAmount: 0,
        balance: 100,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000443,
        accountId: 1601,
        voucherId: 10000221,
        voucherDate: 1753071600,
        no: '1101',
        accountingTitle: '庫存現金',
        voucherNumber: '20250721007',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 0,
        creditAmount: 10000,
        balance: -9900,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000431,
        accountId: 1603,
        voucherId: 10000215,
        voucherDate: 1753050000,
        no: '1103',
        accountingTitle: '銀行存款',
        voucherNumber: '20250721001',
        voucherType: VoucherType.EXPENSE,
        particulars: '測試1',
        debitAmount: 0,
        creditAmount: 100,
        balance: -100,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000434,
        accountId: 1603,
        voucherId: 10000217,
        voucherDate: 1753057200,
        no: '1103',
        accountingTitle: '銀行存款',
        voucherNumber: '20250721003',
        voucherType: VoucherType.TRANSFER,
        particulars: '1203',
        debitAmount: 0,
        creditAmount: 10000,
        balance: -10100,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000444,
        accountId: 1603,
        voucherId: 10000222,
        voucherDate: 1753075200,
        no: '1103',
        accountingTitle: '銀行存款',
        voucherNumber: '20250721008',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 10000,
        creditAmount: 0,
        balance: -100,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000441,
        accountId: 1607,
        voucherId: 10000220,
        voucherDate: 1753068000,
        no: '1112',
        accountingTitle: '指定透過損益按公允價值衡量之金融資產評價調整－流動',
        voucherNumber: '20250721006',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 0,
        creditAmount: 120000,
        balance: -120000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000442,
        accountId: 1608,
        voucherId: 10000221,
        voucherDate: 1753071600,
        no: '1113',
        accountingTitle: '強制透過損益按公允價值衡量之金融資產－流動',
        voucherNumber: '20250721007',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 10000,
        creditAmount: 0,
        balance: 10000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000440,
        accountId: 1618,
        voucherId: 10000220,
        voucherDate: 1753068000,
        no: '1151',
        accountingTitle: '應收票據',
        voucherNumber: '20250721006',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 120000,
        creditAmount: 0,
        balance: 120000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000439,
        accountId: 1645,
        voucherId: 10000219,
        voucherDate: 1753064400,
        no: '119D',
        accountingTitle: '融資租賃之未賺得融資收益',
        voucherNumber: '20250721005',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 0,
        creditAmount: 100000,
        balance: -100000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000435,
        accountId: 2103,
        voucherId: 10000217,
        voucherDate: 1753057200,
        no: '1311',
        accountingTitle: '製成品',
        voucherNumber: '20250721003',
        voucherType: VoucherType.TRANSFER,
        particulars: '',
        debitAmount: 10000,
        creditAmount: 0,
        balance: 10000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000433,
        accountId: 2108,
        voucherId: 10000216,
        voucherDate: 1753053600,
        no: '1316',
        accountingTitle: '物料',
        voucherNumber: '20250721002',
        voucherType: VoucherType.EXPENSE,
        particulars: '120611111',
        debitAmount: 0,
        creditAmount: 100,
        balance: -100,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000437,
        accountId: 2117,
        voucherId: 10000218,
        voucherDate: 1753060800,
        no: '1328',
        accountingTitle: '在途材料',
        voucherNumber: '20250721004',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 10000,
        creditAmount: 0,
        balance: 10000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000436,
        accountId: 2121,
        voucherId: 10000218,
        voucherDate: 1753060800,
        no: '1333',
        accountingTitle: '餐飲用品（餐飲業）',
        voucherNumber: '20250721004',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 0,
        creditAmount: 10000,
        balance: -10000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000438,
        accountId: 1668,
        voucherId: 10000219,
        voucherDate: 1753064400,
        no: '1340',
        accountingTitle: '農業產品',
        voucherNumber: '20250721005',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 100000,
        creditAmount: 0,
        balance: 100000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000432,
        accountId: 2127,
        voucherId: 10000216,
        voucherDate: 1753053600,
        no: '1354',
        accountingTitle: '在建費用',
        voucherNumber: '20250721002',
        voucherType: VoucherType.EXPENSE,
        particulars: '120611111',
        debitAmount: 100,
        creditAmount: 0,
        balance: 100,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
      {
        id: 10000445,
        accountId: 1369,
        voucherId: 10000222,
        voucherDate: 1753075200,
        no: '6213',
        accountingTitle: '管理費用 - 旅費',
        voucherNumber: '20250721008',
        voucherType: VoucherType.EXPENSE,
        particulars: '',
        debitAmount: 0,
        creditAmount: 10000,
        balance: -10000,
        createdAt: 1753157252,
        updatedAt: 1753157252,
      },
    ];

    return {
      payload: {
        data: ledgerData,
        page: 1,
        totalPages: 1,
        totalCount: 16,
        pageSize: 100,
        hasNextPage: false,
        hasPreviousPage: false,
        sort: [{ sortBy: 'voucherDate', sortOrder: 'asc' }],
        note: '{"currencyAlias":"TWD","total":{"totalDebitAmount":260200,"totalCreditAmount":260200,"createdAt":0,"updatedAt":0}}',
      },
    };
  }

  /**
   * Info: (20250721 - Shirley) Expected trial balance data for integration test validation
   * Returns the expected trial balance data from trial_balance_response_step4_1753080363958.json
   */
  static expectedTrialBalanceData() {
    return {
      payload: {
        data: [
          {
            id: 1607,
            no: '1112',
            accountingTitle: '指定透過損益按公允價值衡量之金融資產評價調整－流動',
            beginningCreditAmount: 120000,
            beginningDebitAmount: 0,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 120000,
            endingDebitAmount: 0,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1645,
            no: '119D',
            accountingTitle: '融資租賃之未賺得融資收益',
            beginningCreditAmount: 100000,
            beginningDebitAmount: 0,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 100000,
            endingDebitAmount: 0,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1603,
            no: '1103',
            accountingTitle: '銀行存款',
            beginningCreditAmount: 10100,
            beginningDebitAmount: 10000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 10100,
            endingDebitAmount: 10000,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1601,
            no: '1101',
            accountingTitle: '庫存現金',
            beginningCreditAmount: 10000,
            beginningDebitAmount: 100,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 10000,
            endingDebitAmount: 100,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1369,
            no: '6213',
            accountingTitle: '管理費用 - 旅費',
            beginningCreditAmount: 10000,
            beginningDebitAmount: 0,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 10000,
            endingDebitAmount: 0,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 2121,
            no: '1333',
            accountingTitle: '餐飲用品（餐飲業）',
            beginningCreditAmount: 10000,
            beginningDebitAmount: 0,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 10000,
            endingDebitAmount: 0,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 2108,
            no: '1316',
            accountingTitle: '物料',
            beginningCreditAmount: 100,
            beginningDebitAmount: 0,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 100,
            endingDebitAmount: 0,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1608,
            no: '1113',
            accountingTitle: '強制透過損益按公允價值衡量之金融資產－流動',
            beginningCreditAmount: 0,
            beginningDebitAmount: 10000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 0,
            endingDebitAmount: 10000,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1618,
            no: '1151',
            accountingTitle: '應收票據',
            beginningCreditAmount: 0,
            beginningDebitAmount: 120000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 0,
            endingDebitAmount: 120000,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 2103,
            no: '1311',
            accountingTitle: '製成品',
            beginningCreditAmount: 0,
            beginningDebitAmount: 10000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 0,
            endingDebitAmount: 10000,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 2117,
            no: '1328',
            accountingTitle: '在途材料',
            beginningCreditAmount: 0,
            beginningDebitAmount: 10000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 0,
            endingDebitAmount: 10000,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 1668,
            no: '1340',
            accountingTitle: '農業產品',
            beginningCreditAmount: 0,
            beginningDebitAmount: 100000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 0,
            endingDebitAmount: 100000,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
          {
            id: 2127,
            no: '1354',
            accountingTitle: '在建費用',
            beginningCreditAmount: 0,
            beginningDebitAmount: 100,
            midtermCreditAmount: 0,
            midtermDebitAmount: 0,
            endingCreditAmount: 0,
            endingDebitAmount: 100,
            subAccounts: [],
            createAt: 0,
            updateAt: 0,
          },
        ],
        page: 1,
        totalPages: 1,
        totalCount: 13,
        pageSize: 100,
        hasNextPage: false,
        hasPreviousPage: false,
        sort: [
          {
            sortBy: 'BeginningCreditAmount',
            sortOrder: 'desc',
          },
        ],
        note: '{"currencyAlias":"TWD","total":{"beginningCreditAmount":260200,"beginningDebitAmount":260200,"midtermCreditAmount":0,"midtermDebitAmount":0,"endingCreditAmount":260200,"endingDebitAmount":260200,"createAt":0,"updateAt":0}}',
      },
    };
  }
}
