import prisma from '@/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { ICompanyKYC } from '@/interfaces/company_kyc';
import { timestampInSeconds } from '@/lib/utils/common';
import handler from './index';

let req: jest.Mocked<NextApiRequest>;
let res: jest.Mocked<NextApiResponse>;
let companyKYC: ICompanyKYC;

// Info: (20240424 - Murky) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

beforeEach(async () => {
  req = {
    headers: {
      userid: '123',
    },
    method: 'POST',
    query: {
      companyId: '4',
    },
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiRequest>;

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<NextApiResponse>;

  let company = await prisma.company.findFirst({
    where: {
      code: 'TST_kyc1',
    },
  });
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  if (!company) {
    company = await prisma.company.create({
      data: {
        code: 'TST_kyc1',
        name: 'Test Company',
        regional: 'TW',
        kycStatus: false,
        startDate: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  }
  companyKYC = await prisma.companyKYC.create({
    data: {
      company: {
        connect: {
          id: company.id,
        },
      },
      legalName: 'ABC Company',
      country: 'USA',
      city: 'New York',
      address: '123 Main Street',
      zipCode: '12345',
      representativeName: 'John Doe',
      structure: 'LLC',
      registrationNumber: '123456789',
      registrationDate: '2022-01-01',
      industry: 'Technology',
      contactPerson: 'Jane Smith',
      contactPhone: '123-456-7890',
      contactEmail: 'jane@example.com',
      website: 'https://example.com',
      representativeIdType: 'Passport',
      registrationCertificateId: 'ABC123',
      taxCertificateId: 'DEF456',
      representativeIdCardId: 'GHI789',
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
});

afterEach(async () => {
  jest.clearAllMocks();
  try {
    await prisma.companyKYC.delete({
      where: {
        id: companyKYC.id,
      },
    });
  } catch (error) {
    // Info: (20240515 - Jacky) If already deleted, ignore the error.
  }
});

describe('test company KYC API', () => {
  // Info: (20240517 - Jacky) Skip the following test cases because parse form will stuck.
  // it('should create a new company KYC', async () => {
  //   await handler(req, res);
  //   expect(res.status).toHaveBeenCalledWith(201);
  //   expect(res.json).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       powerby: expect.any(String),
  //       success: expect.any(Boolean),
  //       code: expect.stringContaining('201'),
  //       message: expect.any(String),
  //       payload: expect.objectContaining({
  //         companyId: expect.any(Number),
  //         legalName: expect.any(String),
  //         country: expect.any(String),
  //         city: expect.any(String),
  //         address: expect.any(String),
  //         zipCode: expect.any(String),
  //         representativeName: expect.any(String),
  //         registerCountry: expect.any(String),
  //         structure: expect.any(String),
  //         registrationNumber: expect.any(String),
  //         registrationDate: expect.any(String),
  //         industry: expect.any(String),
  //         contactPerson: expect.any(String),
  //         contactPhone: expect.any(String),
  //         contactEmail: expect.any(String),
  //         website: expect.any(String),
  //         representativeIdType: expect.any(String),
  //         registrationCertificateId: expect.any(String),
  //         taxCertificateId: expect.any(String),
  //         representativeIdCardId: expect.any(String),
  //         createdAt: expect.any(Number),
  //       }),
  //     })
  //   );
  // });

  it('should handle missing user ID', async () => {
    req.headers.userid = undefined;
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

  // Info: (20240517 - Jacky) Skip the following test cases because parse form will stuck.
  // it('should handle image upload failure', async () => {
  //   const formData = new FormData();
  //   formData.append('registrationCertificate', 'ABC');
  //   formData.append('taxCertificate', 'DEF');
  //   req.body = formData;
  //   await handler(req, res);
  //   expect(res.status).toHaveBeenCalledWith(500);
  //   expect(res.json).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       powerby: expect.any(String),
  //       success: expect.any(Boolean),
  //       code: expect.stringContaining('500'),
  //       message: expect.any(String),
  //       payload: expect.any(Object),
  //     })
  //   );
  // });

  it('should handle unsupported HTTP methods', async () => {
    req.method = 'GET';
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
