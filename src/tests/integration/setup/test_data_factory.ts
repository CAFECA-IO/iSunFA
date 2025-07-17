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
import { DefaultValue } from '@/constants/default_value';

export class TestDataFactory {
  // Info: (20250701 - Shirley) Use system default emails and verification codes for testing
  static readonly DEFAULT_TEST_EMAILS = DefaultValue.EMAIL_LOGIN.EMAIL;

  static readonly DEFAULT_VERIFICATION_CODE = DefaultValue.EMAIL_LOGIN.CODE;

  static readonly TEST_EMAIL = DefaultValue.EMAIL_LOGIN.EMAIL;

  // Info: (20250701 - Shirley) Primary test email (first in the list)
  static readonly PRIMARY_TEST_EMAIL = this.DEFAULT_TEST_EMAILS[0]; // Info: (20250701 - Shirley) user@isunfa.com

  static readonly PRIMARY_TEST_EMAIL_V1 = this.DEFAULT_TEST_EMAILS[1];

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
  }
}
