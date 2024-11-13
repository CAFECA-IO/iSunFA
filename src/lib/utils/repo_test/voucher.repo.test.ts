import { countUnpostedVoucher, getOneVoucherV2 } from '@/lib/utils/repo/voucher.repo';

describe('countUnpostedVoucher', () => {
  it('should return the count of unposted vouchers for a given company ID', async () => {
    const companyId = 1000;
    const mockCount = 2;

    const result = await countUnpostedVoucher(companyId);

    expect(result).toBe(mockCount);
  });

  it('should return 0 if there are no unposted vouchers', async () => {
    const companyId = 1002;
    const mockCount = 0;

    const result = await countUnpostedVoucher(companyId);

    expect(result).toBe(mockCount);
  });
});

describe('getOneVoucherV2', () => {
  it('should get voucher by id', async () => {
    const voucher = await getOneVoucherV2(1002);
    expect(voucher).toBeDefined();
  });
});
