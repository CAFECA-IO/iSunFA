import { countMissingCertificate } from '@/lib/utils/repo/certificate.repo';

// TODO: (20241126 - Shirley) FIXME: 在原有的 DB 上會得到 count = 1
xdescribe('countMissingCertificate', () => {
  it('should return the count of missing certificates for a given company ID', async () => {
    const companyId = 1000;
    const mockCount = 0;

    const result = await countMissingCertificate(companyId);

    expect(result).toBe(mockCount);
  });

  it('should return 0 if there are no missing certificates', async () => {
    const companyId = 1002;
    const mockCount = 0;

    const result = await countMissingCertificate(companyId);

    expect(result).toBe(mockCount);
  });
});
