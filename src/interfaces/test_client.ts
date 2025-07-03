import { NextApiHandler } from 'next';
import request from 'supertest';

export interface TestClientOptions {
  handler: NextApiHandler;
  routeParams?: Record<string, string>;
}

export type TestClient = ReturnType<typeof request>;
