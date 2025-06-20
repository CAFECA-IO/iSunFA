import { PrismaClient } from '@prisma/client';
import { DefaultValue } from '@/constants/default_value';

// Info: (20250619) Integration test setup utilities
export class IntegrationTestSetup {
  private static prisma: PrismaClient;

  static async initialize(): Promise<PrismaClient> {
    if (!IntegrationTestSetup.prisma) {
      IntegrationTestSetup.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }
    return IntegrationTestSetup.prisma;
  }

  static async cleanup(): Promise<void> {
    if (IntegrationTestSetup.prisma) {
      await IntegrationTestSetup.prisma.$disconnect();
    }
  }

  // Info: (20250619) Default test emails for integration testing
  static getTestEmail(): string {
    return DefaultValue.EMAIL_LOGIN.EMAIL[0]; // user@isunfa.com
  }

  static getTestVerificationCode(): string {
    return DefaultValue.EMAIL_LOGIN.CODE; // 555666
  }

  // Info: (20250619) API base URL for testing
  static getApiBaseUrl(): string {
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }

  // Info: (20250619) Generate test data helpers
  static generateTestTeamName(): string {
    return `Test Team ${Date.now()}`;
  }

  static generateTestCompanyName(): string {
    return `Test Company ${Date.now()}`;
  }
}
