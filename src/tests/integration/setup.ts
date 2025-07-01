import { PrismaClient } from '@prisma/client';
import { DefaultValue } from '@/constants/default_value';
import { spawn, ChildProcess } from 'child_process';
import { testLoggers } from '@/tests/integration/utils/test_logger';

// Info: (20250620 - Shirley) Integration test setup utilities with server lifecycle management
export class IntegrationTestSetup {
  private static prisma: PrismaClient;

  private static serverProcess: ChildProcess | null = null;

  private static readonly TEST_PORT = 3001;

  private static isServerReady = false;

  static async initialize(): Promise<PrismaClient> {
    // Info: (20250620 - Shirley) Initialize database connection
    if (!IntegrationTestSetup.prisma) {
      IntegrationTestSetup.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }

    // Info: (20250620 - Shirley) Start server if not already running
    await IntegrationTestSetup.startServer();

    return IntegrationTestSetup.prisma;
  }

  static async cleanup(): Promise<void> {
    // Info: (20250620 - Shirley) Stop server
    await IntegrationTestSetup.stopServer();

    // Info: (20250620 - Shirley) Disconnect database
    if (IntegrationTestSetup.prisma) {
      await IntegrationTestSetup.prisma.$disconnect();
    }
  }

  private static async startServer(): Promise<void> {
    if (IntegrationTestSetup.isServerReady) {
      return;
    }

    testLoggers.setup.debug('🚀 Starting Next.js server for integration tests...');

    try {
      // Info: (20250620 - Shirley) Set environment variable for test port
      process.env.PORT = IntegrationTestSetup.TEST_PORT.toString();

      // Info: (20250620 - Shirley) Spawn Next.js development server
      IntegrationTestSetup.serverProcess = spawn('npm', ['run', 'dev'], {
        env: {
          ...process.env,
          PORT: IntegrationTestSetup.TEST_PORT.toString(),
        },
        stdio: 'pipe',
      });

      // Info: (20250620 - Shirley) Handle server process events
      IntegrationTestSetup.serverProcess.on('error', (error) => {
        testLoggers.setup.debug('❌ Server process error:', error);
      });

      // Info: (20250620 - Shirley) Wait for server to be ready
      await IntegrationTestSetup.waitForServerReady();
      IntegrationTestSetup.isServerReady = true;

      testLoggers.setup.debug(`✅ Test server running on port ${IntegrationTestSetup.TEST_PORT}`);
    } catch (error) {
      testLoggers.setup.debug('❌ Failed to start test server:', error);
      await IntegrationTestSetup.stopServer();
      throw error;
    }
  }

  private static async stopServer(): Promise<void> {
    if (IntegrationTestSetup.serverProcess) {
      testLoggers.setup.debug('🛑 Stopping test server...');

      IntegrationTestSetup.serverProcess.kill('SIGTERM');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (IntegrationTestSetup.serverProcess) {
            IntegrationTestSetup.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        IntegrationTestSetup.serverProcess!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      IntegrationTestSetup.serverProcess = null;

      testLoggers.setup.debug('✅ Test server stopped');
    }

    IntegrationTestSetup.isServerReady = false;
  }

  private static async waitForServerReady(): Promise<void> {
    const maxAttempts = 60; // Info: (20250620 - Shirley) 60 attempts
    const delayBetweenAttempts = 1000; // Info: (20250620 - Shirley) 1 second

    let attempt = 1;

    // eslint-disable-next-line no-await-in-loop
    while (attempt <= maxAttempts) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(
          `http://localhost:${IntegrationTestSetup.TEST_PORT}/api/v2/status_info`
        );
        if (response.ok) {
          testLoggers.setup.debug(`✅ Server is ready after ${attempt} attempts`);
          return;
        }
      } catch (error) {
        // Info: (20250620 - Shirley) Expected during startup
      }

      if (attempt < maxAttempts) {
        testLoggers.setup.debug(
          `⏳ Waiting for server to be ready... (attempt ${attempt}/${maxAttempts})`
        );

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(resolve, delayBetweenAttempts);
        });
      }
      attempt += 1;
    }

    throw new Error('Server failed to become ready within the expected time');
  }

  // Info: (20250619 - Shirley) Default test emails for integration testing
  static getTestEmail(): string {
    return DefaultValue.EMAIL_LOGIN.EMAIL[0]; // Info: (20250619 - Shirley) user@isunfa.com
  }

  static getTestVerificationCode(): string {
    return DefaultValue.EMAIL_LOGIN.CODE; // Info: (20250619 - Shirley) 555666
  }

  // Info: (20250620 - Shirley) API base URL for testing
  static getApiBaseUrl(): string {
    return `http://localhost:${IntegrationTestSetup.TEST_PORT}`;
  }

  // Info: (20250619 - Shirley) Generate test data helpers
  static generateTestTeamName(): string {
    return `Test Team ${Date.now()}`;
  }

  static generateTestCompanyName(): string {
    return `Test Company ${Date.now()}`;
  }
}
