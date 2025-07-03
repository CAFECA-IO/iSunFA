// Info: (20250701 - Shirley) Test data factory using system default values for real user behavior simulation
import { DefaultValue } from '@/constants/default_value';

export class TestDataFactory {
  // Info: (20250701 - Shirley) Use system default emails and verification codes for testing
  static readonly DEFAULT_TEST_EMAILS = DefaultValue.EMAIL_LOGIN.EMAIL;

  static readonly DEFAULT_VERIFICATION_CODE = DefaultValue.EMAIL_LOGIN.CODE;

  // Info: (20250701 - Shirley) Primary test email (first in the list)
  static readonly PRIMARY_TEST_EMAIL = DefaultValue.EMAIL_LOGIN.EMAIL[0]; // user@isunfa.com

  static readonly TEST_EMAIL = DefaultValue.EMAIL_LOGIN.EMAIL;

  // Info: (20250701 - Shirley) Generate one-time password request for email login
  static createOTPRequest(email?: string): { email: string } {
    return {
      email: email || this.PRIMARY_TEST_EMAIL,
    };
  }

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
}
