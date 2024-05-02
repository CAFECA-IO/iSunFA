import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
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

describe('getAnEmployee API Handler Tests', () => {
  it('should return specific employee information', async () => {
    req.method = 'GET';
    req.query = { employeeId: '3' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'request successful',
      payload: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          salary: expect.any(Number),
          department: expect.any(String),
          email: expect.any(String),
          start_date: expect.any(Date),
          bonus: expect.any(Number),
          salary_payment_mode: expect.any(String),
          pay_frequency: expect.any(String),
          projects: expect.arrayContaining([expect.any(String)]),
          insurance_payments: expect.any(Number),
          additional_of_total: expect.any(Number),
        }),
      ]),
    });
  });
});

describe('DeleteAnEmployee API Handler Tests', () => {
  it("should successfully delete an employee's information", async () => {
    req.method = 'DELETE';
    req.query = { employeeId: '3' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'delete employee successful',
    });
  });
  it('should return 400 if id is not provided', async () => {
    req.method = 'DELETE';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'delete employee failed',
    });
  });
});

describe('UpdateAnEmployee API Handler Tests', () => {
  it('should update specific employee information successfully', async () => {
    req.method = 'PUT';
    req.query = { employeeId: '3' };
    req.body = {
      name: 'Tiger',
      salary: 75000,
      department: 'Engineering',
      start_date: '2021-08-10',
      bonus: 5100,
      salary_payment_mode: 'Cash',
      pay_frequency: 'Monthly',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'update employee information successful',
    });
  });
  it('should return 400 if id is not provided', async () => {
    req.method = 'PUT';
    req.body = {
      name: 'Tiger',
      salary: 75000,
      department: 'Engineering',
      start_date: '2021-08-10',
      bonus: 5100,
      salary_payment_mode: 'Cash',
      pay_frequency: 'Monthly',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'update employee information failed',
    });
  });
  it('should return 400 if lack of some body element', async () => {
    req.method = 'PUT';
    req.query = { employeeId: '3' };
    req.body = {
      salary: 75000,
      department: 'Engineering',
      start_date: '2021-08-10',
      bonus: 5100,
      salary_payment_mode: 'Cash',
      pay_frequency: 'Monthly',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      powerby: 'iSunFA v' + version,
      success: false,
      code: '400',
      message: 'update employee information failed',
    });
  });
});
