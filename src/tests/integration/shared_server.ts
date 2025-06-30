/* eslint-disable */
import { PrismaClient } from '@prisma/client';
import { DefaultValue } from '@/constants/default_value';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';

/**
 * Shared Test Server for Integration Tests
 * Manages a single server instance across all integration tests to avoid resource conflicts
 */
export class SharedTestServer {
  private static instance: SharedTestServer | null = null;

  private static prisma: PrismaClient | null = null;

  private static serverProcess: ChildProcess | null = null;

  private static serverPort: number = 0;

  private static isServerReady = false;

  private static startupPromise: Promise<void> | null = null;

  // private constructor() {}

  /**
   * Get or create the shared server instance
   * This ensures only one server runs across all tests
   */
  public static async getInstance(): Promise<SharedTestServer> {
    if (!SharedTestServer.instance) {
      SharedTestServer.instance = new SharedTestServer();
    }

    // If server startup is already in progress, wait for it
    if (SharedTestServer.startupPromise) {
      await SharedTestServer.startupPromise;
      return SharedTestServer.instance;
    }

    // If server is not ready, start it
    if (!SharedTestServer.isServerReady) {
      SharedTestServer.startupPromise = SharedTestServer.initializeServer();
      await SharedTestServer.startupPromise;
      SharedTestServer.startupPromise = null;
    }

    return SharedTestServer.instance;
  }

  /**
   * Initialize database and server
   */
  private static async initializeServer(): Promise<void> {
    try {
      // Initialize database connection
      if (!SharedTestServer.prisma) {
        SharedTestServer.prisma = new PrismaClient({
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
        });
      }

      // Start server if not already running
      await SharedTestServer.startServer();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Failed to initialize shared test server:', error);
      await SharedTestServer.cleanup();
      throw error;
    }
  }

  /**
   * Find an available port for the test server
   */
  private static async findAvailablePort(startPort: number = 3001): Promise<number> {
    for (let port = startPort; port < startPort + 100; port++) {
      if (await SharedTestServer.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error('No available ports found for test server');
  }

  /**
   * Check if a port is available
   */
  private static async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Start the Next.js server with improved error handling and retry logic
   */
  private static async startServer(): Promise<void> {
    if (SharedTestServer.isServerReady) {
      return;
    }

    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        // eslint-disable-next-line no-console
        console.log(`🚀 Starting shared test server (attempt ${attempt}/${maxRetries})...`);

        // Find available port
        SharedTestServer.serverPort = await SharedTestServer.findAvailablePort(3001);

        // eslint-disable-next-line no-console
        console.log(`🔌 Using port ${SharedTestServer.serverPort} for test server`);

        // Set environment variables
        process.env.PORT = SharedTestServer.serverPort.toString();
        process.env.INTEGRATION_TEST = 'true';

        // Spawn Next.js development server
        SharedTestServer.serverProcess = spawn('npm', ['run', 'dev'], {
          env: {
            ...process.env,
            PORT: SharedTestServer.serverPort.toString(),
            INTEGRATION_TEST: 'true',
            // Reduce Next.js build output in tests
            NEXT_TELEMETRY_DISABLED: '1',
          },
          stdio: 'pipe',
        });

        // Handle server process events
        SharedTestServer.serverProcess.on('error', (error) => {
          // eslint-disable-next-line no-console
          console.error('❌ Server process error:', error);
        });

        SharedTestServer.serverProcess.on('exit', (code) => {
          if (code !== 0) {
            // eslint-disable-next-line no-console
            console.error(`❌ Server process exited with code ${code}`);
          }
          SharedTestServer.isServerReady = false;
        });

        // Wait for server to be ready with timeout
        await SharedTestServer.waitForServerReady();
        SharedTestServer.isServerReady = true;

        // eslint-disable-next-line no-console
        console.log(`✅ Shared test server running on port ${SharedTestServer.serverPort}`);

        // Warm up the server
        await SharedTestServer.warmupServer();
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`❌ Failed to start server (attempt ${attempt}):`, error);

        // Cleanup failed attempt
        if (SharedTestServer.serverProcess) {
          SharedTestServer.serverProcess.kill('SIGKILL');
          SharedTestServer.serverProcess = null;
        }

        if (attempt === maxRetries) {
          throw new Error(`Failed to start server after ${maxRetries} attempts: ${error}`);
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempt++;
      }
    }
  }

