import * as certificateRepo from '@/lib/utils/repo/certificate.repo';
import * as voucherRepo from '@/lib/utils/repo/voucher.repo';
import * as adminRepo from '@/lib/utils/repo/admin.repo';
import { getTotalPendingTaskForUser } from '@/pages/api/v2/user/[userId]/pending_task';

jest.mock('../../../../../../lib/utils/repo/admin.repo');
jest.mock('../../../../../../lib/utils/repo/voucher.repo');
jest.mock('../../../../../../lib/utils/repo/certificate.repo');

describe('getTotalPendingTaskForUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the correct total pending tasks for a user', async () => {
    const userId = 1;
    const mockListedCompany = [
      {
        company: {
          id: 1,
          name: 'Company A',
          taxId: '123',
          tag: 'tagA',
          imageFileId: 1,
          startDate: 1620000000,
          createdAt: 1620000000,
          updatedAt: 1620000000,
          deletedAt: null,
        },
      },
      {
        company: {
          id: 2,
          name: 'Company B',
          taxId: '456',
          tag: 'tagB',
          imageFileId: 2,
          startDate: 1620000000,
          createdAt: 1620000000,
          updatedAt: 1620000000,
          deletedAt: null,
        },
      },
    ];

    const mockMissingCertificateCount = 5;
    const mockUnpostedVoucherCount = 3;

    jest.spyOn(adminRepo, 'listCompanyByUserId').mockResolvedValue(mockListedCompany);
    jest
      .spyOn(certificateRepo, 'countMissingCertificate')
      .mockResolvedValue(mockMissingCertificateCount);
    jest.spyOn(voucherRepo, 'countUnpostedVoucher').mockResolvedValue(mockUnpostedVoucherCount);

    const result = await getTotalPendingTaskForUser(userId);

    expect(result).toEqual({
      userId,
      totalMissingCertificate: 10,
      totalMissingCertificatePercentage: 0.62,
      missingCertificateList: [
        { companyId: 1, companyName: 'Company A', count: 5 },
        { companyId: 2, companyName: 'Company B', count: 5 },
      ],
      totalUnpostedVoucher: 6,
      totalUnpostedVoucherPercentage: 0.38,
      unpostedVoucherList: [
        { companyId: 1, companyName: 'Company A', count: 3 },
        { companyId: 2, companyName: 'Company B', count: 3 },
      ],
    });
  });
});
