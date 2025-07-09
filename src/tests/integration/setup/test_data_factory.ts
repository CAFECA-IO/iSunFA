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
}