  /**
   * Wait for server to be ready with health checks
   */
  private static async waitForServerReady(): Promise<void> {
    const maxAttempts = 120; // 2 minutes with 1 second intervals
    const delayBetweenAttempts = 1000;

    let attempt = 1;
    while (attempt <= maxAttempts) {
      try {
        const response = await fetch(
          `http://localhost:${SharedTestServer.serverPort}/api/v2/status_info`,
          { signal: AbortSignal.timeout(5000) } // 5 second timeout per request
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
        if (attempt % 10 === 0) {
          // Log every 10 attempts to reduce noise
          // eslint-disable-next-line no-console
          console.log(`⏳ Waiting for server to be ready... (attempt ${attempt}/${maxAttempts})`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayBetweenAttempts));
      }
      attempt++;
    }

    throw new Error('Server failed to become ready within the expected time');
  }

  /**
   * Warm up the server by making some basic requests
   */
  private static async warmupServer(): Promise<void> {
    try {
      // Make a few requests to ensure server is fully operational
      const baseUrl = `http://localhost:${SharedTestServer.serverPort}`;
      const warmupRequests = [
        fetch(`${baseUrl}/api/v2/status_info`),
        fetch(`${baseUrl}/api/v2/role?type=USER`),
      ];

      await Promise.allSettled(warmupRequests);
      // eslint-disable-next-line no-console
      console.log('🔥 Server warmup completed');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ Server warmup failed, but continuing:', error);
    }
  }

  /**
   * Clean up test state between tests (but keep server running)
   */
  public async cleanTestState(): Promise<void> {
    try {
      // Clear any test-specific state
      // Note: We don't clean the database here as it might be needed for tests
      // Tests should handle their own data cleanup if needed
      // Clear any temporary files or cached data if needed
      // This is where you'd add cleanup logic for test artifacts
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ Test state cleanup failed:', error);
    }
  }

  /**
   * Get the base URL for API requests
   */
  public getBaseUrl(): string {
    return `http://localhost:${SharedTestServer.serverPort}`;
  }

  /**
   * Get test credentials
   */
  static getTestCredentials(): { email: string; code: string } {
    return {
      email: DefaultValue.EMAIL_LOGIN.EMAIL[0],
      code: DefaultValue.EMAIL_LOGIN.CODE,
    };
  }

  /**
   * Generate test data helpers
   */
  static generateTestTeamName(): string {
    return `Test Team ${Date.now()}`;
  }

  static generateTestCompanyName(): string {
    return `Test Company ${Date.now()}`;
  }

  /**
   * Get database client
   */
  static getDatabase(): PrismaClient {
    if (!SharedTestServer.prisma) {
      throw new Error('Database not initialized');
    }
    return SharedTestServer.prisma;
  }

  /**
   * Complete cleanup - stop server and disconnect database
   * This should only be called at the very end of all tests
   */
  public static async cleanup(): Promise<void> {
    try {
      // Stop server
      if (SharedTestServer.serverProcess) {
        // eslint-disable-next-line no-console
        console.log('🛑 Stopping shared test server...');

        SharedTestServer.serverProcess.kill('SIGTERM');

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (SharedTestServer.serverProcess) {
              SharedTestServer.serverProcess.kill('SIGKILL');
            }
            resolve();
          }, 10000); // 10 second timeout

          SharedTestServer.serverProcess!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        SharedTestServer.serverProcess = null;
        // eslint-disable-next-line no-console
        console.log('✅ Shared test server stopped');
      }

      // Disconnect database
      if (SharedTestServer.prisma) {
        await SharedTestServer.prisma.$disconnect();
        SharedTestServer.prisma = null;
      }

      // Reset state
      SharedTestServer.isServerReady = false;
      SharedTestServer.instance = null;
      SharedTestServer.startupPromise = null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Cleanup failed:', error);
    }
  }
}
