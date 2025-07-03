// Info: (20240701 - Shirley) Supertest wrapper for Next.js API handlers
import { createServer, RequestListener, IncomingMessage, ServerResponse, Server } from 'http';
import { NextApiHandler } from 'next';
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver';
// eslint-disable-next-line import/no-extraneous-dependencies
import request from 'supertest';

// Info: (20240701 - Shirley) Extended request interface for Next.js API handling
interface ExtendedIncomingMessage extends IncomingMessage {
  query?: Record<string, string | string[]>;
}

// Info: (20250102 - Shirley) Store active servers for cleanup
const activeServers = new Set<Server>();

// Info: (20250102 - Shirley) Cache servers by handler to avoid creating duplicates
const serverCache = new Map<NextApiHandler, Server>();

// Info: (20240701 - Shirley) Create a supertest client for testing Next.js API routes
export const createTestClient = (handler: NextApiHandler) => {
  // Info: (20250102 - Shirley) Reuse existing server for the same handler
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

// Info: (20250102 - Shirley) Cache for dynamic servers by handler and params combination
const dynamicServerCache = new Map<string, Server>();

// Info: (20240701 - Shirley) Create a specialized client for dynamic routes like [email]
export const createDynamicTestClient = (
  handler: NextApiHandler,
  routeParams: Record<string, string>
) => {
  // Info: (20250102 - Shirley) Create cache key from handler and params
  const cacheKey = `${handler.toString()}_${JSON.stringify(routeParams)}`;
  let server = dynamicServerCache.get(cacheKey);
  
  if (!server) {
    const listener: RequestListener = (req: ExtendedIncomingMessage, res: ServerResponse) => {
      // Info: (20240701 - Shirley) Parse the URL to extract path and query
      const url = new URL(req.url || '/', 'http://localhost');

      // Info: (20240701 - Shirley) Initialize query object if not exists
      if (!req.query) {
        req.query = {};
      }

      // Info: (20240701 - Shirley) Add URL query parameters to req.query
      url.searchParams.forEach((value, key) => {
        if (req.query) {
          req.query[key] = value;
        }
      });

      // Info: (20240701 - Shirley) Add dynamic route parameters to query
      if (req.query) {
        Object.assign(req.query, routeParams);
      } else {
        req.query = routeParams;
      }

      // Info: (20240701 - Shirley) Add required headers for testing
      if (!req.headers) {
        req.headers = {};
      }

      // Info: (20240701 - Shirley) Set default headers for testing
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

// Info: (20240701 - Shirley) Helper type for test client instance
export type TestClient = ReturnType<typeof createTestClient>;

// Info: (20250102 - Shirley) Cleanup function to close all active servers
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
    // Info: (20250102 - Shirley) Clear all caches after closing servers
    serverCache.clear();
    dynamicServerCache.clear();
  });
};
