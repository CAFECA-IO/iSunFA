import { listProjectSale } from '@/lib/utils/repo/sale.repo';
import sales from '@/seed_json/sale.json';

describe('listProjectSale', () => {
  it('should return an empty array if projectId is less than or equal to 0', async () => {
    const projectId = 0;
    const result = await listProjectSale(projectId);
    expect(result).toEqual([]);
  });

  it('should return the sale list if projectId is greater than 0', async () => {
    const projectId = 1000;

    const result = await listProjectSale(projectId);

    expect(result).toEqual(sales);
  });
});
