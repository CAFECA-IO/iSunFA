import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/v1/company/[companyId]/employee/[employeeId]/index';

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

xdescribe('getAnEmployee API Handler Tests', () => {
  it('should return specific employee information', async () => {
    req.method = 'GET';
    req.query = { employeeId: '3' };
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

xdescribe('DeleteAnEmployee API Handler Tests', () => {
  it("should successfully delete an employee's information", async () => {
    req.method = 'DELETE';
    req.query = { employeeId: '3' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: null,
    });
  });
  it('should return error if id is not provided', async () => {
    req.method = 'DELETE';
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

xdescribe('UpdateAnEmployee API Handler Tests', () => {
  it('should update specific employee information successfully', async () => {
    req.method = 'PUT';
    req.query = { employeeId: '3' };
    req.body = {
      name: 'Tiger',
      salary: 75000,
      departmentId: 2,
      startDate: '2021-08-10',
      bonus: 5100,
      salaryPayMode: 'Cash',
      payFrequency: 'Monthly',
    };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: null,
    });
  });
  it('should return error if id is not provided', async () => {
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
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('422'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
  });
  it('should return error if lack of some body element', async () => {
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
