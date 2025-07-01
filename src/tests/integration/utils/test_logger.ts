// Info: (20250701 - Shirley) Integration Test Logger based on Production Logger
// Reuses logger_back.ts infrastructure while optimizing for test environment

import loggerBack, { loggerError, loggerSystemEvent } from '@/lib/utils/logger_back';
import { Logger } from 'pino';

// Info: (20250701 - Shirley) Test-specific log context interface
export interface TestLogContext {
  module?: string;
  test?: string;
  operation?: string;
  userId?: number;
  [key: string]: unknown;
}

// Info: (20250701 - Shirley) Test Logger class that wraps production logger
export class TestLogger {
  private baseLogger: Logger;

  private context: TestLogContext;

  private enabled: boolean;

  constructor(context: TestLogContext = {}) {
    this.baseLogger = loggerBack;
    this.context = context;
    // Info: (20250701 - Shirley) Enable based on environment variables
    this.enabled = this.shouldEnableLogging();
  }

  private shouldEnableLogging(): boolean {
    // Always enable for errors and warnings
    const globalDebug = process.env.DEBUG_TESTS === 'true';
    const moduleDebug = this.getModuleDebugFlag();

    return globalDebug || moduleDebug;
  }

  private getModuleDebugFlag(): boolean {
    const { module } = this.context;
    if (!module) return true; // Default to enabled if no module specified

    // Info: (20250701 - Shirley) Module-specific debug flags
    const moduleFlags: Record<string, string> = {
      SharedServer: 'DEBUG_SERVER',
      ApiClient: 'DEBUG_API',
      Authentication: 'DEBUG_AUTH',
      TeamManagement: 'DEBUG_TEAM',
      GlobalSetup: 'DEBUG_SETUP',
      GlobalTeardown: 'DEBUG_TEARDOWN',
      HealthCheck: 'DEBUG_HEALTH',
    };

    const flagName = moduleFlags[module];
    return flagName ? process.env[flagName] === 'true' : true;
  }

  private createLogData(message: string, ...args: unknown[]) {
    const logData: Record<string, unknown> = {
      ...this.context,
      message,
    };

    // Add arguments to log data
    if (args.length > 0) {
      logData.args = args.map((arg) => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg);
        }
        return String(arg);
      });
    }

    return logData;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;

    const logData = this.createLogData(message, ...args);
    this.baseLogger.debug(logData, message);
  }

  info(message: string, ...args: unknown[]): void {
    const logData = this.createLogData(message, ...args);
    this.baseLogger.info(logData, message);
  }

  warn(message: string, ...args: unknown[]): void {
    const logData = this.createLogData(message, ...args);
    this.baseLogger.warn(logData, message);
  }

  error(message: string, ...args: unknown[]): void {
    const logData = this.createLogData(message, ...args);

    // Info: (20250701 - Shirley) Use production error logger for structured error handling
    if (args.length > 0 && args[0] instanceof Error) {
      loggerError({
        userId: this.context.userId || 0,
        errorType: `TEST_${this.context.module || 'UNKNOWN'}`,
        errorMessage: args[0],
      });
    } else {
      this.baseLogger.error(logData, message);
    }
  }

  // Info: (20250701 - Shirley) Create a new logger with additional context
  withContext(additionalContext: TestLogContext): TestLogger {
    const mergedContext = { ...this.context, ...additionalContext };
    return new TestLogger(mergedContext);
  }

  // Info: (20250701 - Shirley) Log system events using production logger
  systemEvent(eventType: string, details: object): void {
    loggerSystemEvent({
      eventType: `TEST_${eventType}`,
      details: {
        ...details,
        testContext: this.context,
      },
    });
  }

  // Info: (20250701 - Shirley) Convenience method for test lifecycle events
  testEvent(eventType: 'START' | 'END' | 'SETUP' | 'TEARDOWN', details?: object): void {
    this.systemEvent(`TEST_${eventType}`, {
      module: this.context.module,
      test: this.context.test,
      ...details,
    });
  }
}

// Info: (20250701 - Shirley) Factory function for creating test loggers
export const createTestLogger = (context?: TestLogContext): TestLogger => {
  return new TestLogger(context);
};

// Info: (20250701 - Shirley) Pre-configured loggers for common test modules
export const testLoggers = {
  server: createTestLogger({ module: 'SharedServer' }),
  setup: createTestLogger({ module: 'GlobalSetup' }),
  teardown: createTestLogger({ module: 'GlobalTeardown' }),
  apiClient: createTestLogger({ module: 'ApiClient' }),
  auth: createTestLogger({ module: 'Authentication' }),
  team: createTestLogger({ module: 'TeamManagement' }),
  health: createTestLogger({ module: 'HealthCheck' }),
} as const;

// Info: (20250701 - Shirley) Default logger instance
export const testLogger = createTestLogger();

// Info: (20250701 - Shirley) Backwards compatibility function
export const debugLog = (...args: unknown[]): void => {
  testLogger.debug(String(args[0]), ...args.slice(1));
};

// Info: (20250701 - Shirley) Re-export production logger utilities for advanced use cases
export { loggerError, loggerSystemEvent } from '@/lib/utils/logger_back';
