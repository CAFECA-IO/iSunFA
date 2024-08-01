import { ROLE_NAME } from '@/constants/role_name';
import { transferOwnership } from '@/lib/utils/repo/transaction/admin_role.tx';
import { deleteAdminByIdForTesting } from '@/lib/utils/repo/admin.repo';

describe('transferOwnership', () => {
  it('should transfer ownership correctly', async () => {
    const currentOwnerId = 1001;
    const companyId = 1000;
    const newOwnerId = 1002;
    const result = await transferOwnership(currentOwnerId, companyId, newOwnerId);
    await transferOwnership(newOwnerId, companyId, currentOwnerId); // rollback the change
    await deleteAdminByIdForTesting(result[0].id);
    await deleteAdminByIdForTesting(result[1].id);
    expect(result).toHaveLength(2);

    const newOwner = result.find((admin) => admin.userId === newOwnerId);
    const formerOwner = result.find((admin) => admin.userId === currentOwnerId);

    expect(newOwner).toBeDefined();
    expect(newOwner?.role.name).toBe(ROLE_NAME.OWNER);

    expect(formerOwner).toBeDefined();
    expect(formerOwner?.deletedAt).toBeGreaterThan(0);
  }, 10000);
});
