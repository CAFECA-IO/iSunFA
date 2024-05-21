import { NextApiRequest, NextApiResponse } from 'next';
import { IUser } from '@/interfaces/user';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let user: IUser;

beforeEach(async () => {
  req = {
    headers: {},
    body: null,
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
  user = await prisma.user.create({
    data: {
      name: 'John',
      credentialId: '129999',
      publicKey: 'publicKey',
      algorithm: 'ES256',
      imageId: 'imageId',
    },
  });
});

afterEach(async () => {
  jest.clearAllMocks();
  const afterUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });
  if (afterUser) {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });
  }
});

describe('test user API', () => {
  it('should list all users', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            credentialId: expect.any(String),
            publicKey: expect.any(String),
            algorithm: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('should create a new user', async () => {
    req.method = 'POST';
    req.body = {
      name: 'John',
      fullName: 'John Doe',
      email: 'john@mermer.cc',
      phone: '1234567890',
      credentialId: '123456',
      publicKey: 'publicKey',
      algorithm: 'ES256',
      imageId: 'imageId',
    };
    await handler(req, res);
    await prisma.user.delete({
      where: {
        id: res.json.mock.calls[0][0].payload.id,
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('201'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          fullName: expect.any(String),
          email: expect.any(String),
          phone: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
        }),
      })
    );
  });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'PUT';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('405'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});
