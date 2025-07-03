import { NextApiHandler } from 'next';
// eslint-disable-next-line import/no-extraneous-dependencies
import request from 'supertest';

export interface TestClientOptions {
  handler: NextApiHandler;
  routeParams?: Record<string, string>;
}

export type TestClient = ReturnType<typeof request>;
