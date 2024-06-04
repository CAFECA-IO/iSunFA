import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
const report = {
  id: -100,
  name: "Balance Sheet-20240423-1",
  tokenContract: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
  tokenId: "37002036",
  reportLink: "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
  from: 1715616000,
  to: 1718208000,
  reportType: "balance_sheet",
  type: "financial",
  status: "generated",
  createdAt: 1713815673,
  updatedAt: 1713815673,
};

beforeEach(async () => {
  req = {
    headers: {},
    query: {},
    method: 'GET',
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  await prisma.report.create({
    data: {
      ...report,
    },
  });
});

afterEach(async () => {
  await prisma.report.delete({
    where: {
      id: report.id,
    },
  });
  jest.clearAllMocks();
});

describe('getReportById API Handler Tests', () => {
  it('should return report information', async () => {
    req.method = 'GET';
    const reportId = report.id.toString();
    req.query = { reportId };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);

    const payloadData = {
      reportTypesName: {
        id: expect.any(String),
        name: expect.any(String),
      },
      tokenContract: expect.any(String),
      tokenId: expect.any(String),
      reportLink: expect.any(String),
    };
    const resData = expect.objectContaining({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('200'),
      message: expect.any(String),
      payload: payloadData,
      });
    expect(res.json).toHaveBeenCalledWith(
      resData
    );
  });
  it('should return error if method is not GET', async () => {
    req.method = 'POST';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('405'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
  });
  it('should return error if report not found', async () => {
    req.method = 'GET';
    req.query = { reportId: '-2' };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      powerby: expect.any(String),
      success: expect.any(Boolean),
      code: expect.stringContaining('404'),
      message: expect.any(String),
      payload: expect.any(Object),
    });
  });
});
