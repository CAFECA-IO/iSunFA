import { getProjectValue } from '@/lib/utils/repo/value.repo';
import value from '@/seed_json/value.json';

describe('listProjectValue', () => {
  it('should return a list of values for a given project ID', async () => {
    const projectId = 1000;

    const result = await getProjectValue(projectId);

    expect(result).toEqual(value[0]);
  });
  it('should return an empty array if the value list is not found', async () => {
    const projectId = -1;

    const result = await getProjectValue(projectId);

    expect(result).toEqual(null);
  });
});
