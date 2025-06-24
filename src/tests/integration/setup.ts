import { PrismaClient } from '@prisma/client';
import { DefaultValue } from '@/constants/default_value';
import { spawn, ChildProcess } from 'child_process';

// Info: (20250620) Integration test setup utilities with server lifecycle management
export class IntegrationTestSetup {
  private static prisma: PrismaClient;

  private static serverProcess: ChildProcess | null = null;

  private static readonly TEST_PORT = 3001;

  private static isServerReady = false;

  static async initialize(): Promise<PrismaClient> {
    // Initialize database connection
    if (!IntegrationTestSetup.prisma) {
      IntegrationTestSetup.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }

    // Start server if not already running
    await IntegrationTestSetup.startServer();

    return IntegrationTestSetup.prisma;
  }

  static async cleanup(): Promise<void> {
    // Stop server
    await IntegrationTestSetup.stopServer();

    // Disconnect database
    if (IntegrationTestSetup.prisma) {
      await IntegrationTestSetup.prisma.$disconnect();
    }
  }

  private static async startServer(): Promise<void> {
    if (IntegrationTestSetup.isServerReady) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('🚀 Starting Next.js server for integration tests...');

    try {
      // Set environment variable for test port
      process.env.PORT = IntegrationTestSetup.TEST_PORT.toString();

      // Spawn Next.js development server
      IntegrationTestSetup.serverProcess = spawn('npm', ['run', 'dev'], {
        env: {
          ...process.env,
          PORT: IntegrationTestSetup.TEST_PORT.toString(),
        },
        stdio: 'pipe',
      });

      // Handle server process events
      IntegrationTestSetup.serverProcess.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.error('❌ Server process error:', error);
      });

      // Wait for server to be ready
      await IntegrationTestSetup.waitForServerReady();
      IntegrationTestSetup.isServerReady = true;

      // eslint-disable-next-line no-console
      console.log(`✅ Test server running on port ${IntegrationTestSetup.TEST_PORT}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to start test server:', error);
      await IntegrationTestSetup.stopServer();
      throw error;
    }
  }

  private static async stopServer(): Promise<void> {
    if (IntegrationTestSetup.serverProcess) {
      // eslint-disable-next-line no-console
      console.log('🛑 Stopping test server...');

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
      // eslint-disable-next-line no-console
      console.log('✅ Test server stopped');
    }

    IntegrationTestSetup.isServerReady = false;
  }

  private static async waitForServerReady(): Promise<void> {
    const maxAttempts = 60; // 60 attempts
    const delayBetweenAttempts = 1000; // 1 second

    let attempt = 1;
    // eslint-disable-next-line no-await-in-loop
    while (attempt <= maxAttempts) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(
          `http://localhost:${IntegrationTestSetup.TEST_PORT}/api/v2/status_info`
        );
        if (response.ok) {
          // eslint-disable-next-line no-console
          console.log(`✅ Server is ready after ${attempt} attempts`);
          return;
        }
      } catch (error) {
        // Expected during startup
      }

      if (attempt < maxAttempts) {
        // eslint-disable-next-line no-console
        console.log(`⏳ Waiting for server to be ready... (attempt ${attempt}/${maxAttempts})`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(resolve, delayBetweenAttempts);
        });
      }
      attempt += 1;
    }

    throw new Error('Server failed to become ready within the expected time');
  }

  // Info: (20250619) Default test emails for integration testing
  static getTestEmail(): string {
    return DefaultValue.EMAIL_LOGIN.EMAIL[0];
  }

  static getTestVerificationCode(): string {
    return DefaultValue.EMAIL_LOGIN.CODE;
  }

  // Info: (20250620) API base URL for testing
  static getApiBaseUrl(): string {
    return `http://localhost:${IntegrationTestSetup.TEST_PORT}`;
  }

  // Info: (20250619) Generate test data helpers
  static generateTestTeamName(): string {
    return `Test Team ${Date.now()}`;
  }

  static generateTestCompanyName(): string {
    return `Test Company ${Date.now()}`;
  }
}
