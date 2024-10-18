import { countMissingCertificate } from '@/lib/utils/repo/certificate.repo';

describe('countMissingCertificate', () => {
  it('should return the count of missing certificates for a given company ID', async () => {
    const companyId = 1000;
    const mockCount = 2;

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
