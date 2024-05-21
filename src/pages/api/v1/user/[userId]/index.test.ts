import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import { IUser } from '@/interfaces/user';
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
      credentialId: '122222',
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

describe('test user API by userid', () => {
  it('should retrieve user by userid', async () => {
    req.headers.userid = '1';
    req.query.userId = user.id.toString();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
        }),
      })
    );
  });

  it('should update user by userid', async () => {
    req.headers.userid = '1';
    req.query.userId = user.id.toString();
    req.method = 'PUT';
    req.body = {
      name: 'Jane',
      email: 'Jane@mermer.cc',
      fullName: 'Jane Doe',
      phone: '1234567890',
      imageId: 'imageId',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
        }),
      })
    );
  });

  it('should delete user by userid', async () => {
    req.headers.userid = '1';
    req.query.userId = user.id.toString();
    req.method = 'DELETE';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('200'),
        message: expect.any(String),
        payload: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          credentialId: expect.any(String),
          publicKey: expect.any(String),
          algorithm: expect.any(String),
        }),
      })
    );
  });

  it('should handle unsupported HTTP methods', async () => {
    req.headers.userid = '1';
    req.query.userId = user.id.toString();
    req.method = 'POST';
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

  it('should handle missing userid in headers', async () => {
    req.query.userId = user.id.toString();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('404'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should handle missing userid in query', async () => {
    req.headers.userid = user.id.toString();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });

  it('should handle invalid userid', async () => {
    req.headers.userid = '-1';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        powerby: expect.any(String),
        success: expect.any(Boolean),
        code: expect.stringContaining('422'),
        message: expect.any(String),
        payload: expect.any(Object),
      })
    );
  });
});
