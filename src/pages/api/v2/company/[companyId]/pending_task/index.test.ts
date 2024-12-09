import * as certificateRepo from '@/lib/utils/repo/certificate.repo';
import * as voucherRepo from '@/lib/utils/repo/voucher.repo';
import * as adminRepo from '@/lib/utils/repo/admin.repo';
import { getPendingTaskByCompanyId } from '@/pages/api/v2/company/[companyId]/pending_task';

jest.mock('../../../../../../lib/utils/repo/admin.repo');
jest.mock('../../../../../../lib/utils/repo/certificate.repo');
jest.mock('../../../../../../lib/utils/repo/voucher.repo');

describe('getPendingTaskByCompanyId', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the correct pending tasks for a company', async () => {
    const userId = 1;
    const companyId = 1;
    const mockCompany = {
      id: companyId,
      name: 'Company A',
      taxId: '123',
      tag: 'tagA',
      imageFileId: 1,
      startDate: 1620000000,
      createdAt: 1620000000,
      updatedAt: 1620000000,
      deletedAt: null,
      imageFile: {
        id: 1,
        name: 'imageA',
        size: 512.25,
        mimeType: 'image/png',
        type: 'invoice',
        url: 'urlA',
        isEncrypted: true,
        iv: Buffer.from('a'),
        encryptedSymmetricKey: 'c29tZUVuY3J5cHRlZEtleQ==',
        createdAt: 1620000000,
        updatedAt: 1620000000,
        deletedAt: null,
      },
    };
    const mockMissingCertificateCount = 5;
    const mockUnpostedVoucherCount = 3;

    jest.spyOn(adminRepo, 'getCompanyByUserIdAndCompanyId').mockResolvedValue(mockCompany);
    jest
      .spyOn(certificateRepo, 'countMissingCertificate')
      .mockResolvedValue(mockMissingCertificateCount);
    jest.spyOn(voucherRepo, 'countUnpostedVoucher').mockResolvedValue(mockUnpostedVoucherCount);

    const result = await getPendingTaskByCompanyId(userId, companyId);

    expect(result).toEqual({
      companyId,
      missingCertificate: {
        companyId: mockCompany.id,
        companyName: mockCompany.name,
        count: mockMissingCertificateCount,
        companyLogoSrc: 'urlA',
      },
      missingCertificatePercentage: 0.62,
      unpostedVoucher: {
        companyId: mockCompany.id,
        companyName: mockCompany.name,
        count: mockUnpostedVoucherCount,
        companyLogoSrc: 'urlA',
      },
      unpostedVoucherPercentage: 0.38,
    });
  });

  it('should return null if the company is not found', async () => {
    const userId = 1;
    const companyId = 1;

    jest.spyOn(adminRepo, 'getCompanyByUserIdAndCompanyId').mockResolvedValue(null);

    const result = await getPendingTaskByCompanyId(userId, companyId);

    expect(result).toBeNull();
  });
});
