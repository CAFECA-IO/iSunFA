/** Info: (20250703 - Shirley)
 * Integration Test Client for Next.js API Routes
 *
 * Provides a singleton-based HTTP server wrapper for testing Next.js API handlers using Supertest.
 * Implements server caching to prevent race conditions during parallel test execution.
 *
 * Purpose:
 * - Test Next.js API routes without full server startup
 * - Singleton pattern prevents port conflicts in parallel tests
 * - Automatic route type detection (static vs dynamic)
 *
 * Usage:
 * // Static route: /api/users
 * const client = createTestClient(handler);
 * const response = await client.get('/api/users');
 *
 * // Dynamic route: /api/users/[email]
 * const client = createTestClient({ handler, routeParams: { email: 'test@example.com' } });
 * const response = await client.get('/api/users/test@example.com');
 */

/**
 * Info: (20250709 - Tzuhan)
 * - 如果需要測試檔案上傳，請見 04_upload.test.ts 的技術限制說明。
 */
import { createServer, RequestListener, IncomingMessage, ServerResponse, Server } from 'http';
import { NextApiHandler } from 'next';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';
// Info: (20250703 - Shirley) Supertest is test library and not a dependency of the project
// eslint-disable-next-line import/no-extraneous-dependencies
import request from 'supertest';
import { TestClientOptions } from '@/interfaces/test_client';

interface ExtendedIncomingMessage extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

const activeServers = new Set<Server>();
const serverCache = new Map<NextApiHandler, Server>();

export const createSingleTestClient = (handler: NextApiHandler) => {
  let server = serverCache.get(handler);

  if (!server) {
    const listener: RequestListener = (req: ExtendedIncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', 'http://localhost');

      if (!req.query) {
        req.query = {};
      }

      url.searchParams.forEach((value, key) => {
        if (req.query) {
          req.query[key] = value;
        }
      });

      if (!req.headers) {
        req.headers = {};
      }

      req.headers['user-agent'] = req.headers['user-agent'] || 'supertest-agent';
      req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || '127.0.0.1';
      req.headers['x-real-ip'] = req.headers['x-real-ip'] || '127.0.0.1';

      return apiResolver(
        req,
        res,
        req.query,
        handler,
        {
          previewModeEncryptionKey: '',
          previewModeId: '',
          previewModeSigningKey: '',
        },
        false
      );
    };
    server = createServer(listener);
    serverCache.set(handler, server);
    activeServers.add(server);
  }

  return request(server);
};

const dynamicServerCache = new Map<string, Server>();

const createDynamicTestClient = (
  handler: NextApiHandler,
  routeParams: Record<string, string>,
  queryParams: Record<string, string | string[]>
) => {
  const cacheKey = `${handler.toString()}_${JSON.stringify(routeParams)}`;
  let server = dynamicServerCache.get(cacheKey);

  if (!server) {
    const listener: RequestListener = (req: ExtendedIncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', 'http://localhost');

      const mergedQuery = {
        ...(req.query || {}),
        ...Object.fromEntries(url.searchParams.entries()),
        ...queryParams,
        ...routeParams,
      };

      url.searchParams.forEach((value, key) => {
        if (req.query) {
          req.query[key] = value;
        }
      });

      if (!req.headers) {
        req.headers = {};
      }

      req.headers['user-agent'] = req.headers['user-agent'] || 'supertest-agent';
      req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || '127.0.0.1';
      req.headers['x-real-ip'] = req.headers['x-real-ip'] || '127.0.0.1';

      return apiResolver(
        req,
        res,
        mergedQuery,
        handler,
        {
          previewModeEncryptionKey: '',
          previewModeId: '',
          previewModeSigningKey: '',
        },
        false
      );
    };
    server = createServer(listener);
    dynamicServerCache.set(cacheKey, server);
    activeServers.add(server);
  }

  return request(server);
};

export const createTestClient = (options: TestClientOptions | NextApiHandler) => {
  if (typeof options === 'function') {
    return createSingleTestClient(options);
  }

  if ((options.routeParams && Object.keys(options.routeParams).length > 0) || options.queryParams) {
    return createDynamicTestClient(
      options.handler,
      options.routeParams || {},
      options.queryParams || {}
    );
  }

  return createSingleTestClient(options.handler);
};

export const closeAllTestServers = (): Promise<void> => {
  return Promise.all(
    Array.from(activeServers).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => {
            activeServers.delete(server);
            resolve();
          });
        })
    )
  ).then(() => {
    serverCache.clear();
    dynamicServerCache.clear();
  });
};
