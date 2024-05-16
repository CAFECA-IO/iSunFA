import { NextApiRequest, NextApiResponse } from 'next';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;

beforeEach(() => {
  req = {
    headers: {},
    query: {},
    method: '',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('getAllEmployees API Handler Tests', () => {
  it('should return all employees information', async () => {
    req.method = 'GET';
    req.query = { page: '2', limit: '5' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          department: expect.any(String),
          salary: expect.any(Number),
        }),
      ]),
    });
  });
});

describe('CreateAnEmployee API Handler Tests', () => {
  it('should create a new employee information', async () => {
    req.method = 'POST';
    req.body = {
      name: 'Michael Chen',
      salary: 70000,
      department: 'Engineering',
      start_date: '2024-04-18',
      bonus: 5000,
      salary_payment_mode: 'Cash',
      pay_frequency: 'Monthly',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('201'),
      message: expect.any(String),
      payload: null,
    });
  });
  it('should return error if lack of some body element', async () => {
    req.method = 'POST';
    req.body = {
      salary: 70000,
      department: 'Engineering',
      start_date: '2024-04-18',
      bonus: 5000,
      salary_payment_mode: 'Cash',
      pay_frequency: 'Monthly',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
  });
});
