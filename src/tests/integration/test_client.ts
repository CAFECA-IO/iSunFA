/**
 * Integration Test Client for Next.js API Routes
 *
 * This module provides a singleton-based HTTP server wrapper for testing Next.js API handlers
 * using Supertest. It implements server caching to prevent race conditions and improve performance
 * during parallel test execution.
 *
 * Main Features:
 * - Singleton pattern: Each API handler gets exactly one server instance to prevent conflicts
 * - Server caching: Reuses existing servers to avoid resource duplication
 * - Dynamic route support: Handles parameterized routes like [email] with proper query injection
 * - Race condition prevention: Uses Map-based caching to ensure thread-safe server creation
 * - Proper cleanup: Provides utilities to close all active servers and clear caches
 *
 * Architecture:
 * - createTestClient: Creates cached HTTP servers for standard API routes
 * - createDynamicTestClient: Creates cached servers for dynamic routes with parameters
 * - closeAllTestServers: Cleanup function to properly close all active servers
 *
 * Singleton Benefits:
 * - Prevents port conflicts during parallel test execution
 * - Improves test performance through server reuse
 * - Ensures consistent test environment across test suites
 * - Reduces memory footprint by eliminating duplicate servers
 *
 * Usage:
 * const client = createTestClient(handler);
 * const response = await client.get('/api/endpoint');
 */
import { createServer, RequestListener, IncomingMessage, ServerResponse, Server } from 'http';
import { NextApiHandler } from 'next';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';
// eslint-disable-next-line import/no-extraneous-dependencies
import request from 'supertest';

interface ExtendedIncomingMessage extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

const activeServers = new Set<Server>();
const serverCache = new Map<NextApiHandler, Server>();

export const createTestClient = (handler: NextApiHandler) => {
  let server = serverCache.get(handler);

  if (!server) {
    const listener: RequestListener = (req: ExtendedIncomingMessage, res: ServerResponse) => {
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

export const createDynamicTestClient = (
  handler: NextApiHandler,
  routeParams: Record<string, string>
) => {
  const cacheKey = `${handler.toString()}_${JSON.stringify(routeParams)}`;
  let server = dynamicServerCache.get(cacheKey);

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

      if (req.query) {
        Object.assign(req.query, routeParams);
      } else {
        req.query = routeParams;
      }

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
    dynamicServerCache.set(cacheKey, server);
    activeServers.add(server);
  }

  return request(server);
};

export type TestClient = ReturnType<typeof createTestClient>;

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
