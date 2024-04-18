import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    body: null,
    query: { id: '1' },
    method: 'POST',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

describe('test post login API', () => {
  it('should create user', async () => {
    req.body = { credentialId: 'smaJ6Wwf0q_meZiHrFolfg' };
    await handler(req, res);
    const user = {
      name: 'John second Doe',
      credentialId: 'smaJ6Wwf0q_meZiHrFolfg',
      userImage: 'https://www.example.com/image.jpg',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api 1.0.0',
      success: true,
      code: '200',
      payload: user,
      message: 'Login sucessfully',
    });
  });

  it('should return existed user', async () => {
    req.body = { credentialId: 'sameId' };
    await handler(req, res);
    const user = {
      name: 'John Doe',
      credentialId: 'smaJ6Wwf0q_meZiHrFolfg',
      userImage: 'https://www.example.com/image.jpg',
    };
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api 1.0.0',
      success: true,
      code: '200',
      payload: user,
      message: 'Login sucessfully',
    });
  });
  it('should return error for GET request', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'ISunFa api 1.0.0',
      success: false,
      code: String(405),
      payload: {},
      message: 'Error: Method Not Allowed', // Convert error to string
    });
  });
});
